//#region imports
//#region @backend
import { Helpers, translate } from 'tnp-helpers/src';
//#endregion
import { BaseReleaseProcess } from 'tnp-helpers/src';
import { Project } from '../project';
import { chalk, CoreModels, UtilsTerminal } from 'tnp-core/src';
import { config } from 'tnp-config/src';
import { ReleaseProcess } from './release-process';
//#endregion

export class ReleaseProcessManual extends ReleaseProcess {
  project: Project;

  //#region display release process menu
  async displayReleaseProcessMenu() {
    //#region @backend
    while (true) {
      UtilsTerminal.clearConsole();
      const isContainer = this.project.__isContainer;
      console.info(`
        Manual Release

        CLI:
        - global cli tool is usable/available after: npm i -g my-cli-name
        - minified/standalone version has whole node_modules inside

        `);
      await UtilsTerminal.multiselect({
        question: 'Choose release options',
        choices: {
          npm: {
            name: 'Release npm lib and cli tool',
          },
          app: {
            name: 'Release angular app with backend',
          },
          vscode: {
            name: 'Release vscode extension',
          },
          electron: {
            name: 'Release electron app',
          },
          mobile: {
            name: 'Release electron app',
          },
        },
      });
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
