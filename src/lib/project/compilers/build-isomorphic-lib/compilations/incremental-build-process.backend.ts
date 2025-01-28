//#region imports
import { path, crossPlatformPath } from 'tnp-core/src';
import { _ } from 'tnp-core/src';

import { config } from 'tnp-config/src';
import type { Project } from '../../../../project/abstract/project';
import { Helpers } from 'tnp-helpers/src';
import { BuildOptions } from '../../../../options';
import { BackendCompilation } from './compilation-backend.backend';
import { BroswerCompilation } from './compilation-browser.backend';
import { IncCompiler } from 'incremental-compiler/src';
//#endregion

export class IncrementalBuildProcess {
  //#region fields & getters

  protected backendCompilation: BackendCompilation;
  // protected browserCompilations: BroswerCompilation[];
  protected broswerCompilationStandalone: BroswerCompilation;
  protected broswerCompilationSmartContainer: BroswerCompilation;

  //#region constructor
  constructor(
    private project: Project,
    private buildOptions: BuildOptions,
  ) {
    Helpers.log(
      `[incremental-build-process] for project: ${project.genericName}`,
    );

    //#region init variables
    const outFolder = buildOptions.outDir;
    const location = config.folder.src;
    const cwd = project.location;

    Helpers.log(
      `[incremental-build-process]  this.project.grandpa: ${this.project.grandpa?.genericName} `,
    );
    Helpers.log(
      `[incremental-build-process]  this.project.parent: ${this.project.parent?.genericName} `,
    );
    Helpers.log(
      `[incremental-build-process] parentProj: ${project?.parent?.genericName} `,
    );
    //#endregion

    //#region int backend compilation

    this.backendCompilation = new BackendCompilation(
      buildOptions,
      buildOptions.watch,
      outFolder,
      location,
      cwd,
      this.buildOptions.websql,
    );

    Helpers.log(
      `[incremental-build-process] this.backendCompilation exists: ${!!this.backendCompilation}`,
    );

    if (buildOptions.genOnlyClientCode) {
      if (this.backendCompilation) {
        this.backendCompilation.isEnableCompilation = false;
      }
    }
    if (buildOptions.onlyBackend) {
      return;
    }
    //#endregion

    if (project.__isStandaloneProject) {
      let browserOutFolder = Helpers.getBrowserVerPath(
        void 0,
        this.buildOptions.websql,
      );
      this.broswerCompilationStandalone = new BroswerCompilation(
        buildOptions.watch,
        this.project,
        void 0,
        void 0,
        `tmp-src-${outFolder}${this.buildOptions.websql ? '-websql' : ''}`,
        browserOutFolder as any,
        location,
        cwd,
        outFolder,
        buildOptions,
      );
    } else {
      const moduleName = '';
      const envConfig = {} as any;
      let browserOutFolder = Helpers.getBrowserVerPath(
        moduleName,
        this.buildOptions.websql,
      );

      if (this.project.isInCiReleaseProject) {
        browserOutFolder = crossPlatformPath(
          path.join(outFolder, browserOutFolder),
        );
      }
      this.broswerCompilationSmartContainer = new BroswerCompilation(
        buildOptions.watch,
        this.project,
        moduleName,
        envConfig,
        `tmp-src-${outFolder}-${browserOutFolder}`,
        browserOutFolder as any,
        location,
        cwd,
        outFolder,
        buildOptions,
      );
    }
  }
  //#endregion

  //#region  methods
  protected browserTaksName(taskName: string, bc: BroswerCompilation) {
    return `browser ${taskName} in ${path.basename(bc.absPathTmpSrcDistFolder)}`;
  }

  protected backendTaskName(taskName) {
    return `${taskName} in ${path.basename(this.backendCompilation.absPathTmpSrcDistFolder)}`;
  }

  private recreateBrowserLinks(bc: BroswerCompilation) {
    const outDistPath = crossPlatformPath(path.join(bc.cwd, bc.outFolder));
    Helpers.log(`recreateBrowserLinks: outDistPath: ${outDistPath}`);
    Helpers.removeFolderIfExists(outDistPath);
    const targetOut = crossPlatformPath(
      path.join(bc.cwd, bc.backendOutFolder, bc.outFolder),
    );
    Helpers.log(`recreateBrowserLinks: targetOut: ${targetOut}`);
    Helpers.createSymLink(targetOut, outDistPath, {
      continueWhenExistedFolderDoesntExists: true,
    });
  }

  async start(taskName?: string, afterInitCallBack?: () => void) {
    if (this.project.__isStandaloneProject) {
      await this.broswerCompilationStandalone.start({
        taskName: this.browserTaksName(
          taskName,
          this.broswerCompilationStandalone,
        ),
        afterInitCallBack: () => {
          this.recreateBrowserLinks(this.broswerCompilationStandalone);
        },
      });
    } else {
      await this.broswerCompilationSmartContainer.start({
        taskName: this.browserTaksName(
          taskName,
          this.broswerCompilationSmartContainer,
        ),
        afterInitCallBack: () => {
          this.recreateBrowserLinks(this.broswerCompilationSmartContainer);
        },
      });
    }

    if (this.backendCompilation) {
      await this.backendCompilation.start({
        taskName: this.backendTaskName(taskName),
      });
    }

    if (_.isFunction(afterInitCallBack)) {
      await Helpers.runSyncOrAsync({ functionFn: afterInitCallBack });
    }
  }

  async startAndWatch(
    taskName?: string,
    options?: IncCompiler.Models.StartAndWatchOptions,
  ) {
    // console.log('[${config.frameworkName}][incremental-build-process] taskName' + taskName)

    const { afterInitCallBack } = options || {};

    if (this.project.__isStandaloneProject) {
      await this.broswerCompilationStandalone.startAndWatch({
        taskName: this.browserTaksName(
          taskName,
          this.broswerCompilationStandalone,
        ),
        afterInitCallBack: () => {
          this.recreateBrowserLinks(this.broswerCompilationStandalone);
        },
      });
    } else {
      await this.broswerCompilationSmartContainer.startAndWatch({
        taskName: this.browserTaksName(
          taskName,
          this.broswerCompilationSmartContainer,
        ),
        afterInitCallBack: () => {
          this.recreateBrowserLinks(this.broswerCompilationSmartContainer);
        },
      });
    }

    if (this.backendCompilation) {
      await this.backendCompilation.startAndWatch({
        taskName: this.backendTaskName(taskName),
      });
    }

    if (_.isFunction(afterInitCallBack)) {
      await Helpers.runSyncOrAsync({ functionFn: afterInitCallBack });
    }
  }

  //#endregion
}
