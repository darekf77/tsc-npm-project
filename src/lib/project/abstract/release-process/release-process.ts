//#region imports
//#region @backend
import { Helpers, translate } from 'tnp-helpers/src';
//#endregion
import { BaseReleaseProcess } from 'tnp-helpers/src';
import { Project } from '../project';
import { chalk, CoreModels, UtilsTerminal } from 'tnp-core/src';
import { config } from 'tnp-config/src';
//#endregion

export class ReleaseProcess extends BaseReleaseProcess<Project> {
  project: Project;

  constructor(
    project: Project,
    private releaseProcessType: CoreModels.ReleaseProcessType,
  ) {
    super(project);
  }

  //#region display release process menu
  async displayReleaseProcessMenu() {
    //#region @backend
    while (true) {
      UtilsTerminal.clearConsole();
      const isContainer = this.project.__isContainer;
      console.info(`
        ${chalk.bold.yellow('Manual release')} => for everything whats Taon supports (npm, docker, git, etc)
        - everything is done here manually, you have to provide options
        - from here you can save release options for ${chalk.bold.green('Taon Cloud')} release

        ${chalk.bold.green('Cloud release')} => trigger remote release action on server (local or remote)
        - trigger release base on config stored inside cloud
        - use local Taon Cloud or login to remote Taon Cloud

        ${chalk.bold.gray('Local release')} => use current git repo for storing release data
        - for cli tools, electron apps, vscode extensions
          ( if you need a backup them inside your git repository )

        `);
      await UtilsTerminal.selectActionAndExecute(
        {
          ['manual' as CoreModels.ReleaseProcessType]: {
            name: `${chalk.bold.yellow('Manual')} release`,
            action: async () => {
              const { ReleaseProcessManual } = await import(
                './release-process-manual'
              );
              const releaseProcess = new ReleaseProcessManual(
                this.project,
                'manual',
              );
              await releaseProcess.displayReleaseProcessMenu();
            },
          },
          ['cloud' as CoreModels.ReleaseProcessType]: {
            name: `${chalk.bold.green('Cloud')} release`,
            action: async () => {
              const { ReleaseProcessCloud } = await import(
                './release-process-cloud'
              );
              const releaseProcess = new ReleaseProcessCloud(
                this.project,
                'cloud',
              );
              await releaseProcess.displayReleaseProcessMenu();
            },
          },
          ['local' as CoreModels.ReleaseProcessType]: {
            name: `${chalk.bold.gray('Local')} release`,
            action: async () => {
              const { ReleaseProcessLocal } = await import(
                './release-process-local'
              );
              const releaseProcess = new ReleaseProcessLocal(
                this.project,
                'local',
              );
              await releaseProcess.displayReleaseProcessMenu();
            },
          },
        },
        {
          autocomplete: false,
          question:
            `Select release type for this ` +
            `${this.project.__isContainer ? 'container' : 'standalone'} project ?`,
        },
      );
    }
    //#endregion
  }
  //#endregion

  //#region start release
  async startRelease(
    options?: Partial<
      Pick<
        BaseReleaseProcess<Project>,
        | 'automaticRelease'
        | 'versionType'
        | 'newVersion'
        | 'processType'
        | 'preReleaseVersionTag'
      >
    >,
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
  //#endregion
}
