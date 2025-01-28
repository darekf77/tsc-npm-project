//#region imports
import { config, PREFIXES } from 'tnp-config/src';
import { crossPlatformPath, fse, path, _ } from 'tnp-core/src';
import { BuildOptions } from '../../../../options';
import type { Project } from '../../../abstract/project';
import { BrowserCodeCut } from './browser-code-cut.backend';
import { extAllowedToReplace } from 'tnp-config/src';
import { ReplaceOptionsExtended } from 'isomorphic-region-loader/src';
//#endregion

export class CodeCut {
  //#region constructor
  constructor(
    /**
     * absoulte path ex: <project-path>/tmp-src-dist
     */
    protected absPathTmpSrcDistFolder: string,
    protected options: ReplaceOptionsExtended,
    /**
     * it may be not available for global, for all compilatoin
     */
    private project: Project,
    /**
     * same as project for standalone isomorphic-lib
     * @deprecated
     */
    private compilationProject: Project,
    private buildOptions: BuildOptions,
    public sourceOutBrowser: string,
  ) {}
  //#endregion

  //#region methods

  private isAllowedPathForSave(relativePath: string) {
    // console.log({ relativePath })
    return (
      path.basename(relativePath).search(PREFIXES.BASELINE) === -1 &&
      path.basename(relativePath).search(PREFIXES.DELETED) === -1 &&
      !relativePath.replace(/^\\/, '').startsWith(`tests/`)
    );
  }

  /**
   * ex: assets/file.png or my-app/component.ts
   */
  files(relativeFilesToProcess: string[], remove: boolean = false) {
    for (let index = 0; index < relativeFilesToProcess.length; index++) {
      const relativeFilePath = relativeFilesToProcess[index];
      // console.log(`CUT: ${relativeFilePath}`)
      this.file(relativeFilePath, remove);
    }
  }

  file(relativePathToFile: string, remove: boolean = false) {
    if (!this.isAllowedPathForSave(relativePathToFile)) {
      return;
    }

    const absSourceFromSrc = crossPlatformPath([
      path.dirname(this.absPathTmpSrcDistFolder),
      config.folder.src,
      relativePathToFile,
    ]);

    const absolutePathToFile = crossPlatformPath([
      this.absPathTmpSrcDistFolder,
      relativePathToFile,
    ]);

    // if (absSourceFromSrc.endsWith('/file.ts')) {
    //   debugger
    // }

    if (!extAllowedToReplace.includes(path.extname(relativePathToFile))) {
      return new BrowserCodeCut(
        absSourceFromSrc,
        absolutePathToFile,
        this.absPathTmpSrcDistFolder,
        this.project,
        this.buildOptions,
      ).processFile({
        isCuttableFile: false,
        fileRemovedEvent: remove,
        regionReplaceOptions: this.options,
      });
    }

    return new BrowserCodeCut(
      absSourceFromSrc,
      absolutePathToFile,
      this.absPathTmpSrcDistFolder,
      this.project,
      this.buildOptions,
    ).processFile({
      isCuttableFile: true,
      fileRemovedEvent: remove,
      regionReplaceOptions: this.options,
    });
  }

  //#endregion
}
