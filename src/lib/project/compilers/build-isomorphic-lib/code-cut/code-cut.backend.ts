//#region imports
import { config } from "tnp-config";
import { crossPlatformPath, fse, path, _ } from "tnp-core";
import { BuildOptions } from "tnp-db";
import { PREFIXES, Helpers } from "tnp-helpers";
import { Models } from "tnp-models";
import type { Project } from "../../../abstract/project/project";
import type { BroswerCompilation } from "../compilations/compilation-browser.backend";
import { BrowserCodeCut } from "./browser-code-cut.backend";
//#endregion

export class CodeCut {

  //#region fields
  readonly browserCodeCut: BrowserCodeCut;
  //#endregion

  //#region constructor
  constructor(
    /**
     * absoulte path ex: <project-path>/tmp-src-dist
     */
    protected absPathTmpSrcDistBundleFolder: string,
    protected options: Models.dev.ReplaceOptionsExtended,
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

  ) {

  }
  //#endregion

  //#region methods

  private isAllowedPathForSave(relativePath: string) {
    return (path.basename(relativePath).search(PREFIXES.BASELINE) === -1) &&
      (path.basename(relativePath).search(PREFIXES.DELETED) === -1) &&
      !relativePath.replace(/^\\/, '').startsWith(`tmp-src-dist/tests/`) &&
      !relativePath.replace(/^\\/, '').startsWith(`tmp-src-bundle/tests/`) &&
      !relativePath.replace(/^\\/, '').startsWith(`tmp-src-dist-websql/tests/`) &&
      !relativePath.replace(/^\\/, '').startsWith(`tmp-src-bundle-websql/tests/`);
  }

  /**
   * ex: assets/file.png or my-app/component.ts
   */
  files(relativeFilesToProcess: string[], remove: boolean = false) {
    // console.log('options in fiels', this.options)
    for (let index = 0; index < relativeFilesToProcess.length; index++) {
      const relativeFilePath = relativeFilesToProcess[index];
      this.file(relativeFilePath, remove);
    }
  }

  file(relativePathToFile: string, remove: boolean = false) {
    if (!this.isAllowedPathForSave(relativePathToFile)) {
      return;
    }

    const absSourceFromSrc = crossPlatformPath(path.join(
      path.dirname(this.absPathTmpSrcDistBundleFolder),
      config.folder.src,
      relativePathToFile,
    ));

    const absolutePathToFile = crossPlatformPath(path.join(
      this.absPathTmpSrcDistBundleFolder,
      relativePathToFile,
    ));

    if (!BrowserCodeCut.extAllowedToReplace.includes(path.extname(relativePathToFile))) {

      return (new BrowserCodeCut(
        absSourceFromSrc,
        absolutePathToFile,
        this.absPathTmpSrcDistBundleFolder,
        this.project,
        this.buildOptions,
      )).initAndSave(remove);
    }

    return (new BrowserCodeCut(
      absSourceFromSrc,
      absolutePathToFile,
      this.absPathTmpSrcDistBundleFolder,
      this.project,
      this.buildOptions,
    ))
      .init()
      .REPLACERegionsForIsomorphicLib(_.cloneDeep(this.options) as any)
      .FLATTypescriptImportExport('export')
      .FLATTypescriptImportExport('import')
      .REPLACERegionsFromTsImportExport('export')
      .REPLACERegionsFromTsImportExport('import')
      .REPLACERegionsFromJSrequire()
      .save();
  }

  //#endregion
}

