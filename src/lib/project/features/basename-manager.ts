import { BaseFeatureForProject, Helpers } from 'tnp-helpers/src';
import type { Project } from '../abstract/project';
import { InitOptions } from '../../../lib/options';

/**
 * Base href can be:
 *
 * '' - for electron release build ( / - doesn't work in file system)
 * '/' - root
 * '/my-base-href/'
 *
 */
export class AngularFeBasenameManager extends BaseFeatureForProject<Project> {
  public readonly rootBaseHref: string = '/';
  private get baseHrefForGhPages() {
    return this.project.__isSmartContainerTarget
      ? this.project.__smartContainerTargetParentContainer.name
      : this.project.name;
  }

  private resolveBaseHrefForProj(overrideBaseHref: string) {
    //#region @backendFunc
    let baseHref = this.rootBaseHref;
    const isSmartContainerTargetNonClient =
      this.project.__isSmartContainerTargetNonClient;

    if (overrideBaseHref === '') {
      if (isSmartContainerTargetNonClient) {
        baseHref = `./-/${this.project.name}/`;
      } else {
        baseHref = overrideBaseHref;
      }
    } else {
      if (overrideBaseHref) {
        if (isSmartContainerTargetNonClient) {
          baseHref = `${overrideBaseHref}-/${this.project.name}/`;
        } else {
          baseHref = overrideBaseHref;
        }
      } else {
        if (this.project.isInCiReleaseProject) {
          if (this.project.__env.config?.useDomain) {
            baseHref = this.rootBaseHref;
          } else {
            baseHref = `/${this.baseHrefForGhPages}/`;
            if (isSmartContainerTargetNonClient) {
              baseHref = `/${this.baseHrefForGhPages}/-/${this.project.name}/`;
            }
          }
        }
      }
    }

    return baseHref;
    //#endregion
  }

  getBaseHref(initOptions: InitOptions) {
    //#region @backendFunc
    let baseHref = this.resolveBaseHrefForProj(initOptions.baseHref);

    // baseHref = baseHref.endsWith('/') ? baseHref : (baseHref + '/');
    // baseHref = baseHref.startsWith('/') ? baseHref : ('/' + baseHref);
    baseHref = baseHref.replace(/\/\//g, '/');
    return baseHref;
    //#endregion
  }

  replaceBaseHrefInFile(fileAbsPath: string, initOptions: InitOptions) {
    //#region @backendFunc
    let fileContent = Helpers.readFile(fileAbsPath);
    const frontendBaseHref =
      this.project.angularFeBasenameManager.getBaseHref(initOptions);
    fileContent = fileContent.replace(
      '<<<TO_REPLACE_BASENAME>>>',
      frontendBaseHref,
    );
    Helpers.writeFile(fileAbsPath, fileContent);
    //#endregion
  }
}
