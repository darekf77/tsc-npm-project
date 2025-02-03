//#region imports
//#region @backend
import { Helpers, translate } from 'tnp-helpers/src';
//#endregion
import { BaseReleaseProcess } from 'tnp-helpers/src';
import { Project } from '../project';
import { chalk, CoreModels, UtilsTerminal, _ } from 'tnp-core/src';
//#endregion

/**
 * manage standalone or container release process
 */
export class ReleaseProcess extends BaseReleaseProcess<
  Project,
  CoreModels.ReleaseProcessType
> {
  //#region fields & getters
  project: Project;

  /**
   * when standalone only one project is selected
   * when container multiple projects can be selected (all or some)
   * container itself is also a project but:
   *  - only has release commits
   *  - keeps version for organization packages
   */
  protected readonly selectedProjects: Project[] = [this.project];
  protected readonly releaseArtifactsTaon: CoreModels.ReleaseArtifactTaon[] =
    [];

  get isLocalTaonArtifactRelease() {
    return this.releaseProcessType === 'local';
  }
  //#endregion

  //#region constructor
  constructor(
    project: Project,
    protected releaseProcessType: CoreModels.ReleaseProcessType,
  ) {
    super(project);
  }
  //#endregion

  //#region display release process menu
  public async displayReleaseProcessMenu() {
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
      console.info(this.getReleaseHeader());
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
        this.selectedProjects.unshift(...this.project.children);
        return;
      }

      const selectedLocations = await UtilsTerminal.multiselect({
        choices,
        question: `Select projects to release in ${this.project.genericName} container ?`,
      });
      if (selectedLocations.length > 0) {
        this.selectedProjects.unshift(
          ...selectedLocations.map(location => Project.ins.From(location)),
        );
        return;
      }
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
      console.info(this.getReleaseHeader());
      const choices = (
        this.releaseProcessType === 'local'
          ? CoreModels.LocalReleaseArtifactTaonNamesArr
          : CoreModels.ReleaseArtifactTaonNamesArr
      ).reduce((acc, curr) => {
        return _.merge(acc, {
          [curr]: {
            name: `${_.upperFirst(_.startCase(curr))} release`,
          },
        });
      }, {}) as {
        [key in CoreModels.ReleaseArtifactTaon]: { name: string };
      };

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
      this.releaseArtifactsTaon.push(...selected);
      break;
    }
    await this.releaseArtifacts();
    //#endregion
  }
  //#endregion

  //#region public methods

  //#region public methods / start release
  startRelease(
    options?: Partial<
      BaseReleaseProcess<Project, CoreModels.ReleaseArtifactTaon>
    >,
  ): Promise<void> {
    // new ArtifactRelease(this.project);
    throw new Error('Method not implemented.');
    // TOOD @LAST
  }
  //#endregion

  //#endregion

  //#region private methods

  //#region private methods / release artifacts for each project
  async releaseArtifacts() {
    //#region @backend
    for (const project of this.selectedProjects) {
      for (const releaseArtifact of this.releaseArtifactsTaon) {
        await this.startRelease({
          project,
          releaseArtifactName: releaseArtifact,
        });
      }
    }
    await this.pushContainerReleaseCommit();
    //#endregion
  }
  //#endregion

  //#region private methods / push container release commit
  /**
   * does not matter if container is releasing standalone
   * or organization packages -> release commit is pushed
   */
  private async pushContainerReleaseCommit() {
    //#region @backend
    throw new Error('Method not implemented.');
    //#endregion
  }
  //#endregion

  //#region private methods / get release header
  private getReleaseHeader(): string {
    if (this.project.__isContainer) {
      return (
        `

          ${this.getColoredTextItem(this.releaseProcessType)}` +
        ` release of ${this.selectedProjects.length} ` +
        `projects inside ${chalk.bold(this.project.genericName)}

          `
      );
    } else {
      return (
        `

            ${this.getColoredTextItem(this.releaseProcessType)}` +
        ` release of ${chalk.bold(this.project.genericName)}

            `
      );
    }
  }
  //#endregion

  //#region private methods / get colored text item
  private getColoredTextItem(
    releaseProcessType: CoreModels.ReleaseProcessType,
  ) {
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

  //#endregion
}
