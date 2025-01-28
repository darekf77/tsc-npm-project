//#region @backend
import { CoreModels, _, crossPlatformPath, os, path } from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';
import { BaseCommandLineFeature } from 'tnp-helpers/src';
import { Project } from '../abstract/project';
import { BuildOptions, InitOptions } from '../../options';
import { MESSAGES, TEMP_DOCS } from '../../constants';
import { config } from 'tnp-config/src';
import { UtilsTerminal } from 'tnp-core/src';
import { chalk } from 'tnp-core/src';

export class $Vscode extends BaseCommandLineFeature<{}, Project> {
  public async _() {
    // let lastAction: any;
    try {
      while (true) {
        UtilsTerminal.clearConsole();
        await UtilsTerminal.selectActionAndExecute(
          {
            firstLine: {
              name: chalk.gray.bold(
                'Please select Up/Down action or CTRL+C to exit',
              ),
            },
            global: {
              name: 'Apply global settings',
              action: async () => {
                await this.project.vsCodeHelpers.applyProperGlobalSettings();
                await UtilsTerminal.pressAnyKeyToContinueAsync();
              },
            },
            listInstalledExtensions: {
              name: 'List installed extensions',
              action: async () => {
                UtilsTerminal.clearConsole();
                await UtilsTerminal.previewLongList(
                  this.project.vsCodeHelpers.installedExtensions,
                  'List of installed extensions',
                );
                // UtilsTerminal.pressAnyKey();
              },
            },
            installExtensions: {
              name: 'Install all recommended extensions',
              action: async () => {
                // UtilsTerminal.clearConsole();
                await this.project.vsCodeHelpers.installExtensions();
              },
            },
            initLocalSettings: {
              name: 'Init local settings',
              action: async () => {
                await this.INIT();
              },
            },
          },
          {
            autocomplete: false,
          },
        );
        // lastAction = res.selected !== 'firstLine';
      }
    } catch (error) {
      error && console.error('error', error);
      this._exit();
    }
  }

  //#region global
  GLOBAL() {
    this.project.vsCodeHelpers.applyProperGlobalSettings();
    this._exit();
  }
  //#endregion

  TEMP_SHOW() {
    this._showfilesfor(Project.ins.Current);
    this._exit();
  }

  TEMP_HIDE() {
    this._hidefilesfor(this.project);
    this._exit();
  }

  INIT() {
    this.project.__recreate.vscode.settings.hideOrShowFilesInVscode();
    this._exit();
  }

  _showfilesfor(project: Project) {
    project.__recreate.vscode.settings.hideOrShowFilesInVscode(false);
  }

  _hidefilesfor(project: Project) {
    project.__recreate.vscode.settings.hideOrShowFilesInVscode(true);
  }
}

export default {
  $Vscode: Helpers.CLIWRAP($Vscode, '$Vscode'),
};
