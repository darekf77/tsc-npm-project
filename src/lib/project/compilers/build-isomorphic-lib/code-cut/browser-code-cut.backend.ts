//#region imports
import {
  _,
  path,
  fse,
  crossPlatformPath,
} from 'tnp-core';

import { config, ConfigModels, extAllowedToReplace, frontEndOnly, TAGS } from 'tnp-config';
import { Models } from 'tnp-models';
import { Helpers } from 'tnp-helpers';
import type { Project } from '../../../abstract/project/project';
import { BuildOptions } from 'tnp-db';
import { RegionRemover } from 'isomorphic-region-loader';
import { MjsModule } from '../../../features/copy-manager/bundle-mjs-fesm-module-spliter.backend';
import { CLI } from 'tnp-cli';

//#endregion

//#region consts
const regexAsyncImport = /\ import\((\`|\'|\")([a-zA-Z|\-|\@|\/|\.]+)(\`|\'|\")\)/;
const regexAsyncImportG = /\ import\((\`|\'|\")([a-zA-Z|\-|\@|\/|\.]+)(\`|\'|\")\)/g;
//#endregion

export class BrowserCodeCut {

  //#region static
  public static readonly IsomorphicLibs = [];
  public static resolveAndAddIsomorphicLibs(libsNames: string[]) {
    // @ts-ignore
    BrowserCodeCut.IsomorphicLibs = Helpers.arrays.uniqArray(BrowserCodeCut.IsomorphicLibs.concat(libsNames));
    // console.log({
    //   libs: BrowserCodeCut.IsomorphicLibs
    // })
  }
  //#endregion

  //#region fields & getters

  readonly isAssetsFile: boolean = false;
  protected absFileSourcePathBrowserOrWebsqlAPPONLY: string;
  private rawContentForBrowser: string;
  private rawContentForAPPONLYBrowser: string;
  private rawContentBackend: string;
  /**
  * ex. path/to/file-somewhere.ts or assets/something/here
  * in src or tmp-src-dist etc.
  */
  private readonly relativePath: string;
  private readonly isWebsqlMode: boolean;
  private readonly absoluteBackendDestFilePath: string;


  get isEmptyBrowserFile() {
    return this.rawContentForBrowser.replace(/\s/g, '').trim() === '';
  }

  get isEmptyModuleBackendFile() {
    return (this.rawContentBackend || '').replace(/\/\*\ \*\//g, '').trim().length === 0;
  }

  get additionalSmartPckages() {
    const parent = this.getParentContainer();
    const additionalSmartPckages = (!parent ? [] : parent.children.map(c => `@${parent.name}/${c.name}`));
    return additionalSmartPckages;
  }

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
    protected absPathTmpSrcDistBundleFolder: string,
    private project?: Project,
    private buildOptions?: BuildOptions,
  ) {

    this.absPathTmpSrcDistBundleFolder = crossPlatformPath(absPathTmpSrcDistBundleFolder);
    this.absFileSourcePathBrowserOrWebsql = crossPlatformPath(absFileSourcePathBrowserOrWebsql);
    this.absFileSourcePathBrowserOrWebsqlAPPONLY = this.absFileSourcePathBrowserOrWebsql.replace(
      `tmp-src-${buildOptions.outDir}${buildOptions.websql ? '-websql' : ''}`,
      `tmp-src-app-${buildOptions.outDir}${buildOptions.websql ? '-websql' : ''}`
    ); // for slighted modifed app bundle

    this.absSourcePathFromSrc = crossPlatformPath(absSourcePathFromSrc);

    // console.log('absSourcePathFromSrc:', absSourcePathFromSrc)
    // if (absSourcePathFromSrc.endsWith('/file.ts')) {
    //   debugger
    // }

    if (project.isStandaloneProject) {
      if (absSourcePathFromSrc
        .replace(crossPlatformPath([project.location, config.folder.src]), '')
        .startsWith('/assets/')
      ) {
        this.isAssetsFile = true;
      }
    }

    this.relativePath = crossPlatformPath(this.absFileSourcePathBrowserOrWebsql)
      .replace(`${this.absPathTmpSrcDistBundleFolder}/`, '')

    this.absoluteBackendDestFilePath = crossPlatformPath(path.join(
      this.absPathTmpSrcDistBundleFolder.replace('tmp-src', 'tmp-source'),
      this.relativePath, // .replace('-websql', '') // backend is ONE
    ));

    // console.log('RELATIVE ', this.relativePath)

    this.isWebsqlMode = (
      this.relativePath.startsWith(`tmp-src-${config.folder.dist}-${config.folder.websql}`)
      || this.relativePath.startsWith(`tmp-src-${config.folder.bundle}-${config.folder.websql}`)
    );
  }
  //#endregion

  //#region methods

  //#region methods / init
  init() {
    this.rawContentForBrowser = Helpers.readFile(this.absSourcePathFromSrc, void 0, true) || '';
    this.rawContentForAPPONLYBrowser = this.rawContentForBrowser; // TODO not needed ?
    this.rawContentBackend = this.rawContentForBrowser; // at the beginning those are normal files from src
    return this;
  }
  //#endregion

  //#region methods / init and save
  private replaceAssetsPath = (absDestinationPath: string) => {
    const isAsset = !this.project.isSmartContainerTarget && this.relativePath.startsWith(`${config.folder.assets}/`);
    return isAsset ? absDestinationPath.replace('/assets/', `/assets/assets-for/${this.project.name}/`) : absDestinationPath;
  }

  initAndSave(remove = false) {
    if (remove) {
      Helpers.removeIfExists(this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsql));
      Helpers.removeIfExists(this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsqlAPPONLY));
      Helpers.removeIfExists(this.replaceAssetsPath(this.absoluteBackendDestFilePath));
    } else {
      // this is needed for json in src/lib or something
      const realAbsSourcePathFromSrc = fse.realpathSync(this.absSourcePathFromSrc);
      if (!Helpers.exists(realAbsSourcePathFromSrc) || Helpers.isFolder(realAbsSourcePathFromSrc)) {
        return;
      }

      try {
        Helpers.copyFile(this.absSourcePathFromSrc, this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsql));
        Helpers.copyFile(this.absSourcePathFromSrc, this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsqlAPPONLY));
        // final straight copy to tmp-source-folder
        Helpers.copyFile(this.absSourcePathFromSrc, this.replaceAssetsPath(this.absoluteBackendDestFilePath));
      } catch (error) {
        Helpers.warn(`[firedev][browser-code-cut] file not found ${this.absSourcePathFromSrc}`)
      }
    }

  }
  //#endregion

  //#region methods / save empty file
  private saveEmptyFile(isTsFile: boolean, endOfBrowserOrWebsqlCode: string) {
    if (!fse.existsSync(path.dirname(this.absFileSourcePathBrowserOrWebsql))) { // write empty instead unlink
      fse.mkdirpSync(path.dirname(this.absFileSourcePathBrowserOrWebsql));
    }
    if (!fse.existsSync(path.dirname(this.absFileSourcePathBrowserOrWebsqlAPPONLY))) { // write empty instead unlink
      fse.mkdirpSync(path.dirname(this.absFileSourcePathBrowserOrWebsqlAPPONLY));
    }
    if (isTsFile) {
      if (!this.relativePath.startsWith('app/')) {
        fse.writeFileSync(
          this.absFileSourcePathBrowserOrWebsql,
          `/* files for browser${this.isWebsqlMode
            ? '-websql' + endOfBrowserOrWebsqlCode
            : '' + endOfBrowserOrWebsqlCode
          } mode */`,
          'utf8'
        );
      }
      fse.writeFileSync(
        this.absFileSourcePathBrowserOrWebsqlAPPONLY,
        `/* files for browser${this.isWebsqlMode
          ? '-websql' + endOfBrowserOrWebsqlCode
          : '' + endOfBrowserOrWebsqlCode
        } mode */`,
        'utf8'
      );
    } else {
      if (!this.relativePath.startsWith('app/')) {
        fse.writeFileSync(
          this.absFileSourcePathBrowserOrWebsql, ``,
          'utf8'
        );
      }
      fse.writeFileSync(
        this.absFileSourcePathBrowserOrWebsqlAPPONLY, ``,
        'utf8'
      );
    }
  }
  //#endregion

  //#region methods / save normal file
  private saveNormalFile(isTsFile: boolean, endOfBrowserOrWebsqlCode?: string) {
    if (this.isAssetsFile) {
      this.absFileSourcePathBrowserOrWebsql = this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsql);
      // console.log(`ASSETE: ${this.absFileSourcePathBrowserOrWebsql}`)
    }
    if (this.isAssetsFile) {
      this.absFileSourcePathBrowserOrWebsqlAPPONLY = this.replaceAssetsPath(this.absFileSourcePathBrowserOrWebsqlAPPONLY);
      // console.log(`ASSETE: ${this.absFileSourcePathBrowserOrWebsql}`)
    }
    if (!fse.existsSync(path.dirname(this.absFileSourcePathBrowserOrWebsql))) {
      fse.mkdirpSync(path.dirname(this.absFileSourcePathBrowserOrWebsql));
    }
    if (!fse.existsSync(path.dirname(this.absFileSourcePathBrowserOrWebsqlAPPONLY))) {
      fse.mkdirpSync(path.dirname(this.absFileSourcePathBrowserOrWebsqlAPPONLY));
    }

    this.processAssetsLinksForApp();
    this.warnAboutUsingFilesFromNodeModulesWithLibFiles(this.rawContentForAPPONLYBrowser, this.absFileSourcePathBrowserOrWebsqlAPPONLY);

    if (isTsFile) {
      if (!this.relativePath.startsWith('app/')) {
        fse.writeFileSync(this.absFileSourcePathBrowserOrWebsql,
          this.fixBrowserFileBeforeSave(this.rawContentForBrowser, endOfBrowserOrWebsqlCode),
          'utf8'
        );
      }
      fse.writeFileSync(this.absFileSourcePathBrowserOrWebsqlAPPONLY,
        this.fixBrowserFileBeforeSave(this.rawContentForAPPONLYBrowser, endOfBrowserOrWebsqlCode),
        'utf8'
      );
    } else {
      if (!this.relativePath.startsWith('app/')) {
        fse.writeFileSync(this.absFileSourcePathBrowserOrWebsql,
          this.rawContentForBrowser,
          'utf8'
        );
      }
      fse.writeFileSync(this.absFileSourcePathBrowserOrWebsqlAPPONLY,
        this.rawContentForAPPONLYBrowser,
        'utf8'
      );
    }
  }
  //#endregion

  //#region methods / flat typescript import export
  public FLATTypescriptImportExport(usage: ConfigModels.TsUsage) {
    if (this.isAssetsFile) {
      return this;
    }
    if (!this.relativePath.endsWith('.ts')) {
      return this;
    }
    const isExport = (usage === 'export');
    const fileContent: string = this.rawContentForBrowser;
    const commentStart = new RegExp(`\\/\\*`);
    const commentEnds = new RegExp(`\\*\\/`);
    const commentEndExportOnly = new RegExp(`^(\\ )*\\}\\;?\\ *`);
    const singleLineExport = new RegExp(`^\\ *export\\ +\\{.*\\}\\;?`)

    const regextStart = new RegExp(`${usage}\\s+{`)
    const regexEnd = new RegExp(`from\\s+(\\'|\\").+(\\'|\\")`)
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

        const matchEndExportOnly = isExport && commentEndExportOnly.test(line) && (line.replace(commentEndExportOnly, '') === '');
        const matchEnd = (matchEndExportOnly || regexEnd.test(line))


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
            newFlatOutput += ` ${line}${_.times(toAppendLines,
              () => `${Models.label.flatenImportExportRequred}\n`).join('')}`;
            toAppendLines = 0;
          }
        } else {
          if (insideComment) {
            newFlatOutput += (((index > 0) ? '\n' : '') + line);
          } else {
            if (matchSingleLineExport) {
              newFlatOutput += (((index > 0) ? '\n' : '') + line);
            } else {
              appendingToNewFlatOutput = (matchStart && !matchEnd);
              // if (joiningLine) console.log('line', line)
              newFlatOutput += (((index > 0) ? '\n' : '') + line);
            }
            toAppendLines = 1;
          }
        }

      })
      this.rawContentForBrowser = newFlatOutput;
    }
    // console.log('\n\n\n\n')
    return this;
  }
  //#endregion

  //#region methods / resolved pacakge name from
  /**
   * Get "npm package name" from line of code in .ts or .js files
   */
  private get resolvePackageNameFrom() {
    const self = this;
    return {
      JSrequired(rawImport) {
        rawImport = rawImport.replace(new RegExp(`require\\((\\'|\\")`), '')
        rawImport = rawImport.replace(new RegExp(`(\\'|\\")\\)`), '')
        rawImport = rawImport.trim()
        if (rawImport.startsWith(`./`)) return void 0;
        if (rawImport.startsWith(`../`)) return void 0;
        const fisrtName = rawImport.match(new RegExp(`\@?([a-zA-z]|\-)+\\/`))
        let res: string = (_.isArray(fisrtName) && fisrtName.length > 0) ? fisrtName[0] : rawImport;
        if (res.endsWith('/') && res.length > 1) {
          res = res.substring(0, res.length - 1)
        }
        return res;
      },
      TSimportExport(rawImport: string, usage: ConfigModels.TsUsage) {
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

        rawImport = rawImport.replace(new RegExp(`${usage}.+from\\s+`), '')
        rawImport = rawImport.replace(new RegExp(`(\'|\")`, 'g'), '').trim()
        if (rawImport.startsWith(`./`)) return void 0;
        if (rawImport.startsWith(`../`)) return void 0;

        const workspacePackgeMatch = (rawImport.match(new RegExp(`^\\@([a-zA-z]|\\-)+\\/([a-zA-z]|\\-)+$`)) || [])
          .filter(d => d.length > 1);
        const worskpacePackageName = (_.isArray(workspacePackgeMatch) && workspacePackgeMatch.length === 1)
          ? _.first(workspacePackgeMatch) : void 0;

        // const normalPackageMatch = (rawImport.match(new RegExp(`^([a-zA-z]|\\-)+\\/`)) || []);
        // const normalPackageName = (_.isArray(normalPackageMatch) && normalPackageMatch.length === 1)
        //   ? _.first(normalPackageMatch) : '';

        let res: string = worskpacePackageName ? worskpacePackageName : rawImport;
        if (res.endsWith('/') && res.length > 1) {
          res = res.substring(0, res.length - 1)
        }

        return res;
      }
    };
  }
  //#endregion

  //#region methods / get parent

  getParentContainer() {
    let parent: Project;
    if (this.project.isSmartContainer) {
      parent = this.project;
    }
    if (this.project.isSmartContainerChild) {
      parent = this.project.parent;
    }
    if (this.project.isSmartContainerTarget) {
      parent = this.project.smartContainerTargetParentContainer;
    }
    return parent;
  }
  //#endregion

  //#region methods / get inline package
  protected getInlinePackage(packageName: string): Models.InlinePkg {
    const parentContainer = this.getParentContainer();
    let packagesNames = BrowserCodeCut.IsomorphicLibs;

    packagesNames = packagesNames.concat([
      ...(parentContainer ? [] : [this.project.name]),
      ...this.additionalSmartPckages,
    ]);


    // console.log('MORPHI this.isomorphicLibs', this.isomorphicLibs)
    let realName = packageName;
    let isIsomorphic = false;
    if (packageName !== void 0) {
      isIsomorphic = !!packagesNames
        .find(p => {
          if (p === packageName) {
            return true;
          }
          const slashes = (p.match(new RegExp("\/", "g")) || []).length;
          if (slashes === 0) {
            return p === packageName
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
      realName
    }
  }
  //#endregion

  //#region methods / regex region
  protected REGEX_REGION(word) {
    return new RegExp("[\\t ]*\\/\\/\\s*#?region\\s+" + word + " ?[\\s\\S]*?\\/\\/\\s*#?endregion ?[\\t ]*\\n?", "g")
  }
  //#endregion

  //#region methods / replace region with
  protected replaceRegionsWith(stringContent = '', words = []) {
    if (words.length === 0) return stringContent;
    let word = words.shift();
    let replacement = ''
    if (Array.isArray(word) && word.length === 2) {
      replacement = word[1];
      word = word[0]
    }


    stringContent = stringContent.replace(this.REGEX_REGION(word), replacement);
    return this.replaceRegionsWith(stringContent, words);
  }
  //#endregion

  //#region methods / replace from line
  replaceFromLine(pkgName: string, imp: string) {
    // console.log(`Check package: "${pkgName}"`)
    // console.log(`imp: "${imp}"`)
    const inlinePkg = this.getInlinePackage(pkgName)

    if (inlinePkg.isIsomorphic) {
      // console.log('inlinePkg ', inlinePkg.realName)
      const replacedImp = imp.replace(
        inlinePkg.realName,
        `${inlinePkg.realName}/${this.buildOptions.websql ? config.folder.websql : config.folder.browser}`
      );

      this.rawContentForBrowser = this.rawContentForBrowser.replace(imp, replacedImp);
      return;
    }
  }
  //#endregion

  //#region methods / replace regions from ts import export
  REPLACERegionsFromTsImportExport(usage: ConfigModels.TsUsage) {
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
    const importRegex = new RegExp(`${usage}.+from\\s+(\\'|\\").+(\\'|\\")`, 'g');

    const asynMatches = (usage === 'import') ? this.rawContentForBrowser.match(regexAsyncImportG) : [];
    const normalMatches = this.rawContentForBrowser.match(importRegex);

    const asyncImports = (Array.isArray(asynMatches) ? asynMatches : []);
    let imports = [
      ...(Array.isArray(normalMatches) ? normalMatches : []),
      ...asyncImports,
    ]
    // debug && console.log(imports)
    if (_.isArray(imports)) {
      imports.forEach(imp => {
        // debug && console.log('imp: ' + imp)
        const pkgName = this.resolvePackageNameFrom.TSimportExport(imp, usage);
        // debug && console.log('pkgName: ' + pkgName)
        if (pkgName) {
          this.replaceFromLine(pkgName, imp);
        }
      })
    }
    return this;
  }
  //#endregion

  //#region methods / replace regions from js require
  REPLACERegionsFromJSrequire() {
    if (this.isAssetsFile) {
      return this;
    }
    if (!this.relativePath.endsWith('.ts')) {
      return this;
    }
    if (!_.isString(this.rawContentForBrowser)) return;
    // fileContent = IsomorphicRegions.flattenRequiresForContent(fileContent, usage)
    const importRegex = new RegExp(`require\\((\\'|\\").+(\\'|\\")\\)`, 'g')
    let imports = this.rawContentForBrowser.match(importRegex)
    // console.log(imports)
    if (_.isArray(imports)) {
      imports.forEach(imp => {
        const pkgName = this.resolvePackageNameFrom.JSrequired(imp);
        if (pkgName) {
          this.replaceFromLine(pkgName, imp);
        }
      })
    }
    return this;
  }
  //#endregion

  //#region methods / replace regions for isomorphic lib
  REPLACERegionsForIsomorphicLib(options: Models.dev.ReplaceOptionsExtended) {
    if (this.isAssetsFile) {
      return this;
    }
    options = _.clone(options);
    // Helpers.log(`[REPLACERegionsForIsomorphicLib] options.replacements ${this.absoluteFilePath}`)
    const ext = path.extname(this.relativePath);
    // console.log(`Ext: "${ext}" for file: ${path.basename(this.absoluteFilePath)}`)
    if (extAllowedToReplace.includes(ext)) {
      const orgContent = this.rawContentForBrowser;
      this.rawContentForBrowser = RegionRemover.from(this.relativePath, orgContent, options.replacements, this.project).output;

      if ((this.project.isStandaloneProject || this.project.isSmartContainer) && !this.isWebsqlMode) {

        const regionsToRemove = [TAGS.BROWSER, TAGS.WEBSQL_ONLY];

        const orgContentBackend = this.rawContentBackend;
        this.rawContentBackend = RegionRemover.from(
          this.absoluteBackendDestFilePath,
          orgContentBackend,
          regionsToRemove,
          this.project
        ).output;
      }
    }


    if (this.project.isSmartContainerTarget) {
      const parent = this.project.smartContainerTargetParentContainer;
      parent.children
        .filter(f => f.typeIs('isomorphic-lib'))
        .map(c => {
          if (true) {
            const from = `${c.name}/src/assets/`;
            const to = `assets/assets-for/${parent.name + '--' + c.name}/`;
            this.rawContentForBrowser = this.rawContentForBrowser.replace(new RegExp(Helpers.escapeStringForRegEx(`/${from}`), 'g'), to);
            this.rawContentForBrowser = this.rawContentForBrowser.replace(new RegExp(Helpers.escapeStringForRegEx(from), 'g'), to);
          }
        })
    } else if (this.project.isStandaloneProject) {
      [this.project]
        .filter(f => f.typeIs('isomorphic-lib'))
        .forEach(c => {
          const from = `src/assets/`;
          const to = `assets/assets-for/${c.name}/`;
          this.rawContentForBrowser = this.rawContentForBrowser.replace(new RegExp(Helpers.escapeStringForRegEx(`/${from}`), 'g'), to);
          this.rawContentForBrowser = this.rawContentForBrowser.replace(new RegExp(Helpers.escapeStringForRegEx(from), 'g'), to);
        });
    }

    return this;
  }
  //#endregion

  //#region methods / processing asset link for app
  processAssetsLinksForApp() {
    this.rawContentForAPPONLYBrowser = this.rawContentForBrowser;

    const pathname = this.project.isSmartContainerTarget
      ? this.project.smartContainerTargetParentContainer.name
      : this.project.name;

    /**
     * lib code for app build before release
     */
    // const forAppRelaseBuild = (this.buildOptions?.args?.search('--forAppRelaseBuild') !== -1)


    let basenameWithSlash = this.project.isInRelaseBundle ? `/${pathname}/` : '/';
    if (this.project.env.config?.useDomain) {
      basenameWithSlash = '/';
    }

    basenameWithSlash = basenameWithSlash.endsWith('/') ? basenameWithSlash : (basenameWithSlash + '/');

    const howMuchBack = (this.relativePath.split('/').length - 1);
    const back = (howMuchBack === 0) ? './' : _.times(howMuchBack).map(() => '../').join('');

    const toReplaceFn = (relativeAssetPathPart: string) => {
      return [
        {
          from: `assets/assets-for/${relativeAssetPathPart}/`,
          to: `assets/assets-for/${relativeAssetPathPart}/`,
          makeSureSlashAtBegin: true,
        },
        {
          from: `src="/assets/assets-for/${relativeAssetPathPart}/`,
          to: `src="${basenameWithSlash}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `[src]="'/assets/assets-for/${relativeAssetPathPart}/`,
          to: `[src]="'${basenameWithSlash}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `href="/assets/assets-for/${relativeAssetPathPart}/`,
          to: `href="${basenameWithSlash}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `[href]="'/assets/assets-for/${relativeAssetPathPart}/`,
          to: `[href]="'${basenameWithSlash}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `url('/assets/assets-for/${relativeAssetPathPart}/`,
          to: `url('${basenameWithSlash}assets/assets-for/${relativeAssetPathPart}/`,
        },
        {
          from: `url("/assets/assets-for/${relativeAssetPathPart}/`,
          to: `url("${basenameWithSlash}assets/assets-for/${relativeAssetPathPart}/`,
        },
        /**
         *
// @ts-ignore
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
         * import * as json2 from '@codete-rxjs-quick-start/shared/assets/shared/';
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
    }


    if (this.project.isSmartContainerTarget) {
      const parent = this.project.smartContainerTargetParentContainer;
      parent.children
        .filter(f => f.typeIs('isomorphic-lib'))
        .forEach(c => {
          const relative = parent.name + '--' + c.name;
          const cases = toReplaceFn(relative);
          for (let index = 0; index < cases.length; index++) {
            const { to, from, makeSureSlashAtBegin } = cases[index];
            if (makeSureSlashAtBegin) {
              this.rawContentForAPPONLYBrowser = this.rawContentForAPPONLYBrowser
                .replace(new RegExp(Helpers.escapeStringForRegEx(`/${from}`), 'g'), `/${to}`);

              this.rawContentForAPPONLYBrowser = this.rawContentForAPPONLYBrowser
                .replace(new RegExp(Helpers.escapeStringForRegEx(from), 'g'), `/${to}`);

            } else {
              this.rawContentForAPPONLYBrowser = this.rawContentForAPPONLYBrowser
                .replace(new RegExp(Helpers.escapeStringForRegEx(from), 'g'), to);
            }
          }
        })
    } else if (this.project.isStandaloneProject) {
      [this.project]
        .filter(f => f.typeIs('isomorphic-lib'))
        .forEach(c => {
          const relative = c.name;
          const cases = toReplaceFn(relative);
          for (let index = 0; index < cases.length; index++) {
            const { to, from, makeSureSlashAtBegin } = cases[index];
            if (makeSureSlashAtBegin) {
              this.rawContentForAPPONLYBrowser = this.rawContentForAPPONLYBrowser
                .replace(new RegExp(Helpers.escapeStringForRegEx(`/${from}`), 'g'), `/${to}`);

              this.rawContentForAPPONLYBrowser = this.rawContentForAPPONLYBrowser
                .replace(new RegExp(Helpers.escapeStringForRegEx(from), 'g'), `/${to}`);

            } else {
              this.rawContentForAPPONLYBrowser = this.rawContentForAPPONLYBrowser
                .replace(new RegExp(Helpers.escapeStringForRegEx(from), 'g'), to);
            }
          }
        });
    }
  }
  //#endregion

  //#region methods / fix comments
  private fixBrowserFileBeforeSave(s: string, endComment?: string) {
    if (!this.relativePath.endsWith('.ts')) {
      return s;
    }

    const endOfFile = ((this.relativePath.endsWith('.ts') && endComment) ? endComment : '');
    const standaloneRegexImportExport = new RegExp(`from\\s+(\\'|\\")${Helpers.escapeStringForRegEx(this.project.name)}\\/(browser|websql)(\\'|\\")`, 'g');
    const standaloneRegexImports = new RegExp(`imports\\((\\'|\\")${Helpers.escapeStringForRegEx(this.project.name)}\\/(browser|websql)(\\'|\\")\\)`, 'g');

    const splited = [
      '\n', // TODO artifically added
      ...s.split('\n'),
    ];

    const ignoreIndex = [];
    const res = splited
      .map((line, index) => {
        if (standaloneRegexImportExport.test(line) || standaloneRegexImports.test(line)) {
          ignoreIndex.push(index - 1);
        }
        if ((line.trimLeft().startsWith('// ') || line.trimLeft().startsWith('//#'))
          && (line.search('@ts-ignore') === -1)
        ) {
          return ''
        }
        return line;
      })


    for (let index = 0; index < ignoreIndex.length; index++) {
      res[ignoreIndex[index]] = res[ignoreIndex[index]] + ' // @ts-ignore';
    }

    return res.join('\n') + endOfFile;
  }
  //#endregion

  //#region methods / save
  save() {
    if (this.isAssetsFile) {
      this.saveNormalFile(false)
      return
    }
    // Helpers.log(`saving ismoprhic file: ${this.absoluteFilePath}`, 1)
    const isFromLibs = (_.first(this.relativePath.split('/')) === config.folder.libs);
    const module = isFromLibs ? _.first(this.relativePath.split('/').slice(1)) : this.project.name; // taget
    const endOfBrowserOrWebsqlCode = `\n ${MjsModule.KEY_END_MODULE_FILE}${module} ${this.relativePath}`;
    const isTsFile = ['.ts'].includes(path.extname(this.absFileSourcePathBrowserOrWebsql));
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
      const isFrontendFile = !_.isUndefined(frontEndOnly.find(f => absoluteBackendDestFilePath.endsWith(f)));

      if (isFrontendFile) {
        // console.log(`Ommiting for backend: ${absoluteBackendDestFilePath} `)
        return;
      }



      if (this.project.isSmartContainerTarget) {
        const contentSmartTarget = (isEmptyModuleBackendFile && isTsFile) ? `
        export function dummy${(new Date()).getTime()}() { }
        export default function dummyDefault${(new Date()).getTime()}() { }
        `
          : this.changeJsFileImportForOrgnanizaiton(this.rawContentBackend, absoluteBackendDestFilePath);

        // console.log('should save smart container target file: ', absoluteBackendDestFilePath)
        fse.writeFileSync(absoluteBackendDestFilePath, contentSmartTarget, 'utf8');
      } else {
        const contentStandalone = (isEmptyModuleBackendFile && isTsFile) ? `export function dummy${(new Date()).getTime()}() { }`
          : this.changeJsFileImportForStandalone(this.rawContentBackend, absoluteBackendDestFilePath);

          // console.log('should save standalone project file: ', absoluteBackendDestFilePath)
        fse.writeFileSync(absoluteBackendDestFilePath, contentStandalone, 'utf8');
      }
    }
  }
  //#endregion

  warnAboutUsingFilesFromNodeModulesWithLibFiles(
    content: string,
    absFilePath: string,
  ) {
    if (!absFilePath.endsWith('.ts')) {
      // console.log(`NOT_FIXING: ${absFilePath}`)
      return content;
    }

    if (this.project.isSmartContainerTarget
      || !(this.relativePath.startsWith('app.ts') || this.relativePath.startsWith('app/'))
    ) {
      return;
    }
    const howMuchBack = (this.relativePath.split('/').length - 1);
    // const debugFiles = [
    //   // 'files.container.ts',
    //   // 'app.ts',
    // ];

    // if (debugFiles.length > 0 && !debugFiles.includes(path.basename(absFilePath))) {
    //   return;
    // }

    const recognizeImport = (usage: ConfigModels.TsUsage) => {
      const importRegex = new RegExp(`${usage}.+from\\s+(\\'|\\").+(\\'|\\")`, 'g');

      const asynMatches = (usage === 'import') ? content.match(regexAsyncImportG) : [];
      const normalMatches = content.match(importRegex);

      const asyncImports = (Array.isArray(asynMatches) ? asynMatches : []);
      let importsLines = [
        ...(Array.isArray(normalMatches) ? normalMatches : []),
        ...asyncImports,
      ];
      return importsLines;
    }
    // @ts-ignore
    let lines: [string, number][] = [
      ...recognizeImport('import'),
      ...recognizeImport('export')
    ].map((line, index) => {
      if (howMuchBack === 0) {
        const importRegex = new RegExp(`from\\s+(\\'|\\")\\.\\/lib(\\/|(\\'|\\"))`, 'g');
        const match = importRegex.test(line);
        return match ? [line, index] : void 0;
      } else {
        const importRegex = new RegExp(`from\\s+(\\'|\\")${_.times(howMuchBack, () => {
          return '\\.\\.';
        }).join('\\/')}\\/lib(\\/|(\\'|\\"))`, 'g');
        const match = importRegex.test(line);
        return match ? [line, index] : void 0;
      }

    }).filter(f => !!f);

    // if(lines.length > 0) {
    //   console.log({
    //     'this.relativePath': this.relativePath,
    //     'absFilePath': absFilePath,
    //   })
    // }

    for (let index = 0; index < lines.length; index++) {
      const [wrongImport, lineindex] = lines[index];
      Helpers.warn(`
${CLI.chalk.bold('WARNING')}: ${CLI.chalk.underline('./src/' + this.relativePath + `:${lineindex + 2}:1`)} Don't import things from lib like that (it may not work in your ${this.project.name}/src/app project);
${CLI.chalk.bold(wrongImport)};
Please use version compiled in node_modules:
import { < My Stuff > } from '${this.project.name}';`, false,);
    }


  }

  //#region methods / change js file import for organization
  /**
   * TODO may be weak solutin
   */
  changeJsFileImportForOrgnanizaiton(
    content: string,
    absFilePath: string,
    additionalSmartPckages = this.additionalSmartPckages,
    isStandalone = false,
  ) {
    if (!absFilePath.endsWith('.ts')) {
      // console.log(`NOT_FIXING: ${absFilePath}`)
      return content;
    }

    // console.log(`FIXING: ${absFilePath}`)

    const howMuchBack = (this.relativePath.split('/').length - 1);

    for (let index = 0; index < additionalSmartPckages.length; index++) {
      const rootChildPackage = additionalSmartPckages[index];
      const [__, childName] = rootChildPackage.split('/');
      const libName = isStandalone ? config.folder.lib : `${config.folder.libs}/${childName}`
      const back = (howMuchBack === 0) ? './' : _.times(howMuchBack).map(() => '../').join('');

      (() => {
        content = content.replace(
          new RegExp(`from\\s+(\\'|\\")${Helpers.escapeStringForRegEx(rootChildPackage)}(\\'|\\")`, 'g'),
          `from '${back}${libName}'`
        );
      })();

      (() => {
        content = content.replace(
          new RegExp(`from\\s+(\\'|\\")${Helpers.escapeStringForRegEx(rootChildPackage)}\\/`, 'g'),
          `from '${back}${libName}/`
        );
      })();

    }
    // Helpers.warn(`[copytomanager] Empty content for ${absFilePath}`);
    // console.log({ absFilePathJSJSJ: absFilePath })
    return content;
  }
  //#endregion

  //#region methods / change js file import for organization
  /**
   * TODO may be weak solutin
   */
  changeJsFileImportForStandalone(
    content: string,
    absFilePath: string,
  ) {
    return this.changeJsFileImportForOrgnanizaiton(content, absFilePath, [this.project.name], true);
  }
  //#endregion

  //#endregion

}
