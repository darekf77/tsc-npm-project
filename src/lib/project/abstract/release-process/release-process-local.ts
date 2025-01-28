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

export class ReleaseProcessLocal extends ReleaseProcess {
  project: Project;

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
