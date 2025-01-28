//#region imports
import { crossPlatformPath, _ } from 'tnp-core/src';
import { path } from 'tnp-core/src';
import { Project } from '../abstract/project';
import { appRelatedFiles, config } from 'tnp-config/src';
import { Helpers } from 'tnp-helpers/src';
import { argsToClear } from '../../constants';
import {
  COMPILER_POOLING,
  IncrementalWatcherInstance,
  incrementalWatcher,
} from 'incremental-compiler/src';
import { recreateApp } from './inside-structures/structs/inside-struct-helpers';
import { BaseFeatureForProject } from 'tnp-helpers/src';
import { InitOptions } from '../../options';

//#endregion

/**
 * @deprecated I will use standalone build with flag for organization package
 * Singular build for workspace
 */
export class SingularBuild extends BaseFeatureForProject<Project> {
  watchers: IncrementalWatcherInstance[] = [];

  async createSingluarTargeProjFor(options: {
    parent: Project;
    targetContainerProject: Project;
    initOptions: InitOptions;
    nonClient: boolean;
  }): Promise<Project> {
    const {
      parent,
      targetContainerProject,
      initOptions,
      nonClient = false,
    } = options;

    const children = this.project.children.filter(
      c => c.typeIs('isomorphic-lib') && c.__frameworkVersionAtLeast('v3'),
    );
    const smartContainerTargetProjPath = parent.__getProxyProjPath(
      targetContainerProject.name,
    );

    Helpers.log(`dist project: ${smartContainerTargetProjPath}`);
    if (!Helpers.exists(smartContainerTargetProjPath)) {
      Helpers.mkdirp(smartContainerTargetProjPath);
    }

    //#region symlinks package.json, tmp-environemnt
    (() => {
      [
        config.file.package_json,
        config.file.taon_jsonc,
        config.file.environment_js,
        config.file.tnpEnvironment_json,
      ].forEach(fileOrFolder => {
        const source = path.join(targetContainerProject.location, fileOrFolder);
        const dest = path.join(smartContainerTargetProjPath, fileOrFolder);
        Helpers.createSymLink(source, dest, {
          continueWhenExistedFolderDoesntExists: true,
        });
      });
    })();

    //#endregion

    //#region symlinks app/lib fodlers
    (() => {
      ['app', 'lib'].forEach(f => {
        const source = crossPlatformPath(
          path.join(targetContainerProject.location, config.folder.src, f),
        );
        const dest = crossPlatformPath(
          path.join(smartContainerTargetProjPath, config.folder.src, f),
        );
        // console.log({ dest })
        if (!Helpers.exists(source)) {
          Helpers.mkdirp(source);
        }
        Helpers.removeFileIfExists(dest);
        Helpers.createSymLink(source, dest);
      });
    })();
    //#endregion

    //#region symlinks lib => libs

    children.forEach(c => {
      (() => {
        const source_lib = crossPlatformPath(
          path.join(c.location, config.folder.src, 'lib'),
        );
        const dest_lib = crossPlatformPath(
          path.join(
            smartContainerTargetProjPath,
            config.folder.src,
            'libs',
            c.name,
          ),
        );
        Helpers.createSymLink(source_lib, dest_lib);
      })();

      if (
        !nonClient &&
        c.name !== this.project.__smartContainerBuildTarget.name
      ) {
        (() => {
          const source_lib = crossPlatformPath(
            path.join(c.location, config.folder.src, 'app'),
          );
          const dest_lib = crossPlatformPath(
            path.join(
              smartContainerTargetProjPath,
              config.folder.src,
              '-',
              c.name,
              'app',
            ),
          );
          Helpers.createSymLink(source_lib, dest_lib, {
            continueWhenExistedFolderDoesntExists: true,
          });
        })();

        (() => {
          const dest_lib = crossPlatformPath(
            path.join(
              smartContainerTargetProjPath,
              config.folder.src,
              '-',
              c.name,
              'index.ts',
            ),
          );
          Helpers.writeFile(
            dest_lib,
            `export * from "./app";
import def from './app';
export default def;
`,
          );
        })();

        (() => {
          const dest_lib = crossPlatformPath(
            path.join(
              smartContainerTargetProjPath,
              `../${c.name}`,
              config.folder.dist,
              'index.js',
            ),
          );
          Helpers.writeFile(
            dest_lib,
            `var start = require("./compiled/-/${c.name}/app");
exports.default = start;`,
          );
        })();

        (() => {
          const dest_lib = crossPlatformPath(
            path.join(
              smartContainerTargetProjPath,
              `../${c.name}`,
              config.folder.dist,
              'app.js',
            ),
          ); // fix for waiting in run.js
          Helpers.writeFile(
            dest_lib,
            `var start = require("./compiled/-/${c.name}/app.js").default;
exports.default = start;`,
          );
        })();
      }
    });

    //#endregion

    //#region symlinks lib => libs
    // children.forEach(c => {
    //   const source_lib = crossPlatformPath(path.join(c.location, config.folder.src, 'app'));
    //   const dest_lib = crossPlatformPath(path.join(smartContainerTargetProjPath, config.folder.src, '_', c.name, 'app '));
    //   Helpers.createSymLink(source_lib, dest_lib);
    // });
    //#endregion

    //#region copy core asset files

    (() => {
      const corepro = Project.by(
        'isomorphic-lib',
        targetContainerProject.__frameworkVersion,
      ) as Project;
      const coreAssetsPath = corepro.pathFor('app/src/assets');
      const filesToCopy = Helpers.filesFrom(coreAssetsPath, true);
      for (let index = 0; index < filesToCopy.length; index++) {
        const fileAbsPath = crossPlatformPath(filesToCopy[index]);
        const relativeFilePath = fileAbsPath.replace(`${coreAssetsPath}/`, '');
        const destAbsPath = crossPlatformPath(
          path.join(
            smartContainerTargetProjPath,
            config.folder.src,
            'assets',
            relativeFilePath,
          ),
        );
        Helpers.copyFile(fileAbsPath, destAbsPath);
      }
    })();

    //#endregion

    //#region handle assets watch/copy
    for (let index = 0; index < children.length; index++) {
      const c = children[index];
      const source_assets = crossPlatformPath(
        path.join(c.location, config.folder.src, 'assets'),
      );
      const dest_assets = crossPlatformPath(
        path.join(
          smartContainerTargetProjPath,
          config.folder.src,
          'assets',
          'assets-for',
          parent.name + '--' + c.name,
        ),
      );

      if (!Helpers.exists(source_assets)) {
        Helpers.mkdirp(source_assets);
      }

      if (initOptions.watch) {
        // SYNCING FOLDERS
        (async () => {
          Helpers.copy(source_assets, dest_assets, {
            recursive: true,
            overwrite: true,
          });
          const watcher = (
            await incrementalWatcher(source_assets, {
              name: `TAON SINGULAR BUILD ASSETS WATCHER `,
              ignoreInitial: true,
              followSymlinks: false,
              ...COMPILER_POOLING,
            })
          ).on('all', (event, f) => {
            // console.log('TAON SINGULAR BUILD ASSETS WATCHER EVENT')
            f = crossPlatformPath(f);
            const dest = path.join(
              dest_assets,
              Helpers.removeSlashAtBegin(f.replace(`${source_assets}`, '')),
            );
            // console.log('SYNCING FOLDERS ', f, event)
            if (event === 'add' || event === 'change') {
              Helpers.removeFileIfExists(dest);
              Helpers.copyFile(f, dest);
            }
            if (event === 'addDir') {
              Helpers.copy(f, dest, { recursive: true, overwrite: true });
            }
            if (event === 'unlink') {
              Helpers.removeFileIfExists(dest);
            }
            if (event === 'unlinkDir') {
              Helpers.remove(dest, true);
            }
          });
          this.watchers.push(watcher);
        })();
      } else {
        Helpers.copy(source_assets, dest_assets, {
          recursive: true,
          overwrite: true,
        });
      }
    }

    //#endregion

    //#region handle app.* files watch/copy
    await (async () => {
      const filesToWatch = [];

      const copySourcesToDestNonTarget = () => {
        children.forEach(c => {
          if (
            !nonClient &&
            c.name !== this.project.__smartContainerBuildTarget.name
          ) {
            for (let index = 0; index < appRelatedFiles.length; index++) {
              const appFileName = appRelatedFiles[index];
              const source = crossPlatformPath([
                c.location,
                config.folder.src,
                appFileName,
              ]);
              filesToWatch.push(source);
              const appFilesCopyDest = crossPlatformPath([
                smartContainerTargetProjPath,
                config.folder.src,
                '-',
                c.name,
                appFileName,
              ]);
              // console.log({
              //   appFilesCopyDest
              // })
              Helpers.exists(source) &&
                Helpers.copyFile(source, appFilesCopyDest);
            }
          }
        });
      };

      const copySourcesToDestTarget = () => {
        for (let index = 0; index < appRelatedFiles.length; index++) {
          const appFileName = appRelatedFiles[index];
          const source = crossPlatformPath(
            path.join(
              targetContainerProject.location,
              config.folder.src,
              appFileName,
            ),
          );
          const relativeAfile = source.replace(
            `${crossPlatformPath([
              targetContainerProject.location,
              config.folder.src,
            ])}/`,
            '',
          );
          filesToWatch.push(source);
          const appFileCopyDestination = crossPlatformPath(
            path.join(
              smartContainerTargetProjPath,
              config.folder.src,
              relativeAfile,
            ),
          );
          // console.log({
          //   appFileCopyDestination
          // })
          Helpers.exists(source) &&
            Helpers.copyFile(source, appFileCopyDestination);
        }
      };

      const copyAll = () => {
        copySourcesToDestNonTarget();
        copySourcesToDestTarget();
      };

      if (initOptions.watch) {
        copyAll();
        const watcher = (
          await incrementalWatcher(filesToWatch, {
            name: `TAON SINGULAR BUILD CODE WATCHER`,
            ignoreInitial: true,
            followSymlinks: false,
            ...COMPILER_POOLING,
          })
        ).on('all', (event, f) => {
          f = crossPlatformPath(f);
          // console.log('TAON SINGULAR BUILD CODE WATCHER EVENT')
          const containerLocaiton = this.project.location;
          const childName = _.first(
            f.replace(containerLocaiton + '/', '').split('/'),
          );
          const toReplace = crossPlatformPath([
            containerLocaiton,
            childName,
            config.folder.src,
          ]);

          const relative = f.replace(toReplace + '/', '');
          const isTarget = childName === targetContainerProject.name;

          const dest = isTarget
            ? crossPlatformPath([
                smartContainerTargetProjPath,
                config.folder.src,
                relative,
              ])
            : crossPlatformPath([
                smartContainerTargetProjPath,
                config.folder.src,
                '-',
                childName,
                relative,
              ]);

          // console.log({
          //   f,
          //   containerLocaiton,
          //   toReplace,
          //   childName,
          //   relative,
          //   isTarget,
          //   dest
          // })

          if (
            isTarget ||
            (!isTarget &&
              (relative === 'index.ts' ||
                relative.startsWith('app/') ||
                relative.startsWith('app.')))
          ) {
            if (event === 'add' || event === 'change') {
              // Helpers.removeFileIfExists(dest);
              Helpers.copyFile(f, dest);
            }
            if (event === 'unlink') {
              Helpers.removeFileIfExists(dest);
            }
          } else {
            // console.log(`ommiting: ${relative}`)
          }
        });
        this.watchers.push(watcher);
      } else {
        copyAll();
      }
    })();
    //#endregion

    let smartContainerTargetProject = Project.ins.From(
      smartContainerTargetProjPath,
    );
    parent.__node_modules.linkTo(smartContainerTargetProject);
    await smartContainerTargetProject.init('initing dist project'); // THIS CAUSE NOT NICE SHIT

    return smartContainerTargetProject;
  }

  //#region init
  async initSingularBuild(
    initOptions: InitOptions,
    smartContainerTargetName: string,
    // watch: boolean, prod: boolean, outDir: 'dist', smartContainerTargetName?: string
  ) {
    if (!this.project.__isSmartContainer) {
      return;
    }

    const children = this.project.children.filter(
      c => c.typeIs('isomorphic-lib') && c.__frameworkVersionAtLeast('v3'),
    );
    for (let index = 0; index < children.length; index++) {
      const c = children[index];
      recreateApp(c);
      await c.init('singular build lib init');
    }

    const nonClinetCildren =
      children.filter(f => f.name !== smartContainerTargetName) || [];
    const smartContainerBuildTarget = this.project.getChildBy(
      smartContainerTargetName,
    );

    const singularWatchProj = await this.createSingluarTargeProjFor({
      parent: this.project,
      targetContainerProject: smartContainerBuildTarget,
      initOptions,
      nonClient: false,
    });
    for (let index = 0; index < nonClinetCildren.length; index++) {
      await this.createSingluarTargeProjFor({
        parent: this.project,
        targetContainerProject: nonClinetCildren[index],
        initOptions,
        nonClient: true,
      });
    }

    Helpers.log(`[singular build] init structure ${!!singularWatchProj}`);
  }
  //#endregion
}
