import { _ } from 'tnp-core';
import chalk from 'chalk';
import { path } from 'tnp-core'
import { fse } from 'tnp-core'

import { JSON10 } from 'json10';
import { config, ConfigModels } from 'tnp-config';
import { Models } from 'tnp-models';
import { Helpers } from 'tnp-helpers';
import { Project } from '../../project';

//#region site option
export type NewSiteOptions = {
  type?: ConfigModels.NewFactoryType,
  name?: string,
  cwd?: string,
  basedOn?: string,
  version?: ConfigModels.FrameworkVersion,
  skipInit?: boolean;
  alsoBasedOn?: string[];
  siteProjectMode?: 'strict' | 'dependency';
};
//#endregion

export class ProjectFactory {
  //#region singleton
  private static _instance: ProjectFactory;
  public static get Instance() {
    if (!this._instance) {
      this._instance = new ProjectFactory();
    }
    return this._instance;
  }
  //#endregion

  //#region destination path
  private getDestinationPath(projectName: string, cwd: string) {
    if (path.isAbsolute(projectName)) {
      return projectName;
    }
    return path.join(cwd, projectName);
  }
  //#endregion

  //#region error messages
  private errorMsgCreateProject() {
    Helpers.log(chalk.green(`Good examples:`));
    config.projectTypes.forNpmLibs.forEach(t => {
      Helpers.log(`\t${chalk.gray('tnp new')} ${chalk.black(t)} ${chalk.gray('mySuperLib')}`);
    });
    Helpers.error(chalk.red(`Please use example above.`), false, true);
  }

  private errorMsgCreateSite() {
    console.log(chalk.green(`Good examples: ` +
      `${config.frameworkName} new site:strict:site  path-to-baseline-project` +
      `${config.frameworkName} new site:dependenct:site  path-to-baseline-project`
    ));
    Helpers.error(`Please use example above.`, false, true);
  }
  //#endregion

  //#region fix after crateion
  private pacakgeJsonFixAfterCreation(locationDest, basedOn?: string, name?: string, isDependencySite = false) {
    const pkgJSONpath = path.join(locationDest, config.file.package_json);
    const json: Models.npm.IPackageJSON = fse.readJSONSync(pkgJSONpath)
    json.name = ((name === path.basename(locationDest)) ? name : _.kebabCase(path.basename(locationDest)));
    if (!json.tnp) {
      // @ts-ignore
      json.tnp = {};
    }
    json.version = '0.0.0';
    json.private = true;
    json.tnp.type = 'isomorphic-lib';
    json.tnp.version = config.defaultFrameworkVersion;
    json.tnp.isCoreProject = false;
    json.tnp.isGenerated = false;
    json.tnp.useFramework = false;
    json.tnp.required = [];
    json.tnp.requiredServers = [];
    if (!isDependencySite && basedOn) {
      json.tnp.basedOn = basedOn;
    }

    Helpers.writeFile(pkgJSONpath, json);
  }
  //#endregion

  //#region fix options
  private fixOptions_create(options: NewSiteOptions) {
    if (_.isNil(options)) {
      options = {} as any;
    }

    if (_.isNil(options.version)) {
      options.version = config.defaultFrameworkVersion;
    }

    if (_.isNil(options.skipInit)) {
      options.skipInit = true;
    }

    if (!_.isArray(options.alsoBasedOn)) {
      options.alsoBasedOn = []
    }

    return options;
  }
  //#endregion

  //#region create models
  public createModelFromArgs(args: string, exit = true, cwd: string) {
    const argv = args.split(' ');
    const name = argv[1]
    const relativePath = argv[2]
    Project.From<Project>(cwd).filesFactory.createModel(relativePath, name);
    if (exit) {
      process.exit(0)
    }
  }
  //#endregion

  //#region workspace
  public async workspaceFromArgs(args: string, exit = true, cwd: string) {
    const argv = args.split(' ');

    if (!_.isArray(argv) || argv.length < 1) {
      Helpers.error(`Top few argument for ${chalk.black('init')} parameter.`, true);
      this.errorMsgCreateProject()
    }
    const { basedOn, version, skipInit }: {
      basedOn: string;
      version: ConfigModels.FrameworkVersion;
      skipInit?: boolean
    } = require('minimist')(args.split(' '));


    if (basedOn) {
      Helpers.error(`To create workspace site use command: `
        + `${config.frameworkName} new: site name - of - workspace - site`
        + `--basedOn relativePathToBaselineWorkspace`, false, true);
    }
    const type = 'isomorphic-lib' as any;
    const name = argv[0];

    const proj = await this.create({
      type,
      name,
      cwd,
      basedOn: void 0,
      version: config.defaultFrameworkVersion, // (_.isString(version) && version.length <= 3 && version.startsWith('v')) ? version : void 0,
      skipInit
    });

    Helpers.writeFile([proj.location, 'README.md'], `
  #  ${_.startCase(proj.name)}

    `)

    if (exit) {
      process.exit(0)
    }

  }
  //#endregion

  //#region create workspace site
  public async workspaceSiteFromArgs(args: string, exit = true, cwd: string, strictSiteMode = true) {
    const argv = args.split(' ');

    if (args.length < 2) {
      this.errorMsgCreateSite()
    }
    const alsoBasedOn = ((argv.length > 2 && !strictSiteMode) ? (argv.slice(2)) : []);

    await this.create({
      type: 'workspace',
      name: argv[0] as any,
      cwd,
      basedOn: argv[1] as any,
      siteProjectMode: strictSiteMode ? 'strict' : 'dependency',
      alsoBasedOn
    });
    if (exit) {
      process.exit(0)
    }
  }
  //#endregion


  public async create(options: NewSiteOptions): Promise<Project> {

    let { type, name, cwd, basedOn, version, skipInit, siteProjectMode, alsoBasedOn } = this.fixOptions_create(options);
    version = config.defaultFrameworkVersion;
    // let cwdProj = Project.From<Project>(cwd);
    // if (cwdProj && cwdProj.isWorkspace) {
    //   version = cwdProj._frameworkVersion;
    // } else {
    //   version = config.defaultFrameworkVersion;
    // }
    // if (cwdProj && cwdProj.isContainer) {
    //   version = cwdProj._frameworkVersion;
    // }

    const containers = name.replace('\\', '/').split('/');

    if (containers.length > 1) {
      var firstContainer: Project;

      name = _.last(containers);
      const foldersToRecreate = _.cloneDeep(containers).slice(0, containers.length - 1);
      let tmpCwd = cwd;
      do {
        const folder = foldersToRecreate.shift();
        const containerPath = path.join(tmpCwd, folder);
        if (!Helpers.exists(containerPath)) {
          Helpers.mkdirp(containerPath);
        }
        const packageJsonPath = path.join(containerPath, config.file.package_json);
        if (!Helpers.exists(packageJsonPath)) {
          Helpers.writeJson(packageJsonPath, {
            name: path.basename(containerPath),
            version: '0.0.0',
            private: true,
            tnp: {
              version: config.defaultFrameworkVersion,
              type: 'container',
            }
          } as Models.npm.IPackageJSON);
        }
        tmpCwd = containerPath;
        cwd = containerPath;
        const containerProj = (Project.From(containerPath) as Project);
        if (containerProj) {
          await containerProj.filesStructure.init('')
          containerProj.run('git init').sync();
          if (!firstContainer) {
            firstContainer = containerProj;
          }
        }
      } while (foldersToRecreate.length > 0);
    }

    if (firstContainer && firstContainer.parent?.isContainer) {
      await firstContainer.parent.filesStructure.init('')
    }


    Helpers.log(`[create] version: ${version}`);
    Helpers.log(`[create] skip init ${skipInit}`);


    const nameKebakCase = _.kebabCase(name);
    if (nameKebakCase !== name) {
      Helpers.info(`[craete] Project name renemed to: ${nameKebakCase} `);
      name = nameKebakCase;
    }
    if (_.isString(basedOn)) {
      basedOn = basedOn.replace(/\/$/, '');
    }
    const basedOnProject = basedOn && Project.nearestTo<Project>(path.join(cwd, basedOn));
    if (basedOn && !basedOnProject) {
      Helpers.error(`[create] Not able to find baseline project from relative path: ${basedOn} `, false, true);
    }
    if (basedOn && basedOnProject && basedOnProject.typeIsNot('workspace')) {
      Helpers.error(`[create] Site project only can be workspace, wrong--basedOn param: ${basedOn} `, false, true);
    }

    let baseline = basedOn ? basedOnProject : Project.by<Project>(type, version);
    Helpers.log(`[create] PROJECT BASELINE ${baseline.name} in ${baseline.location}`);

    // console.log({ type, name, cwd, basedOn, version, skipInit, siteProjectMode });


    // await baseline.reset();
    Helpers.log('[create] Baseline reset done')
    await baseline.filesStructure.init(` --recrusive `);
    Helpers.log('[create] Baseline init done')
    // await baseline.run(`${config.frameworkName} reset && ${config.frameworkName} init --recrusive`, {
    //   prefix: chalk.bold(`[ INITING BASELINE ${baseline.genericName} ]`)
    // }).asyncAsPromise();

    // TODO this requred source modifer changes
    // if (siteProjectMode === 'dependency') {
    //   const otherBaselines = alsoBasedOn.map(c => {
    //     const dep = Project.From<Project>(path.join(cwd, c.replace(/\/$/, '')));
    //     if (!dep) {
    //       Helpers.error(`Unknow dependency for site: "${c}"`, false, true);
    //     }
    //     return dep;
    //   });
    //   (otherBaselines.length > 0) && Helpers.log(`Initing subbaselines...`);
    //   for (let index = 0; index < otherBaselines.length; index++) {
    //     const subBaseline = otherBaselines[index];
    //     await subBaseline.run(`${config.frameworkName} init --recrusive`, {
    //       prefix: chalk.bold(`[ INITING SUB BASELINE ${subBaseline.genericName} ]`)
    //     }).asyncAsPromise();
    //   }
    //   alsoBasedOn = otherBaselines.map(c => c.name);
    // }

    const destinationPath = this.getDestinationPath(name, cwd);
    Helpers.log(`[create] Destination path: ${destinationPath}`);

    if (fse.pathExistsSync(destinationPath)) {
      Helpers.info(`[create] Project "${name}" already exist in this locationzation: ${destinationPath} `);
    } else {
      if (baseline) {
        try {
          baseline.copyManager.generateSourceCopyIn(destinationPath, {
            // ommitSourceCode: global.testMode,
            regenerateOnlyCoreProjects: !basedOn,
            markAsGenerated: false,
            regenerateProjectChilds: true,
            forceCopyPackageJSON: type === 'single-file-project'
          });
          // console.log(destinationPath)
          this.pacakgeJsonFixAfterCreation(destinationPath, basedOn ? basedOn : void 0, name, siteProjectMode === 'dependency');
          Helpers.info(`[create] project ${name} created from baseline projec ${baseline.name} success`);
          if (Project.emptyLocations.includes(destinationPath)) {
            Project.emptyLocations = Project.emptyLocations.filter(f => {
              return f !== destinationPath;
            });
            Helpers.info(`[create] Path removed from empty locations`);
          } else {
            Helpers.info(`[create] Path NOT removed from empty locations`);
          }
        } catch (err) {
          // console.log(require('callsite-record')({
          //   forError: err
          // }).renderSync({
          //   // stackFilter(frame) {
          //   //   return !frame.getFileName().includes('node_modules');
          //   // }
          // }))
          Helpers.error(err, true, true);
          Helpers.error(`[create] Not able to create project`, false, true);
        }
      } else {
        this.errorMsgCreateProject();
      }
    }
    if (type === 'workspace') {

      const workspacePrroject = Project.From<Project>(destinationPath);
      if (basedOn && (siteProjectMode === 'strict')) {
        workspacePrroject.baseline.children.forEach(c => {
          Helpers.log(`[craete] Basleine Child project "${c.genericName}"`);
        });
      }
      workspacePrroject.children.forEach(c => {
        Helpers.log(`[create] Child project "${c.genericName}"`);
      });
    }

    Helpers.log(`[create] destinationPath: ${destinationPath}`);
    const newCreatedProject = Project.From<Project>(destinationPath);
    if (!newCreatedProject) {
      Helpers.error(`Not able to crate project in ${destinationPath}`, false, true);
    }
    if (type !== 'single-file-project' && newCreatedProject.typeIs('angular-lib', 'isomorphic-lib')) {
      newCreatedProject.replaceSourceForStandalone();
    }
    if (newCreatedProject.isWorkspace) {
      newCreatedProject.children.forEach(c => c.removeStandaloneSources())
    }
    if (newCreatedProject.isContainer) {
      newCreatedProject.children.forEach(c => {
        if (c.isWorkspace) {
          c.children.forEach(wc => wc.removeStandaloneSources());
        } else {
          c.removeStandaloneSources();
        }
      })
    }
    // const igGitRepo = newCreatedProject.git.isGitRepo;
    // Helpers.info(`newCreatedProject IS GIT REPO: ${igGitRepo}`)
    // if (!igGitRepo && !newCreatedProject.parent?.isMonorepo) {
    //   Helpers.info(`[create] Git repository inited`);
    //   newCreatedProject.run(`git init`).sync();
    // }
    Helpers.log(`[create] Project from create method: ${newCreatedProject && newCreatedProject.genericName} `)
    if (newCreatedProject) {
      newCreatedProject.recreate.vscode.settings.excludedFiles();
      newCreatedProject.recreate.vscode.settings.colorsFromWorkspace();

      if (siteProjectMode === 'dependency') {
        newCreatedProject.packageJson.data.tnp.dependsOn = [
          baseline.name,
          // ...alsoBasedOn
        ];
        newCreatedProject.packageJson.save(`Update required for site dependency project`)
      }

      if (newCreatedProject.isVscodeExtension) {
        Helpers.setValueToJSON(newCreatedProject.path('.vscode/settings.json').absolute.normal,
          `['workbench.colorCustomizations']['statusBar.background']`, void 0);
        Helpers.setValueToJSON(newCreatedProject.path('.vscode/settings.json').absolute.normal,
          `['workbench.colorCustomizations']['statusBar.debuggingBackground']`, void 0);
        await newCreatedProject.filesStructure.init('');
      } else {
        // if (!skipInit) {
        const skipNodeModules = !newCreatedProject.frameworkVersionAtLeast('v3');
        const argsForInit = `--recrusive ${(skipNodeModules ? '--skipNodeModules' : '')}`;
        await newCreatedProject.filesStructure.init(argsForInit);
        // }
      }
      if (
        (newCreatedProject.parent?.isContainer || newCreatedProject.parent?.isWorkspace)
        && newCreatedProject.typeIs('angular-lib', 'isomorphic-lib', 'vscode-ext')
      ) {

        newCreatedProject.parent.packageJson.linkedProjects.push(path.basename(newCreatedProject.location));
        newCreatedProject.parent.packageJson.data.tnp.linkedProjects = Helpers
          .arrays
          .uniqArray(newCreatedProject.parent.packageJson.linkedProjects);

        newCreatedProject.parent.packageJson.save(`updating "${newCreatedProject.parent._type}" or work linked projects`);

        if (newCreatedProject.parent.git.isGitRepo && newCreatedProject.parent.git.isGitRoot) {
          if (!newCreatedProject.parent.isMonorepo) {
            const parentOrigin = newCreatedProject.parent.git.originURL;
            const projOrigin = newCreatedProject.isWorkspace ?
              parentOrigin.replace(path.basename(parentOrigin), newCreatedProject.name + '.git')
              : parentOrigin.replace(path.basename(parentOrigin), (newCreatedProject.parent.name + '--' + newCreatedProject.name + '.git'));
            Helpers.info(`Adding git origin: ${projOrigin}
            to project ${newCreatedProject.name} ...`);
            newCreatedProject.run(`git init `
              + `&& git remote add origin ${projOrigin} ` +
              `&& git branch -M master `).sync();
          }
        }
        if (!newCreatedProject?.isSmartContainerChild) {
          await newCreatedProject.parent.filesStructure.struct('');
        }
        if (newCreatedProject.parent.isSmartContainer) {
          await newCreatedProject.parent.filesStructure.init(newCreatedProject.name)
        } else {
          await newCreatedProject.parent.filesStructure.struct('')
        }

      }
    }
    if (firstContainer) {
      await firstContainer.filesStructure.init('');
    }

    return newCreatedProject;
  }

}
