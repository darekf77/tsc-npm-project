//#region imports
import { config } from 'tnp-config/src';
import { chalk, crossPlatformPath, path } from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';
import { AppBuildConfig } from '../../features/docs-app-build-config.backend';
import { Models } from '../../../models';
import { LibPorjectBase } from './lib-project-base.backend';

import { Project } from '../../abstract/project';
import { BuildOptions } from '../../../options';
import { clientCodeVersionFolder } from '../../../constants';
//#endregion

export class LibProjectSmartContainer extends LibPorjectBase {
  //#region prepare package
  preparePackage(smartContainer: Project, newVersion: string) {
    const rootPackageName = `@${smartContainer.name}`;
    const base = path.join(
      this.project.location,
      this.project.__getTempProjName('dist'),
      config.folder.node_modules,
      rootPackageName,
    );
    Helpers.foldersFrom(base).forEach(absFolder => {
      this.project.__removeJsMapsFrom(absFolder);

      let proj = Project.ins.From(absFolder) as Project;
      proj.__packageJson.data.tnp.type = 'isomorphic-lib';
      proj.__packageJson.data.tnp.version = smartContainer.__frameworkVersion;
      proj.__packageJson.save('updating version for publish');
      Project.ins.unload(proj);
      proj = Project.ins.From(absFolder) as Project;
      const child = smartContainer.children.find(
        c => c.name === path.basename(absFolder),
      ) as Project;
      const packgeJsonPath = proj.__packageJson.pathPackageJson;
      const pj = Helpers.readJson(packgeJsonPath) as Models.IPackageJSON;
      pj.version = newVersion;
      pj.name = `${rootPackageName}/${proj.name}`.replace(
        `${rootPackageName}/${rootPackageName}`,
        rootPackageName,
      ); // TODO QUICK_FIX
      delete pj.devDependencies;
      pj.dependencies = child.__packageJson.data.tnp.overrided?.dependencies;
      pj.peerDependencies = child.__packageJson.data.peerDependencies;
      pj.engines = child.__packageJson.data.engines;
      pj.homepage = child.__packageJson.data.homepage;
      Helpers.writeJson(packgeJsonPath, pj);
      Project.ins.unload(proj);
    });
  }
  //#endregion

  //#region publish
  async publish(options: {
    realCurrentProj: Project;
    newVersion: string;
    automaticRelease: boolean;
    prod: boolean;
    rootPackageName?: string;
  }) {
    const {
      realCurrentProj,
      newVersion,
      automaticRelease,
      prod,
      rootPackageName,
    } = options;

    const base = path.join(
      this.project.location,
      this.project.__getTempProjName('dist'),
      config.folder.node_modules,
      rootPackageName,
    );

    Helpers.info(`Publish cwd: ${base}`);
    await Helpers.questionYesNo(
      `Publish on npm all new versions: ${newVersion} ?`,
      async () => {
        Helpers.foldersFrom(base).forEach(cwd => {
          // QUICK_FIX
          for (const clientFolder of clientCodeVersionFolder) {
            Helpers.writeFile(
              [cwd, clientFolder, config.file._npmignore],
              '# file overrided - I need package.json on npm',
            );
          }

          let successPublis = false;
          // const proj = Project.ins.From(absFolder) as Project;

          try {
            Helpers.run(
              `npm publish ${
                realCurrentProj.__packageJson.isPrivate ? '' : '--access public'
              }`,
              {
                cwd,
                output: true,
              },
            ).sync();
            successPublis = true;
          } catch (e) {
            this.project.__removeTagAndCommit(automaticRelease);
          }
        });

        await this.updateTnpAndCoreContainers(realCurrentProj, newVersion);
      },
    );
  }
  //#endregion

  //#region build docs
  async buildDocs(
    prod: boolean,
    realCurrentProj: Project,
    automaticReleaseDocs: boolean,
    libBuildCallback: (websql: boolean, prod: boolean) => any,
  ): Promise<boolean> {
    //#region resolve variables
    const smartContainer = this.project;
    const mainProjectName = smartContainer.__smartContainerBuildTarget.name;
    const otherProjectNames = this.project.children
      .filter(c => c.name !== mainProjectName)
      .map(p => p.name);

    let allProjects = [mainProjectName, ...otherProjectNames];

    Helpers.info(`
Smart container routes for project:
+ ${chalk.bold(mainProjectName)} => /${mainProjectName}
${otherProjectNames
  .map(c => `+ ${chalk.bold(c)} => /${mainProjectName}/-/${c}`)
  .join('\n')}
        `);
    //#endregion

    return await Helpers.questionYesNo(
      `Do you wanna build /docs folder app for preview`,
      async () => {
        //#region questions
        const returnFun = (childName: string) => {
          if (childName === mainProjectName) {
            return {
              name: childName, // + chalk.gray(`\t\t<url>/${mainProjectName}`),
              value: childName,
            };
          }
          return {
            name: childName, // + chalk.gray(`\t\t<url>/${mainProjectName}/-/${childName}`),
            value: childName,
          };
        };

        const toBuildWebsqlCFG = [
          ...(realCurrentProj.__docsAppBuild.config.build &&
          realCurrentProj.__docsAppBuild.config.websql
            ? [mainProjectName]
            : []),
          ...realCurrentProj.__docsAppBuild.config.children
            .map(c => {
              if (c.build && c.websql) {
                return c.projName;
              }
            })
            .filter(f => !!f),
        ];

        const toBuildNormallyCFG = [
          ...(realCurrentProj.__docsAppBuild.config.build &&
          !realCurrentProj.__docsAppBuild.config.websql
            ? [mainProjectName]
            : []),
          ...realCurrentProj.__docsAppBuild.config.children
            .map(c => {
              if (c.build && !c.websql) {
                return c.projName;
              }
            })
            .filter(f => !!f),
        ];

        let toBuildWebsql = automaticReleaseDocs
          ? toBuildWebsqlCFG
          : await Helpers.consoleGui.multiselect(
              'Which project you want to build with WEBSQL mode',
              allProjects.map(childName => {
                return returnFun(childName);
              }),
            );

        allProjects = allProjects.filter(f => !toBuildWebsql.includes(f));

        let toBuildNormally = automaticReleaseDocs
          ? toBuildNormallyCFG
          : allProjects.length === 0
            ? []
            : await Helpers.consoleGui.multiselect(
                'Which projects you want to build with normally',
                allProjects.map(childName => {
                  return returnFun(childName);
                }),
              );

        //#region questions
        let appBuildOptions = { docsAppInProdMode: prod, websql: false };

        await Helpers.questionYesNo(
          `Do you want build in production mode`,
          () => {
            appBuildOptions.docsAppInProdMode = true;
          },
          () => {
            appBuildOptions.docsAppInProdMode = false;
          },
        );

        if (automaticReleaseDocs) {
          appBuildOptions.docsAppInProdMode =
            realCurrentProj.__docsAppBuild.config.prod;
          appBuildOptions.websql = realCurrentProj.__docsAppBuild.config.websql;
        }

        const cfg: AppBuildConfig = {
          build: [...toBuildWebsql, ...toBuildNormally].includes(
            mainProjectName,
          ),
          prod: appBuildOptions.docsAppInProdMode,
          websql: toBuildWebsql.includes(mainProjectName),
          projName: mainProjectName,
          children: [
            ...toBuildWebsql
              .filter(c => c !== mainProjectName)
              .map(c => {
                return {
                  build: true,
                  prod: appBuildOptions.docsAppInProdMode,
                  websql: true,
                  projName: c,
                };
              }),
            ...toBuildNormally
              .filter(c => c !== mainProjectName)
              .map(c => {
                return {
                  build: true,
                  prod: appBuildOptions.docsAppInProdMode,
                  websql: false,
                  projName: c,
                };
              }),
          ],
        };

        realCurrentProj.__docsAppBuild.save(cfg);
        //#endregion

        // await Helpers.questionYesNo(`Do you wanna use websql mode ?`, () => {
        //   appBuildOptions.websql = true;
        // }, () => {
        //   appBuildOptions.websql = false;
        // });

        Helpers.log(`

      Building /docs folder preview app - start

      `);
        //#endregion

        await Helpers.runSyncOrAsync({ functionFn: libBuildCallback });

        const docsBuild = async (
          childProjName: string,
          productinoBuild: boolean,
          websqlBuild: boolean,
          isMainTarget = false,
        ) => {
          await this.project.build(
            BuildOptions.from({
              buildType: 'app',
              prod: productinoBuild,
              websql: websqlBuild,
              smartContainerTargetName: childProjName,
            }),
          );

          const assetsListPathSourceMain = crossPlatformPath([
            crossPlatformPath(
              path.resolve(path.join(this.project.location, '..')),
            ),
            realCurrentProj.name,
            config.folder.dist,
            realCurrentProj.name,
            childProjName,
            `tmp-apps-for-${config.folder.dist}${websqlBuild ? '-websql' : ''}`,
            childProjName,
            config.folder.src,
            config.folder.assets,
            realCurrentProj.__assetsFileListGenerator.filename,
          ]);
          const assetsListPathDestMain = crossPlatformPath([
            realCurrentProj.location,
            config.folder.docs,
            ...(isMainTarget ? [] : ['-' + childProjName]),
            config.folder.assets,
            realCurrentProj.__assetsFileListGenerator.filename,
          ]);

          Helpers.copyFile(assetsListPathSourceMain, assetsListPathDestMain);
        };

        await docsBuild(cfg.projName, cfg.prod, cfg.websql, true);

        const children = cfg.children || [];
        for (let index = 0; index < children.length; index++) {
          const { websql, prod, projName } = children[index];
          await docsBuild(projName, prod, websql);
        }

        realCurrentProj.git.revertFileChanges('docs/CNAME');
        Helpers.log(`

        Building docs preview - done

        `);
      },
    );
  }
  //#endregion
}
