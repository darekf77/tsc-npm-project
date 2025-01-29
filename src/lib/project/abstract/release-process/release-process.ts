//#region imports
//#region @backend
import { Helpers, translate } from 'tnp-helpers/src';
//#endregion
import { BaseReleaseProcess } from 'tnp-helpers/src';
import { Project } from '../project';
import { chalk, CoreModels, UtilsTerminal, _ } from 'tnp-core/src';
import { config } from 'tnp-config/src';
//#endregion

export class ReleaseProcess extends BaseReleaseProcess<Project> {
  project: Project;
  selectedProjects: Project[] = [this.project];

  constructor(
    project: Project,
    protected releaseProcessType: CoreModels.ReleaseProcessType,
  ) {
    super(project);
  }

  //#region display release process menu
  async displayReleaseProcessMenu() {
    //#region @backend
    while (true) {
      UtilsTerminal.clearConsole();
      //#region info
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
      //#endregion

      if (this.project.__isContainer && this.project.children.length === 0) {
        console.info(
          `No projects to release inside ${chalk.bold(this.project.genericName)} container`,
        );
        await UtilsTerminal.pressAnyKeyToContinueAsync({
          message: 'Press any key to exit...',
        });
        return;
      }

      const { actionResult } = await UtilsTerminal.selectActionAndExecute(
        {
          ['manual' as CoreModels.ReleaseProcessType]: {
            //#region manual
            name: `${this.getColoredTextItem('manual')} release`,
            action: async () => {
              const { ReleaseProcessManual } = await import(
                './release-process-manual'
              );
              const releaseProcess = new ReleaseProcessManual(
                this.project,
                'manual',
              );
              return await releaseProcess.displayArtifactsMenu();
            },
            //#endregion
          },
          ['cloud' as CoreModels.ReleaseProcessType]: {
            //#region cloud
            name: `${this.getColoredTextItem('cloud')} release`,
            action: async () => {
              //TODO
              await UtilsTerminal.pressAnyKeyToContinueAsync({
                message: 'NOT IMPLEMENTED YET.. Press any key to go back...',
              });
              return;

              // const { ReleaseProcessCloud } = await import(
              //   './release-process-cloud'
              // );
              // const releaseProcess = new ReleaseProcessCloud(
              //   this.project,
              //   'cloud',
              // );
              // return await releaseProcess.displayArtifactsMenu();
            },
            //#endregion
          },
          ['local' as CoreModels.ReleaseProcessType]: {
            //#region local
            name: `${this.getColoredTextItem('local')} release`,
            action: async () => {
              const { ReleaseProcessLocal } = await import(
                './release-process-local'
              );
              const releaseProcess = new ReleaseProcessLocal(
                this.project,
                'local',
              );
              return await releaseProcess.displayArtifactsMenu();
            },
            //#endregion
          },
        },
        {
          autocomplete: false,
          question:
            `Select release type for this ` +
            `${this.project.__isContainer ? 'container' : 'standalone'} project ?`,
        },
      );
      // if (actionResult === 'break') {
      //   return;
      // }
    }
    //#endregion
  }
  //#endregion

  //#region display projects selection menu
  async displayProjectsSelectionMenu() {
    //#region @backend
    while (true) {
      UtilsTerminal.clearConsole();
      this.displayReleaseHeader();
      const choices = this.project.children.map(c => {
        return {
          name: c.genericName,
          value: c.location,
        };
      });

      const selectAll = await UtilsTerminal.confirm({
        message: `Use all ${this.project.children.length} children projects in release process ?`,
      });

      if (selectAll) {
        this.selectedProjects = this.project.children;
        return;
      }

      const selectedLocations = await UtilsTerminal.multiselect({
        choices,
        question: `Select projects to release in ${this.project.genericName} container ?`,
      });
      if (selectedLocations.length > 0) {
        this.selectedProjects = selectedLocations.map(location =>
          Project.ins.From(location),
        );
        return;
      }
    }
    //#endregion
  }
  //#endregion

  //#region display release header
  displayReleaseHeader() {
    console.info(
      `

      ${this.getColoredTextItem(this.releaseProcessType)}` +
        ` release of ${chalk.bold(this.project.genericName)}

      `,
    );
  }
  //#endregion

  //#region get colored text item
  getColoredTextItem(releaseProcessType: CoreModels.ReleaseProcessType) {
    //#region @backend
    if (releaseProcessType === 'manual') {
      return _.upperFirst(chalk.bold.yellow('Manual'));
    }
    if (releaseProcessType === 'cloud') {
      return _.upperFirst(chalk.bold.green('Cloud'));
    }
    if (releaseProcessType === 'local') {
      return _.upperFirst(chalk.bold.gray('Local'));
    }
    //#endregion
  }
  //#endregion

  //#region display artifacts menu
  async displayArtifactsMenu() {
    //#region @backend
    if (this.project.__isContainer) {
      await this.displayProjectsSelectionMenu();
    }
    while (true) {
      UtilsTerminal.clearConsole();
      this.displayReleaseHeader();
      const choices = CoreModels.ReleaseArtifactsArr.reduce((acc, curr) => {
        return _.merge(acc, {
          [curr]: {
            name: `${_.upperFirst(_.startCase(curr))} release`,
            action: async () => {
              await this.startRelease({
                processType: this.releaseProcessType,
                automaticRelease: false,
              });
            },
          },
        });
      }, {});

      const { selected } = await UtilsTerminal.multiselectActionAndExecute(
        choices,
        {
          autocomplete: false,
          question:
            `Select release artifacts for this ` +
            `${
              this.project.__isContainer
                ? `container's ${this.selectedProjects.length} projects`
                : 'standalone project'
            } ?`,
        },
      );
      if (!selected || selected.length === 0) {
        return;
      }
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
