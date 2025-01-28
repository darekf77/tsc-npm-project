//#region imports
import {
  _,
  path,
  fse,
  crossPlatformPath,
  CoreModels,
  chalk,
} from 'tnp-core/src';

import {
  config,
  extAllowedToReplace,
  frontEndOnly,
  TAGS,
} from 'tnp-config/src';
import { Helpers } from 'tnp-helpers/src';
import type { Project } from '../../../abstract/project';
import { BuildOptions, InitOptions } from '../../../../options';
import { Models } from '../../../../models';
import { RegionRemover } from 'isomorphic-region-loader/src';
import { MjsModule } from '../../../features/copy-manager/mjs-fesm-module-spliter.backend';
import {
  labelReplacementCode,
  ReplaceOptionsExtended,
} from 'isomorphic-region-loader/src';
import { SplitFileProcess } from './file-split-process';
import { TO_REMOVE_TAG } from '../../../../constants';

//#endregion

//#region consts
const regexAsyncImport =
  /\ import\((\`|\'|\")([a-zA-Z|\-|\@|\/|\.]+)(\`|\'|\")\)/;
const regexAsyncImportG =
  /\ import\((\`|\'|\")([a-zA-Z|\-|\@|\/|\.]+)(\`|\'|\")\)/g;

const debugFiles = [
  // 'taon-cms.models.ts'
  // 'app.ts'
];

export type InlinePkg = {
  isIsomorphic: boolean;
  realName: string;
};

/**
 * Allow imports or exports with '/src' at tthe end
 *
 * import { ProcessController, Process } from '@codete-ngrx-quick-start/shared/src';
 * loadChildren: () => import(`@codete-ngrx-quick-start/realtime-process/src`)
 *
 * to be changed into:
 *
 * import { ProcessController, Process } from '@codete-ngrx-quick-start/shared/src';
 * loadChildren: () => import(`@codete-ngrx-quick-start/realtime-process/src`)
 *
 */

//#endregion

export class BrowserCodeCut {
  //#region fields
  readonly isAssetsFile: boolean = false;
  protected absFileSourcePathBrowserOrWebsqlAPPONLY: string;
  private rawContentForBrowser: string;
  private rawContentForAPPONLYBrowser: string;
  private rawContentBackend: string;
  private splitFileProcess: SplitFileProcess;
  /**
   * ex. path/to/file-somewhere.ts or assets/something/here
   * in src or tmp-src-dist etc.
   */
  private readonly relativePath: string;
  private readonly isWebsqlMode: boolean;
  private readonly absoluteBackendDestFilePath: string;

  //#endregion

  //#region constructor
  constructor(
    /**
     * ex.< project location >/src/something.ts
     */
    protected absSourcePathFromSrc: string,
    /**
     * ex. < project location >/tmp-src-dist-websql/my/relative/path.ts
     */
    protected absFileSourcePathBrowserOrWebsql: string,
    /**
     * ex. < project location >/tmp-src-dist-websql
     */
    protected absPathTmpSrcDistFolder: string,
    private project: Project,
    private buildOptions: BuildOptions,
  ) {
    // console.log(`[incremental-build-process INSIDE BROWSER!!! '${this.buildOptions.baseHref}'`)

    this.absPathTmpSrcDistFolder = crossPlatformPath(absPathTmpSrcDistFolder);
    this.absFileSourcePathBrowserOrWebsql = crossPlatformPath(
      absFileSourcePathBrowserOrWebsql,
    );
    this.absFileSourcePathBrowserOrWebsqlAPPONLY =
      this.absFileSourcePathBrowserOrWebsql.replace(
        `tmp-src-${buildOptions.outDir}${buildOptions.websql ? '-websql' : ''}`,
        `tmp-src-app-${buildOptions.outDir}${
          buildOptions.websql ? '-websql' : ''
        }`,
      ); // for slighted modifed app release dist

    this.absSourcePathFromSrc = crossPlatformPath(absSourcePathFromSrc);

    // console.log('absSourcePathFromSrc:', absSourcePathFromSrc)
    // if (absSourcePathFromSrc.endsWith('/file.ts')) {
    //   debugger
    // }

    if (project.__isStandaloneProject) {
      if (
        absSourcePathFromSrc
          .replace(crossPlatformPath([project.location, config.folder.src]), '')
          .startsWith('/assets/')
      ) {
        this.isAssetsFile = true;
      }
    }

    this.relativePath = crossPlatformPath(
      this.absFileSourcePathBrowserOrWebsql,
    ).replace(`${this.absPathTmpSrcDistFolder}/`, '');

    this.absoluteBackendDestFilePath = crossPlatformPath(
      path.join(
        this.absPathTmpSrcDistFolder.replace('tmp-src', 'tmp-source'),
        this.relativePath, // .replace('-websql', '') // backend is ONE
      ),
    );

    // console.log('RELATIVE ', this.relativePath)

    this.isWebsqlMode = this.relativePath.startsWith(
      `tmp-src-${config.folder.dist}-${config.folder.websql}`,
    );
  }
  //#endregion

  processFile({
    fileRemovedEvent,
    regionReplaceOptions,
    isCuttableFile,
  }: {
    fileRemovedEvent?: boolean;
    isCuttableFile: boolean;
    regionReplaceOptions: ReplaceOptionsExtended;
  }) {
    if (isCuttableFile) {
      this.initAndSaveCuttableFile(regionReplaceOptions);
    } else {
      this.initAndSaveAssetFile(fileRemovedEvent);
    }
  }

  //#region private / methods & getters / init and save cuttabl file
  private initAndSaveCuttableFile(options: ReplaceOptionsExtended) {
    return this.init()
      .REPLACERegionsForIsomorphicLib(_.cloneDeep(options) as any)
      .FLATTypescriptImportExport('export')
      .FLATTypescriptImportExport('import')
      .REPLACERegionsFromTsImportExport('export')
      .REPLACERegionsFromTsImportExport('import')
      .REPLACERegionsFromJSrequire()
      .save();
  }
  //#endregion

  //#region private / methods & getters / init and save
  private initAndSaveAssetFile(remove = false) {
    if (remove) {
      Helpers.removeIfExists(
        this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsql),
      );
      Helpers.removeIfExists(
        this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsqlAPPONLY),
      );
      Helpers.removeIfExists(
        this.replaceAssetsPath(this.absoluteBackendDestFilePath),
      );
    } else {
      // this is needed for json in src/lib or something
      const realAbsSourcePathFromSrc = fse.realpathSync(
        this.absSourcePathFromSrc,
      );
      if (
        !Helpers.exists(realAbsSourcePathFromSrc) ||
        Helpers.isFolder(realAbsSourcePathFromSrc)
      ) {
        return;
      }

      try {
        Helpers.copyFile(
          this.absSourcePathFromSrc,
          this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsql),
        );
        Helpers.copyFile(
          this.absSourcePathFromSrc,
          this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsqlAPPONLY),
        );
        // final straight copy to tmp-source-folder
        Helpers.copyFile(
          this.absSourcePathFromSrc,
          this.replaceAssetsPath(this.absoluteBackendDestFilePath),
        );
      } catch (error) {
        Helpers.warn(
          `[taon][browser-code-cut] file not found ${this.absSourcePathFromSrc}`,
        );
      }
    }
  }
  //#endregion

  //#region private / methods & getters / init

  private init() {
    const orgContent =
      Helpers.readFile(this.absSourcePathFromSrc, void 0, true) || '';

    this.splitFileProcess = new SplitFileProcess(
      orgContent,
      this.absSourcePathFromSrc,
      this.project.allIsomorphicPackagesFromMemory,
    );
    const { modifiedContent: firstPass, rewriteFile: firstTimeRewriteFile } =
      this.splitFileProcess.content;

    const { modifiedContent: secondPass, rewriteFile: secondTimeRewriteFile } =
      new SplitFileProcess(
        firstPass,
        this.absSourcePathFromSrc,
        this.project.allIsomorphicPackagesFromMemory,
      ).content;

    if ((orgContent || '').trim() !== (firstPass || '')?.trim()) {
      if (
        firstTimeRewriteFile &&
        (firstPass || '').trim() === (secondPass || '').trim() // it means it is stable
      ) {
        Helpers.logInfo(`Rewrite file ${this.absSourcePathFromSrc}`);
        Helpers.writeFile(this.absSourcePathFromSrc, firstPass);
      } else {
        Helpers.logWarn(
          `Unstable file modification ${this.absSourcePathFromSrc}`,
        );
      }
    }

    this.rawContentForBrowser = this.removeSrcAtEndFromImortExports(orgContent);
    this.rawContentForAPPONLYBrowser = this.rawContentForBrowser; // TODO not needed ?
    this.rawContentBackend = this.rawContentForBrowser; // at the beginning those are normal files from src
    return this;
  }

  //#endregion

  //#region private / methods & getters / is empty browser file
  private get isEmptyBrowserFile() {
    return this.rawContentForBrowser.replace(/\s/g, '').trim() === '';
  }
  //#endregion

  //#region private / methods & getters / is empty module backend file
  private get isEmptyModuleBackendFile() {
    return (
      (this.rawContentBackend || '').replace(/\/\*\ \*\//g, '').trim()
        .length === 0
    );
  }
  //#endregion

  //#region private / methods & getters / save empty file
  private saveEmptyFile(isTsFile: boolean, endOfBrowserOrWebsqlCode: string) {
    if (!fse.existsSync(path.dirname(this.absFileSourcePathBrowserOrWebsql))) {
      // write empty instead unlink
      fse.mkdirpSync(path.dirname(this.absFileSourcePathBrowserOrWebsql));
    }
    if (
      !fse.existsSync(
        path.dirname(this.absFileSourcePathBrowserOrWebsqlAPPONLY),
      )
    ) {
      // write empty instead unlink
      fse.mkdirpSync(
        path.dirname(this.absFileSourcePathBrowserOrWebsqlAPPONLY),
      );
    }
    if (isTsFile) {
      if (!this.relativePath.startsWith('app/')) {
        try {
          // QUICK_FIX remove directory when trying to save as file
          fse.removeSync(this.absFileSourcePathBrowserOrWebsql);
        } catch (error) {}
        fse.writeFileSync(
          this.absFileSourcePathBrowserOrWebsql,
          `/* files for browser${
            this.isWebsqlMode
              ? '-websql' + endOfBrowserOrWebsqlCode
              : '' + endOfBrowserOrWebsqlCode
          } mode */`,
          'utf8',
        );
      }
      try {
        // QUICK_FIX remove directory when trying to save as file
        fse.removeSync(this.absFileSourcePathBrowserOrWebsqlAPPONLY);
      } catch (error) {}
      fse.writeFileSync(
        this.absFileSourcePathBrowserOrWebsqlAPPONLY,
        `/* files for browser${
          this.isWebsqlMode
            ? '-websql' + endOfBrowserOrWebsqlCode
            : '' + endOfBrowserOrWebsqlCode
        } mode */`,
        'utf8',
      );
    } else {
      if (!this.relativePath.startsWith('app/')) {
        try {
          // QUICK_FIX remove directory when trying to save as file
          fse.removeSync(this.absFileSourcePathBrowserOrWebsql);
        } catch (error) {}
        fse.writeFileSync(this.absFileSourcePathBrowserOrWebsql, ``, 'utf8');
      }
      try {
        // QUICK_FIX remove directory when trying to save as file
        fse.removeSync(this.absFileSourcePathBrowserOrWebsqlAPPONLY);
      } catch (error) {}
      fse.writeFileSync(
        this.absFileSourcePathBrowserOrWebsqlAPPONLY,
        ``,
        'utf8',
      );
    }
  }
  //#endregion

  //#region private / methods & getters / save normal file
  private saveNormalFile(isTsFile: boolean, endOfBrowserOrWebsqlCode?: string) {
    // console.log('SAVE NORMAL FILE')
    if (this.isAssetsFile) {
      this.absFileSourcePathBrowserOrWebsql = this.replaceAssetsPath(
        this.absFileSourcePathBrowserOrWebsql,
      );
      // console.log(`ASSETE: ${this.absFileSourcePathBrowserOrWebsql}`)
    }
    if (this.isAssetsFile) {
      this.absFileSourcePathBrowserOrWebsqlAPPONLY = this.replaceAssetsPath(
        this.absFileSourcePathBrowserOrWebsqlAPPONLY,
      );
      // console.log(`ASSETE: ${this.absFileSourcePathBrowserOrWebsql}`)
    }
    if (!fse.existsSync(path.dirname(this.absFileSourcePathBrowserOrWebsql))) {
      fse.mkdirpSync(path.dirname(this.absFileSourcePathBrowserOrWebsql));
    }
    if (
      !fse.existsSync(
        path.dirname(this.absFileSourcePathBrowserOrWebsqlAPPONLY),
      )
    ) {
      fse.mkdirpSync(
        path.dirname(this.absFileSourcePathBrowserOrWebsqlAPPONLY),
      );
    }

    this.processAssetsLinksForApp();
    this.warnAboutUsingFilesFromNodeModulesWithLibFiles(
      this.rawContentForAPPONLYBrowser,
      this.absFileSourcePathBrowserOrWebsqlAPPONLY,
    );

    if (!this.isAssetsFile && this.relativePath.endsWith('.backend.ts')) {
      return;
    }

    if (isTsFile) {
      if (!this.relativePath.startsWith('app/')) {
        fse.writeFileSync(
          this.absFileSourcePathBrowserOrWebsql,
          this.changeBrowserOrWebsqlFileContentBeforeSave(
            this.rawContentForBrowser,
            endOfBrowserOrWebsqlCode,
            this.absFileSourcePathBrowserOrWebsql,
          ),
          'utf8',
        );
      }
      fse.writeFileSync(
        this.absFileSourcePathBrowserOrWebsqlAPPONLY,
        this.changeBrowserOrWebsqlFileContentBeforeSave(
          this.rawContentForAPPONLYBrowser,
          endOfBrowserOrWebsqlCode,
          this.absFileSourcePathBrowserOrWebsqlAPPONLY,
        ),
        'utf8',
      );
    } else {
      if (!this.relativePath.startsWith('app/')) {
        fse.writeFileSync(
          this.absFileSourcePathBrowserOrWebsql,
          this.rawContentForBrowser,
          'utf8',
        );
      }
      fse.writeFileSync(
        this.absFileSourcePathBrowserOrWebsqlAPPONLY,
        this.rawContentForAPPONLYBrowser,
        'utf8',
      );
    }
  }
  //#endregion

  //#region private / methods & getters / remove src from imports
  private processRegexForSrcRemove(
    regexEnd: RegExp,
    line: string,
    matchType: 'from_import_export' | 'imports' | 'require',
  ): string {
    const matches = line.match(regexEnd);
    const firstMatch = _.first(matches) as string;

    let clean: string;
    if (matchType === 'require' || matchType === 'imports') {
      const endCharacters = firstMatch.slice(-2);
      clean = firstMatch.replace('/src' + endCharacters, endCharacters);
    } else {
      let endCharacters = firstMatch.slice(-1);
      clean = firstMatch.replace('/src' + endCharacters, endCharacters);
    }

    return line.replace(firstMatch, clean);
  }
  //#endregion

  //#region private / methods & getters / remove src from imports/exports
  private removeSrcAtEndFromImortExports(content: string): string {
    const regexEnd = /from\s+(\'|\").+\/src(\'|\")/g;
    const singleLineImporrt = /import\((\'|\"|\`).+\/src(\'|\"|\`)\)/g;
    const singleLineRequire = /require\((\'|\"|\`).+\/src(\'|\"|\`)\)/g;

    const commentMultilieStart = /^\/\*/;
    const commentSingleLineStart = /^\/\//;

    return content
      .split(/\r?\n/)
      .map((line, index) => {
        const trimedLine = line.trimStart();
        if (
          commentMultilieStart.test(trimedLine) ||
          commentSingleLineStart.test(trimedLine)
        ) {
          return line;
        }
        if (regexEnd.test(line)) {
          return this.processRegexForSrcRemove(
            regexEnd,
            line,
            'from_import_export',
          );
        }
        if (singleLineImporrt.test(line)) {
          return this.processRegexForSrcRemove(
            singleLineImporrt,
            line,
            'imports',
          );
        }
        if (singleLineRequire.test(line)) {
          return this.processRegexForSrcRemove(
            singleLineRequire,
            line,
            'require',
          );
        }
        return line;
      })
      .join('\n');
  }
  //#endregion

  //#region private / methods & getters / process browser not correct imports exports
  private processBrowserNotCorrectImportsExports = (
    importOrExportLine: string,
  ) => {
    // console.log({ importOrExportLine })
    // TODO
    return importOrExportLine;
  };
  //#endregion

  //#region private / methods & getters / flat typescript import export
  private FLATTypescriptImportExport(usage: CoreModels.TsUsage) {
    if (this.isAssetsFile) {
      return this;
    }
    if (!this.relativePath.endsWith('.ts')) {
      return this;
    }
    const isExport = usage === 'export';
    const fileContent: string = this.rawContentForBrowser;
    const commentStart = new RegExp(`\\/\\*`);
    const commentEnds = new RegExp(`\\*\\/`);

    const commentEndExportOnly = new RegExp(`^(\\ )*\\}\\;?\\ *`);
    const singleLineExport = new RegExp(`^\\ *export\\ +\\{.*\\}\\;?`);

    const regexEnd = new RegExp(`from\\s+(\\'|\\").+(\\'|\\")`);
    const regextStart = new RegExp(`${usage}\\s+{`);

    let toAppendLines = 0;
    let insideComment = false;
    if (_.isString(fileContent)) {
      let appendingToNewFlatOutput = false;
      let newFlatOutput = '';
      fileContent.split(/\r?\n/).forEach((line, index) => {
        const matchSingleLineExport = isExport && singleLineExport.test(line);
        const matchCommentStart = commentStart.test(line);
        const matchCommentEnd = commentEnds.test(line);
        const matchStart = regextStart.test(line);

        const matchEndExportOnly =
          isExport &&
          commentEndExportOnly.test(line) &&
          line.replace(commentEndExportOnly, '') === '';
        const matchEnd = matchEndExportOnly || regexEnd.test(line);

        if (matchCommentStart) {
          insideComment = true;
        }
        if (insideComment && matchCommentEnd) {
          insideComment = false;
        }
        // (path.basename(this.absoluteFilePath) === 'core-imports.ts') && console.log(`${insideComment}: ${line}`)
        // isExport && (path.basename(this.absoluteFilePath) === 'core-imports.ts') && console.log(`export end: ${matchEndExportOnly}: >>>${line}<<<`)
        // console.log(`I(${regexParialUsage.test(line)}) F(${regexFrom.test(line)})\t: ${line} `)
        // (path.basename(this.absoluteFilePath) === 'core-imports.ts') && console.log(`matchSingleLineExport: ${matchSingleLineExport}: >>>${line}<<<`)
        // if (insideComment || matchSingleLineExport) {
        //   newFlatOutput += (((index > 0) ? '\n' : '') + line);
        //   toAppendLines++;
        // }
        if (appendingToNewFlatOutput) {
          if (!matchStart && !matchEnd) {
            newFlatOutput += ` ${line}`;
            toAppendLines++;
          } else if (insideComment) {
            newFlatOutput += ` ${line}`;
            toAppendLines++;
          } else if (matchEnd) {
            appendingToNewFlatOutput = false;
            newFlatOutput += ` ${this.processBrowserNotCorrectImportsExports(
              line,
            )}${_.times(
              toAppendLines,
              () => `${labelReplacementCode.flatenImportExportRequred}\n`,
            ).join('')}`; // TOOD @UNCOMMENT
            toAppendLines = 0;
          }
        } else {
          if (insideComment) {
            newFlatOutput += (index > 0 ? '\n' : '') + line;
          } else {
            if (matchSingleLineExport) {
              newFlatOutput += (index > 0 ? '\n' : '') + line;
            } else {
              appendingToNewFlatOutput = matchStart && !matchEnd;
              // if (joiningLine) console.log('line', line)
              newFlatOutput +=
                (index > 0 ? '\n' : '') +
                this.processBrowserNotCorrectImportsExports(line);
            }
            toAppendLines = 1;
          }
        }
      });
      this.rawContentForBrowser = newFlatOutput;
    }
    // console.log('\n\n\n\n')
    return this;
  }
  //#endregion

  //#region private / methods & getters / resolved pacakge name from
  /**
   * Get "npm package name" from line of code in .ts or .js files
   */
  private get resolvePackageNameFrom() {
    const self = this;
    return {
      JSrequired(rawImport) {
        rawImport = rawImport.replace(new RegExp(`require\\((\\'|\\")`), '');
        rawImport = rawImport.replace(new RegExp(`(\\'|\\")\\)`), '');
        rawImport = rawImport.trim();
        if (rawImport.startsWith(`./`)) return void 0;
        if (rawImport.startsWith(`../`)) return void 0;
        const fisrtName = rawImport.match(new RegExp(`\@?([a-zA-z]|\-)+\\/`));
        let res: string =
          _.isArray(fisrtName) && fisrtName.length > 0
            ? fisrtName[0]
            : rawImport;
        if (res.endsWith('/') && res.length > 1) {
          res = res.substring(0, res.length - 1);
        }
        return res;
      },
      TSimportExport(rawImport: string, usage: CoreModels.TsUsage) {
        // const orgImport = rawImport;
        if (usage === 'import') {
          const matches = rawImport.match(regexAsyncImport);
          if (Array.isArray(matches) && matches.length > 0) {
            const first = _.first(matches);
            rawImport = first;
            rawImport = rawImport.replace(/\ import\((\`|\'|\")/, '');
            rawImport = rawImport.replace(/(\`|\'|\")\)/, '');
          }
        }

        rawImport = rawImport.replace(new RegExp(`${usage}.+from\\s+`), '');
        rawImport = rawImport.replace(new RegExp(`(\'|\")`, 'g'), '').trim();
        if (rawImport.startsWith(`./`)) return void 0;
        if (rawImport.startsWith(`../`)) return void 0;

        const workspacePackgeMatch = (
          rawImport.match(
            new RegExp(`^\\@([a-zA-z]|\\-)+\\/([a-zA-z]|\\-)+$`),
          ) || []
        ) // @ts-ignore
          .filter(d => d.length > 1);
        const worskpacePackageName =
          _.isArray(workspacePackgeMatch) && workspacePackgeMatch.length === 1
            ? _.first(workspacePackgeMatch)
            : void 0;

        // const normalPackageMatch = (rawImport.match(new RegExp(`^([a-zA-z]|\\-)+\\/`)) || []);
        // const normalPackageName = (_.isArray(normalPackageMatch) && normalPackageMatch.length === 1)
        //   ? _.first(normalPackageMatch) : '';

        let res: string = worskpacePackageName
          ? worskpacePackageName
          : rawImport;
        if (res.endsWith('/') && res.length > 1) {
          res = res.substring(0, res.length - 1);
        }

        return res;
      },
    };
  }
  //#endregion

  //#region private / methods & getters / get inline package
  private getInlinePackage(packageName: string): InlinePkg {
    const packagesNames = this.project.allIsomorphicPackagesFromMemory;

    let realName = packageName;
    let isIsomorphic = false;
    if (packageName !== void 0) {
      isIsomorphic = !!packagesNames.find(p => {
        if (p === packageName) {
          return true;
        }
        const slashes = (p.match(new RegExp('/', 'g')) || []).length;
        if (slashes === 0) {
          return p === packageName;
        }
        // console.log('am here ', packageName)
        // console.log('p', p)
        if (p.startsWith(packageName)) {
          realName = p;
          // console.log('FOUDNED for ', packageName)
          // console.log('is REAL', p)
          return true;
        }
        return false;
      });
    }
    return {
      isIsomorphic,
      realName,
    };
  }
  //#endregion

  //#region private / methods & getters / regex region
  private REGEX_REGION(word) {
    return new RegExp(
      '[\\t ]*\\/\\/\\s*#?region\\s+' +
        word +
        ' ?[\\s\\S]*?\\/\\/\\s*#?endregion ?[\\t ]*\\n?',
      'g',
    );
  }
  //#endregion

  //#region private / methods & getters / replace region with
  private replaceRegionsWith(stringContent = '', words = []) {
    if (words.length === 0) return stringContent;
    let word = words.shift();
    let replacement = '';
    if (Array.isArray(word) && word.length === 2) {
      replacement = word[1];
      word = word[0];
    }

    stringContent = stringContent.replace(this.REGEX_REGION(word), replacement);
    return this.replaceRegionsWith(stringContent, words);
  }
  //#endregion

  //#region private / methods & getters / replace from line
  private replaceFromLine(pkgName: string, imp: string) {
    // console.log(`Check package: "${pkgName}"`)
    // console.log(`imp: "${imp}"`)
    const inlinePkg = this.getInlinePackage(pkgName);

    if (inlinePkg.isIsomorphic) {
      // console.log('inlinePkg ', inlinePkg.realName)
      const replacedImp = imp.replace(
        inlinePkg.realName,
        `${inlinePkg.realName}/${
          this.buildOptions.websql
            ? config.folder.websql
            : config.folder.browser
        }`,
      );

      this.rawContentForBrowser = this.rawContentForBrowser.replace(
        imp,
        replacedImp,
      );
      return;
    }
  }
  //#endregion

  //#region private / methods & getters / replace regions from ts import export
  private REPLACERegionsFromTsImportExport(usage: CoreModels.TsUsage) {
    // const debug = filesToDebug.includes(path.basename(this.absoluteFilePath));
    // if (debug) {
    //   debugger
    // }
    if (this.isAssetsFile) {
      return this;
    }
    if (!this.relativePath.endsWith('.ts')) {
      return this;
    }
    if (!_.isString(this.rawContentForBrowser)) return;
    const importRegex = new RegExp(
      `${usage}.+from\\s+(\\'|\\").+(\\'|\\")`,
      'g',
    );

    const asynMatches =
      usage === 'import'
        ? this.rawContentForBrowser.match(regexAsyncImportG)
        : [];
    const normalMatches = this.rawContentForBrowser.match(importRegex);

    const asyncImports = Array.isArray(asynMatches) ? asynMatches : [];
    let imports = [
      ...(Array.isArray(normalMatches) ? normalMatches : []),
      ...asyncImports,
    ];
    // debug && console.log(imports)
    if (_.isArray(imports)) {
      imports.forEach(imp => {
        // debug && console.log('imp: ' + imp)
        const pkgName = this.resolvePackageNameFrom.TSimportExport(imp, usage);
        // debug && console.log('pkgName: ' + pkgName)
        if (pkgName) {
          this.replaceFromLine(pkgName, imp);
        }
      });
    }
    return this;
  }
  //#endregion

  //#region private / methods & getters / replace regions from js require
  private REPLACERegionsFromJSrequire() {
    if (this.isAssetsFile) {
      return this;
    }
    if (!this.relativePath.endsWith('.ts')) {
      return this;
    }
    if (!_.isString(this.rawContentForBrowser)) return;
    // fileContent = IsomorphicRegions.flattenRequiresForContent(fileContent, usage)
    const importRegex = new RegExp(`require\\((\\'|\\").+(\\'|\\")\\)`, 'g');
    let imports = this.rawContentForBrowser.match(importRegex);
    // console.log(imports)
    if (_.isArray(imports)) {
      imports.forEach(imp => {
        const pkgName = this.resolvePackageNameFrom.JSrequired(imp);
        if (pkgName) {
          this.replaceFromLine(pkgName, imp);
        }
      });
    }
    return this;
  }
  //#endregion

  //#region private / methods & getters / replace regions for isomorphic lib
  private REPLACERegionsForIsomorphicLib(options: ReplaceOptionsExtended) {
    if (this.isAssetsFile) {
      return this;
    }
    options = _.clone(options);
    // Helpers.log(`[REPLACERegionsForIsomorphicLib] options.replacements ${this.absoluteFilePath}`)
    const ext = path.extname(this.relativePath);
    // console.log(`Ext: "${ext}" for file: ${path.basename(this.absoluteFilePath)}`)
    if (extAllowedToReplace.includes(ext)) {
      const orgContent = this.rawContentForBrowser;
      this.rawContentForBrowser = RegionRemover.from(
        this.relativePath,
        orgContent,
        options.replacements,
        this.project,
      ).output;

      if (
        (this.project.__isStandaloneProject ||
          this.project.__isSmartContainer) &&
        !this.isWebsqlMode
      ) {
        const regionsToRemove = [TAGS.BROWSER, TAGS.WEBSQL_ONLY];

        const orgContentBackend = this.rawContentBackend;
        this.rawContentBackend = RegionRemover.from(
          this.absoluteBackendDestFilePath,
          orgContentBackend,
          regionsToRemove,
          this.project,
        ).output;
      }
    }

    if (this.project.__isSmartContainerTarget) {
      const parent = this.project.__smartContainerTargetParentContainer;
      parent.children
        .filter(f => f.typeIs('isomorphic-lib'))
        .map(c => {
          if (true) {
            const from = `${c.name}/src/assets/`;
            const to = `${TO_REMOVE_TAG}assets/assets-for/${parent.name + '--' + c.name}/`;
            this.rawContentForBrowser = this.rawContentForBrowser.replace(
              new RegExp(Helpers.escapeStringForRegEx(`/${from}`), 'g'),
              to,
            );
            this.rawContentForBrowser = this.rawContentForBrowser.replace(
              new RegExp(Helpers.escapeStringForRegEx(from), 'g'),
              to,
            );
          }
        });
    } else if (this.project.__isStandaloneProject) {
      [this.project]
        .filter(f => f.typeIs('isomorphic-lib'))
        .forEach(c => {
          const from = `src/assets/`;
          const to = `${TO_REMOVE_TAG}assets/assets-for/${c.name}/`;
          this.rawContentForBrowser = this.rawContentForBrowser.replace(
            new RegExp(Helpers.escapeStringForRegEx(`/${from}`), 'g'),
            to,
          );
          this.rawContentForBrowser = this.rawContentForBrowser.replace(
            new RegExp(Helpers.escapeStringForRegEx(from), 'g'),
            to,
          );
        });
    }

    return this;
  }
  //#endregion

  //#region private / methods & getters / processing asset link for app
  private processAssetsLinksForApp() {
    this.rawContentForAPPONLYBrowser = this.rawContentForBrowser.replace(
      new RegExp(Helpers.escapeStringForRegEx(TO_REMOVE_TAG),'g'),
      '',
    );
    // console.log(`[incremental-build-process processAssetsLinksForApp '${this.buildOptions.baseHref}'`)
    const baseHref = this.project.angularFeBasenameManager.getBaseHref(
      InitOptions.fromBuild(this.buildOptions),
    );
    // console.log(`Fixing with basehref: '${baseHref}'`)

    const howMuchBack = this.relativePath.split('/').length - 1;
    const back =
      howMuchBack === 0
        ? './'
        : _.times(howMuchBack)
            .map(() => '../')
            .join('');

    const toReplaceFn = (relativeAssetPathPart: string) => {
      return [
        {
          from: `assets/assets-for/${relativeAssetPathPart}/`,
          to: `assets/assets-for/${relativeAssetPathPart}/`,
          makeSureSlashAtBegin: true,
        },
        {
          from: `src="/assets/assets-for/${relativeAssetPathPart}/`,
          to: `src="${baseHref}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `[src]="'/assets/assets-for/${relativeAssetPathPart}/`,
          to: `[src]="'${baseHref}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `href="/assets/assets-for/${relativeAssetPathPart}/`,
          to: `href="${baseHref}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `[href]="'/assets/assets-for/${relativeAssetPathPart}/`,
          to: `[href]="'${baseHref}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `url('/assets/assets-for/${relativeAssetPathPart}/`,
          to: `url('${baseHref}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `url("/assets/assets-for/${relativeAssetPathPart}/`,
          to: `url("${baseHref}assets/assets-for/${relativeAssetPathPart}/`,
        },
        /**
         *

  import * as json1 from '/shared/src/assets/hamsters/test.json';
  console.log({ json1 }) -> WORKS NOW
         */
        {
          from: ` from '/assets/assets-for/${relativeAssetPathPart}/`,
          to: ` from '${back}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: ` from "/assets/assets-for/${relativeAssetPathPart}/`,
          to: ` from "${back}assets/assets-for/${relativeAssetPathPart}/`,
        },
        /**
         * what can be done more
         * import * as json2 from '@codete-rxjs-quick-start/shared/assets/shared//src';
  console.log({ json2 })

  declare module "*.json" {
  const value: any;
  export default value;
  }

         */
      ] as {
        from: string;
        to: string;
        makeSureSlashAtBegin?: boolean;
      }[];
    };

    if (this.project.__isSmartContainerTarget) {
      const parent = this.project.__smartContainerTargetParentContainer;
      parent.children
        .filter(f => f.typeIs('isomorphic-lib'))
        .forEach(c => {
          const relative = parent.name + '--' + c.name;
          const cases = toReplaceFn(relative);
          for (let index = 0; index < cases.length; index++) {
            const { to, from, makeSureSlashAtBegin } = cases[index];
            if (makeSureSlashAtBegin) {
              this.rawContentForAPPONLYBrowser =
                this.rawContentForAPPONLYBrowser.replace(
                  new RegExp(Helpers.escapeStringForRegEx(`/${from}`), 'g'),
                  `/${to}`,
                );

              this.rawContentForAPPONLYBrowser =
                this.rawContentForAPPONLYBrowser.replace(
                  new RegExp(Helpers.escapeStringForRegEx(from), 'g'),
                  `/${to}`,
                );
            } else {
              this.rawContentForAPPONLYBrowser =
                this.rawContentForAPPONLYBrowser.replace(
                  new RegExp(Helpers.escapeStringForRegEx(from), 'g'),
                  to,
                );
            }
          }
        });
    } else if (this.project.__isStandaloneProject) {
      [this.project]
        .filter(f => f.typeIs('isomorphic-lib'))
        .forEach(c => {
          const relative = c.name;
          const cases = toReplaceFn(relative);
          for (let index = 0; index < cases.length; index++) {
            const { to, from, makeSureSlashAtBegin } = cases[index];
            if (makeSureSlashAtBegin) {
              this.rawContentForAPPONLYBrowser =
                this.rawContentForAPPONLYBrowser.replace(
                  new RegExp(Helpers.escapeStringForRegEx(`/${from}`), 'g'),
                  `/${to}`,
                );

              this.rawContentForAPPONLYBrowser =
                this.rawContentForAPPONLYBrowser.replace(
                  new RegExp(Helpers.escapeStringForRegEx(from), 'g'),
                  `/${to}`,
                );
            } else {
              this.rawContentForAPPONLYBrowser =
                this.rawContentForAPPONLYBrowser.replace(
                  new RegExp(Helpers.escapeStringForRegEx(from), 'g'),
                  to,
                );
            }
          }
        });
    }
  }
  //#endregion

  //#region private / methods & getters / save
  private save() {
    if (this.isAssetsFile) {
      this.saveNormalFile(false);
      return;
    }
    // Helpers.log(`saving ismoprhic file: ${this.absoluteFilePath}`, 1)
    const isFromLibs =
      _.first(this.relativePath.split('/')) === config.folder.libs;
    const module = isFromLibs
      ? _.first(this.relativePath.split('/').slice(1))
      : this.project.name; // taget
    const endOfBrowserOrWebsqlCode = `\n ${MjsModule.KEY_END_MODULE_FILE}${module} ${this.relativePath}`;
    const isTsFile = ['.ts'].includes(
      path.extname(this.absFileSourcePathBrowserOrWebsql),
    );
    const backendFileSaveMode = !this.isWebsqlMode; // websql does not do anything on be

    if (this.isEmptyBrowserFile) {
      this.saveEmptyFile(isTsFile, endOfBrowserOrWebsqlCode);
    } else {
      this.saveNormalFile(isTsFile, endOfBrowserOrWebsqlCode);
    }

    if (backendFileSaveMode) {
      const isEmptyModuleBackendFile = this.isEmptyModuleBackendFile;

      const absoluteBackendDestFilePath = this.absoluteBackendDestFilePath;

      if (!fse.existsSync(path.dirname(absoluteBackendDestFilePath))) {
        fse.mkdirpSync(path.dirname(absoluteBackendDestFilePath));
      }
      const isFrontendFile = !_.isUndefined(
        frontEndOnly.find(f => absoluteBackendDestFilePath.endsWith(f)),
      );

      if (isFrontendFile) {
        // console.log(`Ommiting for backend: ${absoluteBackendDestFilePath} `)
        return;
      }

      if (this.project.__isSmartContainerTarget) {
        const contentSmartTarget =
          isEmptyModuleBackendFile && isTsFile
            ? `
        export function dummy${new Date().getTime()}() { }
        export default function dummyDefault${new Date().getTime()}() { }
        `
            : this.changeOrganizationBackendFileContentBeforeSave(
                this.rawContentBackend,
                absoluteBackendDestFilePath,
              );
        fse.writeFileSync(
          absoluteBackendDestFilePath,
          contentSmartTarget,
          'utf8',
        );
      } else {
        const contentStandalone =
          isEmptyModuleBackendFile && isTsFile
            ? `export function dummy${new Date().getTime()}() { }`
            : this.changeStandaloneBackendFileContentBeforeSave(
                this.rawContentBackend,
                absoluteBackendDestFilePath,
              );

        fse.writeFileSync(
          absoluteBackendDestFilePath,
          contentStandalone,
          'utf8',
        );
      }
    }
  }
  //#endregion

  //#region private / methods & getters / warn about using file from node_modules with lib files
  private warnAboutUsingFilesFromNodeModulesWithLibFiles(
    content: string,
    absFilePath: string,
  ) {
    if (!absFilePath.endsWith('.ts')) {
      // console.log(`NOT_FIXING: ${absFilePath}`)
      return content;
    }

    if (
      this.project.__isSmartContainerTarget ||
      !(
        this.relativePath.startsWith('app.ts') ||
        this.relativePath.startsWith('app/')
      )
    ) {
      return;
    }
    const howMuchBack = this.relativePath.split('/').length - 1;
    // const debugFiles = [
    //   // 'files.container.ts',
    //   // 'app.ts',
    // ];

    // if (debugFiles.length > 0 && !debugFiles.includes(path.basename(absFilePath))) {
    //   return;
    // }

    const recognizeImport = (usage: CoreModels.TsUsage) => {
      const importRegex = new RegExp(
        `${usage}.+from\\s+(\\'|\\").+(\\'|\\")`,
        'g',
      );

      const asynMatches =
        usage === 'import' ? content.match(regexAsyncImportG) : [];
      const normalMatches = content.match(importRegex);

      const asyncImports = Array.isArray(asynMatches) ? asynMatches : [];
      let importsLines = [
        ...(Array.isArray(normalMatches) ? normalMatches : []),
        ...asyncImports,
      ];
      return importsLines;
    };

    let lines: [string, number][] = [
      ...recognizeImport('import'),
      ...recognizeImport('export'),
    ]
      .map((line, index) => {
        if (howMuchBack === 0) {
          const importRegex = new RegExp(
            `from\\s+(\\'|\\")\\.\\/lib(\\/|(\\'|\\"))`,
            'g',
          );
          const match = importRegex.test(line);
          return match ? [line, index] : void 0;
        } else {
          const importRegex = new RegExp(
            `from\\s+(\\'|\\")${_.times(howMuchBack, () => {
              return '\\.\\.';
            }).join('\\/')}\\/lib(\\/|(\\'|\\"))`,
            'g',
          );
          const match = importRegex.test(line);
          return match ? [line, index] : void 0;
        }
      })
      .filter(f => !!f) as any;

    // if(lines.length > 0) {
    //   console.log({
    //     'this.relativePath': this.relativePath,
    //     'absFilePath': absFilePath,
    //   })
    // }

    for (let index = 0; index < lines.length; index++) {
      const [wrongImport, lineindex] = lines[index];
      Helpers.warn(
        `
${chalk.bold('WARNING')}: ${chalk.underline(
          './src/' + this.relativePath + `:${lineindex + 2}:1`,
        )} Don't import things from lib like that (it may not work in your ${
          this.project.name
        }/src/app project);
${chalk.bold(wrongImport)};
Please use version compiled in node_modules:
import { < My Stuff > } from '${this.project.name}/src';`,
        false,
      );
    }
  }
  //#endregion

  //#region private / methods & getters / fix comments
  private changeBrowserOrWebsqlFileContentBeforeSave(
    browserOrWebsqlFileContent: string,
    endComment: string,
    absFilePath: string,
    packageName = this.project.name,
  ) {
    if (!this.relativePath.endsWith('.ts')) {
      return browserOrWebsqlFileContent;
    }

    const endOfFile =
      this.relativePath.endsWith('.ts') && endComment ? endComment : '';
    const standaloneRegexImportExport = new RegExp(
      `from\\s+(\\'|\\")${Helpers.escapeStringForRegEx(
        packageName,
      )}\\/(browser|websql)(\\'|\\")`,
      'g',
    );
    const standaloneRegexImports = new RegExp(
      `imports\\((\\'|\\")${Helpers.escapeStringForRegEx(
        packageName,
      )}\\/(browser|websql)(\\'|\\")\\)`,
      'g',
    );

    //#region debug stuff
    // const debug = debugFiles.includes(path.basename(absFilePath));
    // if (debug) {
    //   console.log('Fixing browser/websqlf file: ' + absFilePath)
    //   console.log({
    //     standaloneRegexImportExport,
    //     standaloneRegexImports,
    //   })
    // }
    //#endregion

    const splited = [
      '\n', // TODO artifically added
      ...browserOrWebsqlFileContent.split('\n'),
    ];

    const ignoreIndex = [];
    const res = splited.map((line, index) => {
      if (
        standaloneRegexImportExport.test(line) ||
        standaloneRegexImports.test(line)
      ) {
        ignoreIndex.push(index - 1);
      }
      if (
        (line.trimLeft().startsWith('// ') ||
          line.trimLeft().startsWith('//#')) &&
        line.search('@ts-ignore') === -1
      ) {
        return '';
      }
      return line;
    });

    for (let index = 0; index < ignoreIndex.length; index++) {
      res[ignoreIndex[index]] = res[ignoreIndex[index]] + ' // @ts-ignore';
    }

    let result = res.join('\n') + endOfFile;

    if (this.project.__isSmartContainerTarget) {
      // TODO check this
      // result = this.changeOrganizationBackendFileContentBeforeSave(result, absFilePath, true);
    } else {
      result = this.changeStandaloneBackendFileContentBeforeSave(
        result,
        absFilePath,
        true,
      );
    }
    return result;
  }
  //#endregion

  //#region private / methods & getters / change content before saving file
  private changeContenBeforeSave(
    content: string,
    absFilePath: string,
    options: {
      additionalSmartPckages: string[];
      isStandalone: boolean;
      isBrowser: boolean;
    },
  ) {
    if (!absFilePath.endsWith('.ts')) {
      // console.log(`NOT_FIXING: ${absFilePath}`)
      return content;
    }

    const { isBrowser, isStandalone, additionalSmartPckages } = options;

    // const debug = debugFiles.includes(path.basename(absFilePath));
    // debug && console.log(`FIXING: ${absFilePath} for ${isStandalone ? 'STANDALONE' : 'ORGANIZATION'}`)

    const howMuchBack = this.relativePath.split('/').length - 1;

    for (let index = 0; index < additionalSmartPckages.length; index++) {
      const rootChildPackage = additionalSmartPckages[index];
      const [__, childName] = rootChildPackage.split('/');
      const libName = isStandalone
        ? config.folder.lib
        : `${config.folder.libs}/${childName}`;
      const back =
        howMuchBack === 0
          ? './'
          : _.times(howMuchBack)
              .map(() => '../')
              .join('');
      const escapedName = Helpers.escapeStringForRegEx(rootChildPackage);

      if (isBrowser) {
        const regexFull = new RegExp(
          `from\\s+(\\'|\\")${escapedName}\\/(browser|websql)(\\'|\\")`,
          'g',
        );
        const regexPartial = new RegExp(
          `from\\s+(\\'|\\")${escapedName}\\/(browser|websql)\\/`,
          'g',
        );
        // debug && console.log({
        //   escapedName,
        //   regexFull,
        //   regexPartial,
        // });
        content = content.replace(regexFull, `from '${back}${libName}'`);
        content = content.replace(regexPartial, `from '${back}${libName}/`);
      } else {
        const regexFull = new RegExp(
          `from\\s+(\\'|\\")${escapedName}(\\'|\\")`,
          'g',
        );
        const regexPartial = new RegExp(
          `from\\s+(\\'|\\")${escapedName}\\/`,
          'g',
        );
        // debug && console.log({
        //   escapedName,
        //   regexFull,
        //   regexPartial,
        // });
        content = content.replace(regexFull, `from '${back}${libName}'`);
        content = content.replace(regexPartial, `from '${back}${libName}/`);
      }
    }
    // Helpers.warn(`[copytomanager] Empty content for ${absFilePath}`);
    // console.log({ absFilePathJSJSJ: absFilePath })
    return content;
  }
  //#endregion

  //#region private / methods & getters / change file import/export for organization
  /**
   * TODO may be weak solutin
   */
  private changeOrganizationBackendFileContentBeforeSave(
    content: string,
    absFilePath: string,
    isBrowser: boolean = false,
  ): string {
    return this.changeContenBeforeSave(content, absFilePath, {
      additionalSmartPckages: this.project.packageNamesFromProject,
      isStandalone: false,
      isBrowser,
    });
  }
  //#endregion

  //#region private / methods & getters / change file import/export for standalone
  /**
   * TODO may be weak solutin
   */
  private changeStandaloneBackendFileContentBeforeSave(
    content: string,
    absFilePath: string,
    isBrowser: boolean = false,
  ) {
    return this.changeContenBeforeSave(content, absFilePath, {
      additionalSmartPckages: [this.project.name],
      isStandalone: true,
      isBrowser,
    });
  }
  //#endregion

  //#region private / methods & getters / repalce accesets path
  private replaceAssetsPath(absDestinationPath: string) {
    const isAsset =
      !this.project.__isSmartContainerTarget &&
      this.relativePath.startsWith(`${config.folder.assets}/`);

    // isAsset && console.log('isAsset', absDestinationPath);
    return isAsset
      ? absDestinationPath.replace(
          '/assets/',
          `/assets/assets-for/${this.project.name}/`,
        )
      : absDestinationPath;
  }
  //#endregion
}
