//#region imports
import { path, crossPlatformPath } from 'tnp-core'
import { _ } from 'tnp-core';

import { config } from 'tnp-config';
import type { Project } from '../../../../project/abstract/project/project';
import { Helpers } from 'tnp-helpers';
import { BuildOptions } from 'tnp-db';
import { BackendCompilation } from './compilation-backend.backend';
import { BroswerCompilation } from './compilation-browser.backend';
import { IncCompiler } from 'incremental-compiler';
import { CLI } from 'tnp-cli';
//#endregion

export class IncrementalBuildProcess {

  //#region fields & getters
  protected compileOnce = false;
  protected backendCompilation: BackendCompilation;
  protected browserCompilations: BroswerCompilation[];

  /**
   * resolve modules from Location
   */
  private get resolveModulesLocations(): string[] {
    if (this.project.isWorkspaceChildProject || (this.project.isStandaloneProject && this.project.isGenerated)) {

      if (_.isArray(this.buildOptions.forClient) && this.buildOptions.forClient.length > 0) {
        return (this.buildOptions.forClient as any[]).map((c: Project) => c.name)
      }
      const parent = this.project.isStandaloneProject ? this.project.grandpa : this.project.parent;

      return parent.children
        .filter(c => c.typeIs(...config.allowedTypes.app))
        .map(c => c.name);
    }
    return [];
  }
  //#endregion

  //#region constructor
  constructor(
    private project: Project,
    private buildOptions: BuildOptions,
  ) {
    Helpers.log(`[incremental-build-process] for project: ${project.genericName}`)

    //#region init variables
    this.compileOnce = !buildOptions.watch
    const outFolder = buildOptions.outDir;
    const location = ((project.typeIs('isomorphic-lib')) ?
      (project.isSiteInStrictMode ? config.folder.tempSrc : config.folder.src)
      : config.folder.components);
    const cwd = project.location;
    const projectIsFromSinglularBuild = (this.project.isStandaloneProject && this.project.isGenerated);
    //#region parent project
    /**
     * For 'watch:dist' build inside container (with standalone childs) or workspace (with workspace childs)
     * I am taking 'gradpa' project... to get this container or workspace
     *
     * For normal workspace build I am taking just parent
     */
    const parentProj = projectIsFromSinglularBuild ? this.project.grandpa : this.project.parent;
    //#endregion
    Helpers.log(`[incremental-build-process]  this.project.grandpa: ${this.project.grandpa?.genericName} `);
    Helpers.log(`[incremental-build-process]  this.project.parent: ${this.project.parent?.genericName} `);
    Helpers.log(`[incremental-build-process] parentProj: ${parentProj?.genericName} `);
    //#endregion

    //#region int backend compilation
    if (project.typeIs('isomorphic-lib')) {
      if (project.isSiteInStrictMode) {
        this.backendCompilation = new BackendCompilation(
          buildOptions.watch,
          outFolder,
          config.folder.tempSrc,
          cwd,
          this.buildOptions.websql
        );
      } else {
        this.backendCompilation = new BackendCompilation(
          buildOptions.watch,
          outFolder,
          location,
          cwd,
          this.buildOptions.websql,
        );
      }
    } else {
      this.backendCompilation = new BackendCompilation(
        buildOptions.watch,
        outFolder,
        location,
        cwd,
        this.buildOptions.websql,
      );
    }
    Helpers.log(`[incremental-build-process] this.backendCompilation exists: ${!!this.backendCompilation}`);

    if (buildOptions.genOnlyClientCode) {
      if (this.backendCompilation) {
        this.backendCompilation.isEnableCompilation = false;
      }
    }
    if (buildOptions.onlyBackend) {
      this.browserCompilations = [];
      return;
    }
    //#endregion

    //#region making sure that there is environemnt generated for project
    this.resolveModulesLocations
      .forEach(moduleName => {
        const proj = parentProj.child(moduleName);
        let envConfig = proj.env.config;
        if (!envConfig) {
          Helpers.info(`\n\n\n(QUICKFIX) INITINT ${proj.genericName}\n\n\n`)
          proj.run(`${config.frameworkName} struct`).sync();
        }
      });
    //#endregion

    //#region modular build
    const modularBuild = () => {
      if (parentProj.isContainer) {
        const moduleName = '';
        const envConfig = {} as any;
        let browserOutFolder = Helpers.getBrowserVerPath(moduleName, this.buildOptions.websql);

        if (outFolder === 'bundle') {
          browserOutFolder = crossPlatformPath(path.join(outFolder, browserOutFolder));
        }
        this.browserCompilations = [
          new BroswerCompilation(
            buildOptions.watch,
            this.project,
            moduleName,
            envConfig,
            `tmp-src-${outFolder}-${browserOutFolder}`,
            browserOutFolder as any,
            location,
            cwd,
            outFolder,
            buildOptions
          )
        ];
      } else {
        this.resolveModulesLocations
          .forEach(moduleName => {
            let browserOutFolder = Helpers.getBrowserVerPath(moduleName, this.buildOptions.websql);
            if (outFolder === 'bundle') {
              browserOutFolder = crossPlatformPath(path.join(outFolder, browserOutFolder));
            }

            const proj = parentProj.child(moduleName);
            let envConfig = proj.env.config;
            if (!envConfig) {
              Helpers.error(`[incrementalBuildProcess] Please "tnp init" project: ${proj.genericName}`, false, true);
            }

            this.browserCompilations.push(
              new BroswerCompilation(
                buildOptions.watch,
                this.project,
                moduleName,
                envConfig,
                `tmp-src-${outFolder}-${browserOutFolder}`,
                browserOutFolder as any,
                location,
                cwd,
                outFolder,
                buildOptions)
            )
          });
      }
    };
    //#endregion

    if (project.isStandaloneProject) {
      if (project.isGenerated) {
        modularBuild();
      } else {
        let browserOutFolder = Helpers.getBrowserVerPath(void 0, this.buildOptions.websql);
        this.browserCompilations = [
          new BroswerCompilation(
            buildOptions.watch,
            this.project,
            void 0,
            void 0,
            `tmp-src-${outFolder}${this.buildOptions.websql ? '-websql' : ''}`,
            browserOutFolder as any,
            location,
            cwd,
            outFolder,
            buildOptions)
        ]
      }
    } else {
      modularBuild();
    }

    const compilationsInfo = this.browserCompilations
      .map(c => `compilationProject: ${c.compilationProject?.name}, location: ${c.srcFolder}`).join('\n');

    Helpers.log(`BROWSER COMPILATIONS (length: ${this.browserCompilations.length} )`
      + `\n\n` + compilationsInfo + `\n\n`);

  }
  //#endregion

  //#region  methods
  protected browserTaksName(taskName: string, bc: BroswerCompilation) {
    return `browser ${taskName} in ${path.basename(bc.compilationFolderPath)}`
  }

  protected backendTaskName(taskName) {
    return `${taskName} in ${path.basename(this.backendCompilation.compilationFolderPath)}`
  }

  private recreateBrowserLinks(bc: BroswerCompilation) {
    const outDistPath = crossPlatformPath(path.join(bc.cwd, bc.outFolder));
    Helpers.log(`recreateBrowserLinks: outDistPath: ${outDistPath}`)
    Helpers.tryRemoveDir(outDistPath)
    const targetOut = crossPlatformPath(path.join(bc.cwd, bc.backendOutFolder, bc.outFolder))
    Helpers.log(`recreateBrowserLinks: targetOut: ${targetOut}`)
    Helpers.createSymLink(targetOut, outDistPath, { continueWhenExistedFolderDoesntExists: true });
  }

  async start(taskName?: string, afterInitCallBack?: () => void) {
    if (!this.compileOnce) {
      this.compileOnce = true;
    }

    for (let index = 0; index < this.browserCompilations.length; index++) {
      const browserCompilation = this.browserCompilations[index];
      await browserCompilation.start(this.browserTaksName(taskName, browserCompilation), () => {
        this.recreateBrowserLinks(browserCompilation)
      })
    }

    if (this.backendCompilation) {
      await this.backendCompilation.start(this.backendTaskName(taskName))
    }

    if (_.isFunction(afterInitCallBack)) {
      await Helpers.runSyncOrAsync(afterInitCallBack);
    }
  }

  // @ts-ignore
  async startAndWatch(taskName?: string, options?: IncCompiler.Models.StartAndWatchOptions) {

    // console.log('[${config.frameworkName}][incremental-build-process] taskName' + taskName)

    const { watchOnly, afterInitCallBack } = options || {};
    if (this.compileOnce && watchOnly) {
      console.error(`[${config.frameworkName}] Dont use "compileOnce" and "watchOnly" options together.`);
      process.exit(0)
    }
    if (this.compileOnce) {
      Helpers.log('Watch compilation single run')
      await this.start(taskName, afterInitCallBack);
      process.exit(0);
    }
    if (watchOnly) {
      Helpers.log(CLI.chalk.gray(
        `Watch mode only for "${taskName}"` +
        ` -- morphi only starts starAndWatch anyway --`
      ));
    } else {
      // THIS IS NOT APPLIED FOR TSC
      // await this.start(taskName, afterInitCallBack);
    }

    for (let index = 0; index < this.browserCompilations.length; index++) {
      const browserCompilation = this.browserCompilations[index];
      await browserCompilation.startAndWatch(
        this.browserTaksName(taskName, browserCompilation), {
        // @ts-ignore
        afterInitCallBack: () => {
          this.recreateBrowserLinks(browserCompilation)
        },
        watchOnly
      });
    }

    if (this.backendCompilation) {
      // @ts-ignore
      await this.backendCompilation.startAndWatch(this.backendTaskName(taskName), { watchOnly })
    }

    if (_.isFunction(afterInitCallBack)) {
      await Helpers.runSyncOrAsync(afterInitCallBack);
    }
  }

  //#endregion

}
