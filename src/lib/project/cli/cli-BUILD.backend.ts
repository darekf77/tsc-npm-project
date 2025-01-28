//#region @backend
import { _, chalk, UtilsTerminal } from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';
import { BaseCommandLineFeature } from 'tnp-helpers/src';
import { Project } from '../abstract/project';
import { BuildOptions } from '../../options';
import { TEMP_DOCS } from '../../constants';
import { config } from 'tnp-config/src';
import { Utils } from 'tnp-core/src';

class $Build extends BaseCommandLineFeature<BuildOptions, Project> {
  protected async __initialize__() {
    if (this.params['base-href'] && !this.params.baseHref) {
      this.params.baseHref = this.params['base-href'];
      delete this.params['base-href'];
    }
    this.params = BuildOptions.from(this.params);
    //#region resolve smart containter
    this._tryResolveChildIfInsideArg();
    if (this.project.__isSmartContainerChild) {
      this.params.smartContainerTargetName = this.project.name;
      this.project = this.project.parent;
    } else if (this.project.__isSmartContainer) {
      this.params.smartContainerTargetName =
        this.project.__smartContainerBuildTarget?.name;
    }

    //#endregion
    // console.log(this.params)
  }

  public async _() {
    await this.project.build(
      BuildOptions.from({
        ...this.params,
        buildType: 'lib',
        finishCallback: () => this._exit(),
      }),
    );
  }

  async watch() {
    await this.project.build(
      BuildOptions.from({
        ...this.params,
        buildType: 'lib',
        watch: true,
      }),
    );
  }

  async cleanWatch() {
    await this.project.clear();
    await this.watch();
  }

  async cleanBuild() {
    await this.project.clear();
    await this._();
  }

  async default() {
    await this.project.build(
      BuildOptions.from({
        ...this.params,
        buildType: 'lib',
        watch: true,
      }),
    );
  }

  async app() {
    await this.project.build(
      BuildOptions.from({
        ...this.params,
        buildType: 'app',
        finishCallback: () => this._exit(),
      }),
    );
  }

  async appWatch() {
    await this.project.build(
      BuildOptions.from({
        ...this.params,
        buildType: 'app',
        watch: true,
      }),
    );
  }

  compiledPathes() {
    console.log(this.project.compiledProjectFilesAndFolders.join('\n'));
    this._exit();
  }

  async start() {
    const { smartContainerTargetName } = this.params;

    // console.log('smartContainerTargetName', smartContainerTargetName);
    // console.log(
    //   'this.project?.__smartContainerBuildTarget?.name',
    //   this.project?.__smartContainerBuildTarget?.name,
    // );
    //#region prevent start mode for smart container non child
    if (
      smartContainerTargetName !==
      this.project?.__smartContainerBuildTarget?.name
    ) {
      Helpers.error(
        `Start mode only available for child project "${
          this.project?.__smartContainerBuildTarget.name
        }"

        Please use 2 commands instead (in 2 separaed terminals):

1. Build of every lib in container
${config.frameworkName} build:watch

2. Start ng server for app
${config.frameworkName} app ${smartContainerTargetName} ${
          this.params.websql ? '--websql' : ''
        }  # to build app


        `,
        false,
        true,
      );
    }
    //#endregion
    await this.project.build(
      BuildOptions.from({
        ...this.params,
        buildType: 'lib-app',
        watch: true,
      }),
    );
  }

  async startClean() {
    await this.project.clear();
    await this.start();
  }

  async mkdocs() {
    const mkdocsActions = {
      //#region @notForNpm
      SELECT_COMMAND: {
        name: '< select command >',
      },
      BUILD_DEPLY_DOCS_TAON: {
        name: 'Build & deply docs for www.taon.dev',
        value: {
          command: `python -m mkdocs build --site-dir ../../taon-projects/www-taon-dev/docs/documentation`,
          action: async () => {
            const taonProjWww = Project.ins.From([
              this.cwd,
              '../../taon-projects/www-taon-dev',
            ]);
            if (await Helpers.questionYesNo('Push and commit docs update ?')) {
              taonProjWww.git.addAndCommit('docs: update');
              await taonProjWww.git.pushCurrentBranch();
            }
          },
        },
      },
      // BUILD_DOCS_TAON: {
      //   name: 'Build docs for www.taon.dev',
      //   value: {
      //     command: `python -m mkdocs build --site-dir ../../taon-projects/www-taon-dev/${TEMP_DOCS}`,
      //     action: void 0,
      //   },
      // },
      //#endregion
      SERVE_DOCS_TAON: {
        name: 'Serve docs for www.taon.dev on 8000',
        value: {
          command: 'python -m mkdocs serve',
          action: void 0,
        },
      },
    };

    let res: {
      command: string;
      action: () => Promise<void>;
    };

    while (true) {
      Helpers.clearConsole();
      const q = await UtilsTerminal.select<{
        command: string;
        action: () => Promise<void>;
      }>({
        choices: mkdocsActions,
        question: 'What you wanna do with docs ?',
      });

      if (q.command) {
        res = q;
        break;
      }
    }

    this.project.run(res.command, { output: true }).sync();
    if (_.isFunction(res.action)) {
      await res.action();
    }
    Helpers.info('DONE BUILDING DOCS');
    this._exit();
  }
}

export default {
  $Build: Helpers.CLIWRAP($Build, '$Build'),
};
//#endregion
