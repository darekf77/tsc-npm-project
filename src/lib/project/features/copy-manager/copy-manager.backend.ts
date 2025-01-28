import { Project } from '../../abstract/project';
import { BaseCopyManger } from './base-copy-manager.backend';
import { CopyMangerHelpers } from './copy-manager-helpers.backend';
import type { CopyManagerOrganization } from './copy-manager-organization.backend';
import type { CopyManagerStandalone } from './copy-manager-standalone.backend';
import { BuildOptions } from '../../../options';

export abstract class CopyManager extends BaseCopyManger {
  //#region static
  static for(project: Project): CopyManager {
    if (project.__isSmartContainer) {
      const CopyManagerOrganizationClass =
        require('./copy-manager-organization.backend')
          .CopyManagerOrganization as typeof CopyManagerOrganization;
      return new CopyManagerOrganizationClass(project);
    } else {
      const CopyManagerStandaloneClass =
        require('./copy-manager-standalone.backend')
          .CopyManagerStandalone as typeof CopyManagerStandalone;
      return new CopyManagerStandaloneClass(project);
    }
  }
  //#endregion
  abstract init(
    buildOptions: BuildOptions,
    renameDestinationFolder?: string,
  ): void;
}
