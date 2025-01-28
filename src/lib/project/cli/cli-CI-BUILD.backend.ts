//#region @backend
import { _ } from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';
import { BaseCommandLineFeature } from 'tnp-helpers/src';
import { Project } from '../abstract/project';
import { BuildOptions } from '../../options';
import { TEMP_DOCS } from '../../constants';
import { config } from 'tnp-config/src';

class $CiBuild extends BaseCommandLineFeature<BuildOptions, Project> {
  protected async __initialize__() {
    this.params = BuildOptions.from(this.params);
    await this.project.recreateReleaseProject(this.params);
  }

  public async _() {
    Helpers.error(
      `
    Please select proper command

    ${config.frameworkName} ci:build
    ${config.frameworkName} ci:build --env
    ${config.frameworkName} ci:start
    ${config.frameworkName} ci:start --port
    ${config.frameworkName} ci:start --domain

    `,
      false,
      true,
    );
  }

  async build(prod = false) {
    await this.project.releaseCiProject.build(
      BuildOptions.from({
        prod,
        finishCallback: () => this._exit(),
      }),
    );
    this._exit();
  }

  async buildWatch(prod = false) {
    await this.project.releaseCiProject.build(
      BuildOptions.from({
        prod,
        watch: true,
      }),
    );
    this._exit();
  }

  async buildProd() {
    await this.build(true);
  }
}

export default {
  $CiBuild: Helpers.CLIWRAP($CiBuild, '$CiBuild'),
};
//#endregion
