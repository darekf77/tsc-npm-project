//#region @backend
import { crossPlatformPath, path, _, CoreModels } from 'tnp-core/src';
//#endregion
import { config } from 'tnp-config/src';

import { Helpers } from 'tnp-helpers/src';
import { BaseFeatureForProject } from 'tnp-helpers/src';
import { Project } from '../../abstract/project';
import { InsideStructureData } from './inside-struct';
import { InsideStructAngular13App, InsideStructAngular13Lib } from './structs';
import { BaseInsideStruct } from './structs/base-inside-struct';
import { InitOptions } from '../../../options';

export class InsideStructures extends BaseFeatureForProject<Project> {
  //#region field & getters
  private insideStructAngular13AppNormal: InsideStructAngular13App;
  private insideStructAngular13LibNormal: InsideStructAngular13Lib;
  private insideStructAngular13AppWebsql: InsideStructAngular13App;
  private insideStructAngular13LibWebsql: InsideStructAngular13Lib;

  //#endregion

  constructor(project: Project) {
    super(project);
  }

  //#region api

  //#region api / recreate
  public async recrate(initOptions: InitOptions) {
    initOptions = InitOptions.from(initOptions);

    this.insideStructAngular13AppNormal = new InsideStructAngular13App(
      this.project,
      initOptions.clone({ websql: false }),
    );
    this.insideStructAngular13LibNormal = new InsideStructAngular13Lib(
      this.project,
      initOptions.clone({ websql: false }),
    );
    this.insideStructAngular13AppWebsql = new InsideStructAngular13App(
      this.project,
      initOptions.clone({ websql: true }),
    );
    this.insideStructAngular13LibWebsql = new InsideStructAngular13Lib(
      this.project,
      initOptions.clone({ websql: true }),
    );

    const structs: BaseInsideStruct[] = [
      this.insideStructAngular13AppNormal,
      this.insideStructAngular13LibNormal,
      this.insideStructAngular13AppWebsql,
      this.insideStructAngular13LibWebsql,
    ];

    for (let index = 0; index < structs.length; index++) {
      const insideStruct = structs[index];

      if (!insideStruct) {
        continue;
      }

      const opt: InsideStructureData = {};

      const replacement = pathOrg => {
        const replacedPart = insideStruct.struct.pathReplacements.reduce(
          (a, b) => {
            return pathOrg.replace(b[0], b[1](opt));
          },
          pathOrg,
        );
        return replacedPart;
      };

      opt.replacement = replacement;

      //#region copying files
      if (insideStruct?.struct?.relateivePathesFromContainer) {
        [...insideStruct.struct.relateivePathesFromContainer].forEach(f => {
          const orgPath = crossPlatformPath(
            Helpers.resolve(
              path.join(insideStruct.struct.coreContainer.location, f),
            ),
          );
          const destPath = clearUnexistedLinks(
            crossPlatformPath([this.project.location, replacement(f)]),
          );

          if (orgPath !== destPath) {
            if (Helpers.isFolder(orgPath)) {
              Helpers.copy(orgPath, destPath);
            } else {
              Helpers.copyFile(orgPath, destPath);
            }
          } else {
            Helpers.warn(`${config.frameworkName} [initAngularAppStructure] trying to copy same thing:
              ${orgPath}
              `);
          }
        });
      }

      //#endregion

      //#region linking node_modules
      if (insideStruct?.struct?.linkNodeModulesTo && !initOptions.struct) {
        for (
          let index = 0;
          index < insideStruct.struct.linkNodeModulesTo.length;
          index++
        ) {
          const f = insideStruct.struct.linkNodeModulesTo[index];
          const destPath = crossPlatformPath([
            this.project.location,
            replacement(f),
          ]);
          this.project.__node_modules.linkTo(destPath);
        }
      }
      //#endregion

      //#region linking files and folders
      if (insideStruct?.struct?.linksFuncs) {
        for (
          let index = 0;
          index < insideStruct.struct.linksFuncs.length;
          index++
        ) {
          const [fun1, fun2] = insideStruct.struct.linksFuncs[index];
          let from = fun1(opt);
          from = crossPlatformPath([this.project.location, replacement(from)]);

          let to = fun2(opt);
          to = crossPlatformPath([this.project.location, replacement(to)]);
          if (!to || !from || to === from) {
            continue;
          }
          // console.log({
          //   from,
          //   to
          // })
          Helpers.remove(to);
          Helpers.createSymLink(from, to, {
            continueWhenExistedFolderDoesntExists: true,
          });
        }
      }
      //#endregion

      //#region execute end function
      if (_.isFunction(insideStruct?.struct?.endAction)) {
        await Helpers.runSyncOrAsync({
          functionFn: insideStruct.struct.endAction,
          arrayOfParams: [opt],
        });
      }
      //#endregion
    }
  }
  //#endregion

  //#endregion
}

function clearUnexistedLinks(pathToClear: string) {
  pathToClear = crossPlatformPath(pathToClear) || '';
  const orgPath = pathToClear;
  const splited = pathToClear.split('/');
  let previous: string;
  do {
    splited.pop();
    var pathDir = splited.join('/');
    if (pathDir === previous) {
      return orgPath;
    }
    if (Helpers.isUnexistedLink(pathDir)) {
      Helpers.removeFileIfExists(pathDir);
      return orgPath;
    }
    previous = pathDir;
  } while (!!pathDir);
  return orgPath;
}
