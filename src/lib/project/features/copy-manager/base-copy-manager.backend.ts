//#region imports
import { crossPlatformPath, _ } from 'tnp-core/src';
import { fse } from 'tnp-core/src';
import { path } from 'tnp-core/src';
import { config } from 'tnp-config/src';
import { Project } from '../../abstract/project';
import { BaseCompilerForProject } from 'tnp-helpers/src';
import { Models } from '../../../models';
import { CopyMangerHelpers } from './copy-manager-helpers.backend';
import { IncCompiler } from 'incremental-compiler/src';
import { Log } from 'ng2-logger/src';
import { SourceMappingUrl } from './source-maping-url.backend';
import { BuildOptions } from '../../../options';
import { Helpers } from 'tnp-helpers/src';
import { TO_REMOVE_TAG } from '../../../constants';

const REPLACE_INDEX_D_TS_IN_DEST_WHEN_WATCH = false;

const log = Log.create(_.startCase(path.basename(__filename)));
//#endregion

export abstract class BaseCopyManger extends BaseCompilerForProject<
  {},
  Project
> {
  //#region fields
  public _isomorphicPackages = [] as string[];
  protected buildOptions: BuildOptions;
  protected copyto: Project[] = [];
  protected cliBuildNoDts: boolean;
  protected renameDestinationFolder?: string;

  //#region getters & methods / select all project to copy to
  protected async selectAllProjectCopyto() {
    //#region  @backendFunc
    const containerCoreProj = Project.by(
      'container',
      this.project.__frameworkVersion,
    ) as Project;

    const independentProjects = [containerCoreProj];

    if (config.frameworkName === 'tnp' && this.project.name !== 'tnp') {
      // tnp in tnp is not being used at all
      independentProjects.push(Project.ins.Tnp);
    }

    this.copyto = [...independentProjects];
    // console.log(this.copyto.map(c => 'COPYTO ' + c.__node_modules.path))
    //#endregion
  }
  //#endregion

  get customCompilerName(): string {
    return `Copyto manager compilation`;
  }

  protected readonly notAllowedFiles: string[] = [
    '.DS_Store',
    // config.file.index_d_ts,
  ];

  protected readonly sourceFolders = [
    config.folder.src,
    config.folder.source,
    config.folder.node_modules,
    config.folder.tempSrcDist,
    config.file.package_json,
    ...CopyMangerHelpers.browserwebsqlFolders.map(currentBrowserFolder => {
      return crossPlatformPath(
        path.join(currentBrowserFolder, config.folder.src),
      );
    }),
    // probably is not needed -> I ma not using dist for node_modules
    crossPlatformPath(
      path.join(config.folder.client, config.file.package_json),
    ),
  ];

  //#endregion

  //#region getters

  //#region getters / source path to link

  get sourcePathToLink() {
    const sourceToLink = crossPlatformPath(
      path.join(this.project.location, config.folder.src),
    );
    return sourceToLink;
  }
  //#endregion

  //#region getters / temp project name
  get tempProjName() {
    const tempProjName = this.project.__getTempProjName(
      this.buildOptions.outDir,
    );
    return tempProjName;
  }
  //#endregion

  //#region getters / local temp proj path
  get localTempProj() {
    let localProj = Project.ins.From(this.localTempProjPath) as Project;
    return localProj;
  }
  //#endregion

  //#region getters / project to copy to
  get projectToCopyTo() {
    const canCopyToNodeModules = this.buildOptions.outDir === 'dist';
    let result = [];

    const node_modules_projs = [
      ...(canCopyToNodeModules
        ? [
            ...(config.activeFramewrokVersions.length > 1
              ? [
                  ...config.activeFramewrokVersions.map(v =>
                    Project.by('container', v),
                  ),
                ]
              : [this.project.coreContainer]),
          ]
        : []),
    ];

    if (Array.isArray(this.copyto) && this.copyto.length > 0) {
      result = [
        this.localTempProj,
        ...this.copyto,
        ...node_modules_projs,
      ] as Project[];
    } else {
      result = [this.localTempProj, ...node_modules_projs];
    } // @ts-ignore
    return Helpers.uniqArray<Project>(result, 'location');
  }
  //#endregion

  get projectWithBuild() {
    return this.project.__isStandaloneProject
      ? this.project
      : this.project.__smartContainerBuildTarget;
  }

  //#region getters / isomorphic pacakges
  get isomorphicPackages() {
    const isomorphicPackages = [
      ...this._isomorphicPackages,
      this.rootPackageName,
    ];
    return isomorphicPackages;
  }
  //#endregion
  //#endregion

  //#region generate source copy in
  public generateSourceCopyIn(
    destinationLocation: string,
    options?: Models.GenerateProjectCopyOpt,
  ): boolean {
    destinationLocation = crossPlatformPath(destinationLocation);
    //#region fix options
    if (_.isUndefined(options)) {
      options = {} as any;
    }
    if (_.isUndefined(options.filterForReleaseDist)) {
      options.filterForReleaseDist = true;
    }
    if (_.isUndefined(options.forceCopyPackageJSON)) {
      options.forceCopyPackageJSON = false;
    }
    if (_.isUndefined(options.ommitSourceCode)) {
      options.ommitSourceCode = false;
    }
    if (_.isUndefined(options.override)) {
      options.override = true;
    }
    if (_.isUndefined(options.showInfo)) {
      options.showInfo = true;
    }
    if (_.isUndefined(options.regenerateProjectChilds)) {
      options.regenerateProjectChilds = false;
    }
    if (_.isUndefined(options.useTempLocation)) {
      options.useTempLocation = true;
    }

    if (_.isUndefined(options.regenerateOnlyCoreProjects)) {
      options.regenerateOnlyCoreProjects = true;
    }
    //#endregion

    const { override, showInfo } = options;

    const sourceLocation = this.project.location;
    //#region modify package.json for generated
    var packageJson: Models.IPackageJSON = fse.readJsonSync(
      path.join(sourceLocation, config.file.package_json),
      {
        encoding: 'utf8',
      },
    );
    //#endregion

    //#region execute copy
    if (fse.existsSync(destinationLocation)) {
      if (override) {
        Helpers.tryRemoveDir(destinationLocation);
        Helpers.mkdirp(destinationLocation);
      } else {
        if (showInfo) {
          Helpers.warn(
            `Destination for project "${this.project.name}" already exists, only: source copy`,
          );
        }
      }
    }

    CopyMangerHelpers.executeCopy(
      sourceLocation,
      destinationLocation,
      options,
      this.project,
    );
    //#endregion

    //#region handle additional package.json markings
    if (
      this.project.__isContainer ||
      this.project.__isVscodeExtension ||
      options.forceCopyPackageJSON
    ) {
      const packageJsonLocation = crossPlatformPath(
        path.join(destinationLocation, config.file.package_json),
      );
      // console.log(`packageJsonLocation: ${ packageJsonLocation } `)
      // console.log('packageJson', packageJson)
      fse.writeJsonSync(packageJsonLocation, packageJson, {
        spaces: 2,
        encoding: 'utf8',
      });
      // console.log(`packageJsonLocation saved: ${ packageJsonLocation } `)
    }
    //#endregion

    if (showInfo) {
      //#region show info about generation
      let dir = path.basename(path.dirname(destinationLocation));
      if (fse.existsSync(path.dirname(path.dirname(destinationLocation)))) {
        dir = `${path.basename(
          path.dirname(path.dirname(destinationLocation)),
        )}/${dir}`;
      }
      Helpers.log(
        `Source of project "${this.project.genericName}" generated in ${dir} /(< here >) `,
      );
      //#endregion
    }

    //#region recrusive execution for childrens
    if (options.regenerateProjectChilds && this.project.__isContainer) {
      let childs = this.project.children.filter(
        f => !['lib', 'app'].includes(path.basename(f.location)),
      );

      if (options.regenerateOnlyCoreProjects) {
        if (this.project.__isCoreProject || this.project.__isSmartContainer) {
          if (this.project.__isSmartContainer) {
            childs = this.project.children.filter(
              c =>
                c.typeIs('isomorphic-lib') && c.__frameworkVersionAtLeast('v3'),
            );
          } else if (this.project.__isContainer) {
            childs = this.project.children.filter(c => c.name === 'workspace');
          }
        } else {
          childs = [];
        }
      }

      childs.forEach(c => {
        // console.log('GENERATING CHILD ' + c.genericName)
        c.__copyManager.generateSourceCopyIn(
          crossPlatformPath(path.join(destinationLocation, c.name)),
          options,
        );
      });
      if (this.project.__isSmartContainer) {
        childs.forEach(c => {
          let generatedVer = Project.ins.From(
            crossPlatformPath(path.join(destinationLocation, c.name)),
          ) as Project;
          generatedVer.__packageJson.data.tnp.type = 'isomorphic-lib';
          generatedVer.__packageJson.data.tnp.version =
            this.project.__frameworkVersion;
          generatedVer.__packageJson.save('saving proper child version');
          Project.ins.unload(generatedVer);
          generatedVer = Project.ins.From(
            crossPlatformPath(path.join(destinationLocation, c.name)),
          );
        });
      }
    }
    //#endregion

    return true;
  }
  //#endregion

  updateTriggered = _.debounce(() => {
    Helpers.log(`[copy-manager] update triggered`);
  }, 1000);

  /**
   * @returns if trus - skip futher processing
   */
  protected contentReplaced(fileAbsolutePath: string): boolean {
    // console.log('processing', fileAbsolutePath);
    if (
      !(
        fileAbsolutePath.endsWith('.js') ||
        fileAbsolutePath.endsWith('.js.map') ||
        fileAbsolutePath.endsWith('.mjs') ||
        fileAbsolutePath.endsWith('.mjs.map')
      )
    ) {
      return false;
    }
    let contentOrg = Helpers.readFile(fileAbsolutePath) || '';
    const newContent = contentOrg.replace(
      new RegExp(Helpers.escapeStringForRegEx(TO_REMOVE_TAG), 'g'),
      '',
    );
    if (newContent && contentOrg && newContent !== contentOrg) {
      Helpers.writeFile(fileAbsolutePath, newContent);
      // console.log(`[copy-manager] content replaced in ${fileAbsolutePath}`);
      return true;
    }
    return false;
  }

  //#region async action
  async asyncAction(event: IncCompiler.Change) {
    const absoluteFilePath = crossPlatformPath(event.fileAbsolutePath);
    if (this.contentReplaced(absoluteFilePath)) {
      return;
    }

    // console.log('async event '+ absoluteFilePath)
    SourceMappingUrl.fixContent(absoluteFilePath, this.projectWithBuild);

    const outDir = this.buildOptions.outDir;
    let specyficFileRelativePath: string;
    let absoluteAssetFilePath: string;
    if (absoluteFilePath.startsWith(this.monitoredOutDir)) {
      specyficFileRelativePath = absoluteFilePath.replace(
        this.monitoredOutDir + '/',
        '',
      );
    } else {
      absoluteAssetFilePath = absoluteFilePath;
    }

    const projectToCopyTo = this.projectToCopyTo;

    Helpers.log(`ASYNC ACTION
    absoluteFilePath: ${absoluteFilePath}
    specyficFileRelativePath: ${specyficFileRelativePath}
    `);

    //     Helpers.log(`
    //     copyto project:
    // ${projectToCopyTo.map(p => p.location).join('\n')}

    //     `)

    for (let index = 0; index < projectToCopyTo.length; index++) {
      const projectToCopy = projectToCopyTo[index];
      this._copyBuildedDistributionTo(projectToCopy, {
        absoluteAssetFilePath,
        specyficFileRelativePath: event && specyficFileRelativePath,
        outDir: outDir as any,
        event,
      });
    }
    this.updateTriggered();
  }
  //#endregion

  //#region sync action
  async syncAction(files: string[]) {
    for (const fileAbsPath of files) {
      this.contentReplaced(fileAbsPath);
    }

    // files: string[]
    const outDir = this.buildOptions.outDir;

    const projectToCopyTo = this.projectToCopyTo;
    // (${proj.location}/${config.folder.node_modules}/${this.rootPackageName})

    if (projectToCopyTo.length > 0) {
      const porjectINfo =
        projectToCopyTo.length === 1
          ? `project "${(_.first(projectToCopyTo as any) as Project).name}"`
          : `all ${projectToCopyTo.length} projects`;

      log.info(
        `From now... ${porjectINfo} will be updated after every change...`,
      );

      Helpers.info(`[buildable-project] copying compiled code/assets to ${
        projectToCopyTo.length
      } other projects...
${projectToCopyTo.map(proj => `- ${proj.genericName}`).join('\n')}
      `);
    }

    for (let index = 0; index < projectToCopyTo.length; index++) {
      const projectToCopy = projectToCopyTo[index];
      log.data(`copying to ${projectToCopy?.name}`);
      this._copyBuildedDistributionTo(projectToCopy, {
        outDir: outDir as any,
      });
      // if (this.buildOptions.buildForRelease && !global.tnpNonInteractive) {
      //   Helpers.info('Things copied to :' + projectToCopy?.name);
      //   if (!(await Helpers.consoleGui.question.yesNo('Is there everywthing ok with build ?'))) {
      //     process.exit(0)
      //   }
      // }
      log.data('copy done...');
    }
    this.updateTriggered();
  }
  //#endregion

  //#region copy builded distribution to
  public copyBuildedDistributionTo(destination: Project) {
    return this._copyBuildedDistributionTo(destination);
  }
  /**
   * There are 3 typese of --copyto build
   * 1. dist build (wihout source maps buit without links)
   * 2. dist build (with source maps and links) - when no buildOptions
   * 3. same as 2 buit with watch
   */
  protected _copyBuildedDistributionTo(
    destination: Project,
    options?: {
      absoluteAssetFilePath?: string;
      specyficFileRelativePath?: string;
      outDir?: 'dist';
      event?: any;
    },
  ) {
    //#region init & prepare parameters
    const {
      specyficFileRelativePath = void 0,
      absoluteAssetFilePath = void 0,
      outDir,
      event,
    } = options || {};

    // if (!specyficFileRelativePath) {
    //   debugger
    //   Helpers.warn(`Invalid project: ${destination?.name}`)
    //   return;
    // }
    if (!destination || !destination?.location) {
      Helpers.warn(`Invalid project: ${destination?.name}`);
      return;
    }

    const isTempLocalProj = destination.location === this.localTempProjPath;

    if (!specyficFileRelativePath) {
      this.initalFixForDestination(destination);
    }

    const allFolderLinksExists = !this.buildOptions.watch
      ? true
      : this.linksForPackageAreOk(destination);

    // if(specyficFileRelativePath) {
    //   Helpers.log(`[${destination?.name}] Specyfic file change (allFolderLinksExists=${allFolderLinksExists}) (event:${event})`
    //   + ` ${outDir}${specyficFileRelativePath}`);
    // }
    //#endregion

    if (
      (specyficFileRelativePath || absoluteAssetFilePath) &&
      allFolderLinksExists
    ) {
      // Helpers.log(`handle ${specyficFileRelativePath || absoluteAssetFilePath}`);
      if (absoluteAssetFilePath) {
        this.handleCopyOfAssetFile(absoluteAssetFilePath, destination);
      } else {
        //#region handle single file

        this.handleCopyOfSingleFile(
          destination,
          isTempLocalProj,
          specyficFileRelativePath,
        );
        if (
          REPLACE_INDEX_D_TS_IN_DEST_WHEN_WATCH &&
          this.buildOptions.watch &&
          specyficFileRelativePath.endsWith('/index.d.ts')
        ) {
          // TODO could be limited more
          this.replaceIndexDtsForEntryPorjIndex(destination);
        }
        //#endregion
      }
    } else {
      //#region handle all files
      // Helpers.log('copying all files');
      this.copyCompiledSourcesAndDeclarations(destination, isTempLocalProj);

      log.d('copying surce maps');
      this.copySourceMaps(destination, isTempLocalProj);
      this.copySharedAssets(destination, isTempLocalProj);

      this.removeSourceSymlinks(destination);
      this.addSourceSymlinks(destination);

      if (!this.cliBuildNoDts) {
        this.updateBackendFullDtsFiles(destination);
        this.updateBackendFullDtsFiles(this.monitoredOutDir);
      }

      if (REPLACE_INDEX_D_TS_IN_DEST_WHEN_WATCH && this.buildOptions.watch) {
        this.replaceIndexDtsForEntryPorjIndex(destination);
      }

      // TODO not working werid tsc issue with browser/index
      // {const projectOudBorwserSrc = path.join(destination.location,
      //   config.folder.node_modules,
      //   rootPackageName,
      //   config.file.package_json
      // );
      // const projectOudBorwserDest = path.join(destination.location,
      //   config.folder.node_modules,
      //   rootPackageName,
      //   config.folder.browser,
      //   config.file.package_json
      // );
      // Helpers.copyFile(projectOudBorwserSrc, projectOudBorwserDest);}
      //#endregion
    }
  }
  //#endregion

  //#region abstract
  /**
   * first folder in node_modules for packge
   * example:
   * project/node_modules/<rootPackageName> # like 'ng2-rest' or '@angular'
   */
  abstract get rootPackageName(): string;
  /**
   * Path for local-temp-project-path
   */
  abstract get localTempProjPath(): string;
  /**
   * connected with specyficRelativeFilePath
   * gives file in compilation folder... meaning:
   *
   * monitoredOutDir/specyficRelativeFilePath
   * equals:
   * projectLocation/(dist)/specyficRelativeFilePath
   */
  abstract get monitoredOutDir(): string;

  abstract changedJsMapFilesInternalPathesForDebug(
    content: string,
    isBrowser: boolean,
    isForCliDebuggerToWork: boolean,
    filePath: string,
  ): string;

  abstract initalFixForDestination(destination: Project): void;
  abstract copySourceMaps(destination: Project, isTempLocalProj: boolean);
  abstract addSourceSymlinks(destination: Project);
  abstract removeSourceSymlinks(destination: Project);
  abstract handleCopyOfSingleFile(
    destination: Project,
    isTempLocalProj: boolean,
    specyficFileRelativePath: string,
  );
  abstract handleCopyOfAssetFile(
    absoluteAssetFilePath: string,
    destination: Project,
  );
  abstract replaceIndexDtsForEntryPorjIndex(destination: Project);
  /**
   * fix d.ts files in angular build - problem with require() in d.ts with wrong name
   */
  abstract copyCompiledSourcesAndDeclarations(
    destination: Project,
    isTempLocalProj: boolean,
  );
  abstract copySharedAssets(destination: Project, isTempLocalProj: boolean);
  abstract linksForPackageAreOk(destination: Project): boolean;
  abstract updateBackendFullDtsFiles(destinationOrDist: Project | string): void;

  //#endregion
}
