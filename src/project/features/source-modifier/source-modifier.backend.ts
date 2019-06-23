//#region imports
import * as _ from 'lodash';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as glob from 'glob';

import config from '../../../config';
import { IncrementalBuildProcessExtended } from '../build-isomorphic-lib/incremental-build-process';
import { FeatureCompilerForProject, Project } from '../../abstract';
import { LibType, SourceFolder } from '../../../models';
import { TsUsage } from 'morphi/build';
import { error, escapeStringForRegEx, log, warn } from '../../../helpers';
import { replace } from './replace';
import { take } from 'rxjs/operator/take';
import { ModType, SourceCodeType } from './source-code-type';
import { SourceModForStandaloneProjects } from './source-mod-for-standalone-projects.backend';
import { SourceModForWorkspaceChilds } from './source-mod-for-worspace-childs.backend';
//#endregion

const debugFiles = [
  // 'components/index.ts',
];

export class SourceModifier extends FeatureCompilerForProject {

  //#region get source type lib - for libs, app - for clients
  private static getModType(project: Project, relativePath: string): ModType {
    const startFolder: SourceFolder = _.first(relativePath.replace(/^\//, '').split('/')) as SourceFolder;
    if (startFolder === 'src') {
      return project.type === 'isomorphic-lib' ? 'lib' : 'app';
    }
    if (project.type === 'angular-lib' && startFolder === 'components') {
      return 'lib';
    }
    if (project.isSite && startFolder === 'custom') {
      return `custom/${this.getModType(project, relativePath.replace(`${startFolder}/`, '') as any)}` as any;
    }
  }
  //#endregion

  //#region fix double apostrophes in imports,export, requires
  private static fixDoubleApostophe(input: string) {
    const regex = /(import|export|require\(|\}\sfrom\s(\"|\')).+(\"|\')/g;
    const matches = input.match(regex);
    if (_.isArray(matches)) {
      matches.forEach(m => {
        input = input.replace(m, m.replace(/\"/g, `'`));
      });
    }
    return input;
  }
  //#endregion

  public static PreventNotUseOfTsSourceFolders(project: Project, relativePath: string, input?: string, asyncCall = false): string {

    relativePath = relativePath.replace(/^\//, '');
    // asyncCall && console.log(`MOD: "${relativePath}"`)
    const debugging = debugFiles.includes(relativePath);
    const saveMode = _.isUndefined(input);
    const modType = this.getModType(project, relativePath);
    const filePath = path.join(project.location, relativePath);
    if (saveMode) {
      input = fse.readFileSync(filePath, {
        encoding: 'utf8'
      });
    }
    input = this.fixDoubleApostophe(input);
    input = project.sourceModifier.sourceMod.process(input, modType);

    if (saveMode) {
      fse.writeFileSync(filePath, input, {
        encoding: 'utf8'
      });
    }
    return input;
  }

  //#region folder patterns fn
  private get foldersPattern() {
    return folderPattern(this.project);
  }
  //#endregion

  //#region constructor
  sourceMod: SourceModForWorkspaceChilds;
  constructor(public project: Project) {
    super(project.isSite ? void 0 : folderPattern(project), '', project && project.location, project);
    this.sourceMod = new SourceModForWorkspaceChilds(project);
  }
  //#endregion

  //#region SYNC ACTION
  syncAction(): void {
    const files = glob.sync(this.foldersPattern, { cwd: this.project.location });
    // console.log(files)
    files.forEach(f => {
      SourceModifier.PreventNotUseOfTsSourceFolders(this.project, f)
    });
  }
  //#endregion

  //#region PRE ASYNC ACTION
  preAsyncAction(): void {
    // throw new Error("Method not implemented.");
  }
  //#endregion

  //#region ASYNC ACTION
  public lastChangedAsyncFileS: string[] = [];
  asyncAction(filePath: string) {
    const that = this;

    // console.log('SOurce modifier async !', filePath)
    const f = filePath.replace(this.project.location, '').replace(/^\//, '');
    if (this.project.sourceFilesToIgnore().includes(f)) {
      return;
    }
    if (this.lastChangedAsyncFileS.includes(filePath)) {
      // console.log('dont perform action on ', filePath)
      return;
    }

    if (fse.existsSync(filePath)) {
      this.lastChangedAsyncFileS.push(filePath);
      log(`[sourcemodifier] File fix: ${f}`)
      SourceModifier.PreventNotUseOfTsSourceFolders(this.project, f, void 0, true);
      ((filePathAA) => {
        setTimeout(() => {
          this.lastChangedAsyncFileS = this.lastChangedAsyncFileS.filter(fileAlread => fileAlread !== filePathAA);
        }, 1000);
      })(filePath);
    }
  }
  //#endregion

}


function folderPattern(project: Project) {
  return `${
    project.isSite ? config.folder.custom : `{${[config.folder.src, config.folder.components].join(',')}}`
    }/**/*.ts`
}
