import { config, PREFIXES } from 'tnp-config/src';
import { crossPlatformPath, glob, path, _ } from 'tnp-core/src';
import { BuildOptions } from '../../../options';
import { Helpers } from 'tnp-helpers/src';
import { argsToClear } from '../../../constants';
import { Models } from '../../../models';
import { Project } from '../../abstract/project';
import { CopyMangerHelpers } from './copy-manager-helpers.backend';
import { CopyManager } from './copy-manager.backend';
import { SourceMappingUrl } from './source-maping-url.backend';
import { TypescriptDtsFixer } from './typescript-dts-fixer.backend';

export class CopyManagerStandalone extends CopyManager {
  dtsFixer: TypescriptDtsFixer;

  //#region init
  public init(buildOptions: BuildOptions, renameDestinationFolder?: string) {
    this.buildOptions = buildOptions;
    this.renameDestinationFolder = renameDestinationFolder;

    this.selectAllProjectCopyto();

    this.cliBuildNoDts = !!buildOptions.cliBuildNoDts;

    if (!Array.isArray(this.copyto)) {
      this.copyto = [];
    }

    if (this.copyto.length === 0) {
      Helpers.log(
        `No need to --copyto on build finsh...(only copy to local temp proj) `,
      );
    }

    // console.log('this.copyto', this.copyto);

    this._isomorphicPackages = this.project.allIsomorphicPackagesFromMemory;

    Helpers.log(
      `Opearating on ${this.isomorphicPackages.length} isomorphic pacakges...`,
    );
    this.recreateTempProj();

    const files = Helpers.filesFrom(this.monitoredOutDir, true).filter(f =>
      f.endsWith('.js'),
    );

    for (let index = 0; index < files.length; index++) {
      const fileAbsPath = files[index];
      SourceMappingUrl.fixContent(fileAbsPath, this.projectWithBuild);
    }
    this.dtsFixer = TypescriptDtsFixer.for(this.isomorphicPackages);

    this.initWatching();
  }
  //#endregion

  //#region links ofr packages are ok
  linksForPackageAreOk(destination: Project): boolean {
    const destPackageLinkSourceLocation = crossPlatformPath(
      path.join(
        destination.location,
        config.folder.node_modules,
        this.rootPackageName,
        config.folder.source,
      ),
    );
    // console.log({ destPackageLinkSourceLocation });

    return Helpers.exists(destPackageLinkSourceLocation);
  }
  //#endregion

  //#region recreate temp proj
  recreateTempProj() {
    Helpers.remove(this.localTempProjPath);
    Helpers.writeFile([this.localTempProjPath, config.file.package_json], {
      name: path.basename(this.localTempProjPath),
      version: '0.0.0',
    });
    Helpers.mkdirp([this.localTempProjPath, config.folder.node_modules]);
  }
  //#endregion

  //#region init watching
  initWatching() {
    const monitoredOutDir = this.monitoredOutDir;
    const monitoredOutDirSharedAssets = this.monitoredOutDirSharedAssets;

    this.initOptions({
      folderPath: [monitoredOutDir, ...monitoredOutDirSharedAssets],
      folderPathContentCheck: [monitoredOutDir],
      taskName: 'CopyManager',
    });
  }
  //#endregion

  //#region local temp proj path
  get localTempProjPath() {
    const localProjPath = crossPlatformPath(
      path.join(this.project.location, this.tempProjName),
    );
    return localProjPath;
  }
  //#endregion

  //#region root package name
  /**
   * first folder in node_modules for packge
   * example:
   * project/node_modules/<rootPackageName> # like 'ng2-rest' or '@angular'
   */
  get rootPackageName() {
    const rootPackageName =
      _.isString(this.renameDestinationFolder) &&
      this.renameDestinationFolder !== ''
        ? this.renameDestinationFolder
        : this.project.name;
    return rootPackageName;
  }
  //#endregion

  //#region monitored out dir
  get monitoredOutDir(): string {
    const monitorDir: string = crossPlatformPath(
      path.join(this.project.location, this.buildOptions.outDir),
    );
    return monitorDir;
  }

  get monitoredOutDirSharedAssets(): string[] {
    const monitorDir: string = crossPlatformPath(
      path.join(
        this.project.location,
        config.folder.src,
        config.folder.assets,
        config.folder.shared,
      ),
    );
    return [monitorDir];
  }
  //#endregion

  //#region initial fix for destination pacakge
  initalFixForDestination(destination: Project): void {
    const destPackageInNodeModules = crossPlatformPath(
      path.join(
        destination.location,
        config.folder.node_modules,
        this.rootPackageName,
      ),
    );

    for (
      let index = 0;
      index < CopyMangerHelpers.browserwebsqlFolders.length;
      index++
    ) {
      const currentBrowserFolder =
        CopyMangerHelpers.browserwebsqlFolders[index];
      const destPackageInNodeModulesBrowser = crossPlatformPath(
        path.join(destPackageInNodeModules, currentBrowserFolder),
      );

      if (Helpers.isSymlinkFileExitedOrUnexisted(destPackageInNodeModules)) {
        Helpers.removeFileIfExists(destPackageInNodeModules);
      }
      if (!Helpers.exists(destPackageInNodeModules)) {
        Helpers.mkdirp(destPackageInNodeModules);
      }
      if (
        Helpers.isSymlinkFileExitedOrUnexisted(destPackageInNodeModulesBrowser)
      ) {
        Helpers.removeFileIfExists(destPackageInNodeModulesBrowser);
      }
      if (!Helpers.exists(destPackageInNodeModulesBrowser)) {
        Helpers.mkdirp(destPackageInNodeModulesBrowser);
      }
    }
  }
  //#endregion

  //#region fix map files
  changedJsMapFilesInternalPathesForDebug(
    content: string,
    isBrowser: boolean,
    isForLaunchJsonDebugging: boolean,
    absFilePath: string,
  ): string {
    if (
      !content ||
      (!absFilePath.endsWith('.js.map') && !absFilePath.endsWith('.mjs.map'))
    ) {
      // Helpers.warn(`[copytomanager] Empty content for ${absFilePath}`);
      return content;
    }

    let toReplaceString2 = isBrowser
      ? `../tmp-libs-for-${this.buildOptions.outDir}/${this.project.name}/projects/${this.project.name}/${config.folder.src}`
      : `../tmp-source-${this.buildOptions.outDir}`;

    let toReplaceString1 = `"${toReplaceString2}`;

    if (isBrowser) {
      // TODO is angular maps not working in chrome debugger
      // content = content.replace(regex1, `"./${config.folder.src}`);
      // content = content.replace(regex2, config.folder.src);
    } else {
      if (isForLaunchJsonDebugging) {
        const regex2 = new RegExp(
          Helpers.escapeStringForRegEx(toReplaceString2),
          'g',
        );
        content = content.replace(regex2, `../${config.folder.src}`);
      } else {
        const regex1 = new RegExp(
          Helpers.escapeStringForRegEx(toReplaceString1),
          'g',
        );
        const regex2 = new RegExp(
          Helpers.escapeStringForRegEx(toReplaceString2),
          'g',
        );
        content = content.replace(regex1, `"./${config.folder.src}`);
        content = content.replace(regex2, config.folder.src);
      }
    }

    content = this.sourceMapContentFix(content, isBrowser, absFilePath);

    return content;
  }
  //#endregion

  //#region source map content fix
  sourceMapContentFix(
    content: string,
    isBrowser: boolean,
    absFilePath: string,
  ) {
    /**
     * QUICK_FIX backend debugging on window
     * (still third party debug does not work)
     */
    if (
      // process.platform === 'win32' &&
      !isBrowser
    ) {
      const json = JSON.parse(content);
      if (json) {
        json.sources = (json.sources || []).map((p: string) => {
          if (this.project.isInCiReleaseProject) {
            return '';
          }

          const localProjFolderName = `tmp-local-copyto-proj-${this.buildOptions.outDir}/${config.folder.node_modules}/${this.rootPackageName}`;
          let dirnameAbs = crossPlatformPath(path.dirname(absFilePath));
          if (dirnameAbs.includes(localProjFolderName)) {
            dirnameAbs = dirnameAbs.replace(
              `/${this.project.name}/${localProjFolderName}`,
              `/${this.project.name}/`,
            );
          }

          const resolved = crossPlatformPath(
            path.resolve(
              dirnameAbs,
              p.startsWith('./') ? p.replace('./', '') : p,
            ),
          );
          // const resolved = crossPlatformPath(path.resolve(p));
          // console.log({
          //   resolved,
          //   dirnameAbs,
          //   p
          // });
          return resolved;
        });
      }
      content = JSON.stringify(json);
    }
    return content;
  }
  //#endregion

  //#region remove source folder links
  removeSourceLinksFolders(location: string) {
    this.sourceFolders.forEach(sourceFolder => {
      const toRemoveLink = crossPlatformPath(path.join(location, sourceFolder));
      if (Helpers.isSymlinkFileExitedOrUnexisted(toRemoveLink)) {
        Helpers.remove(
          crossPlatformPath(path.join(location, sourceFolder)),
          true,
        );
      }
    });
  }
  //#endregion

  //#region copy shared assets
  copySharedAssets(destination: Project, isTempLocalProj: boolean) {
    const monitoredOutDirSharedAssets = this.monitoredOutDirSharedAssets;
    for (let index = 0; index < monitoredOutDirSharedAssets.length; index++) {
      const sharedAssetsPath = monitoredOutDirSharedAssets[index];
      const dest = destination.__node_modules.pathFor(
        `${
          this.project.__isStandaloneProject
            ? this.rootPackageName
            : `${this.rootPackageName}/${path.basename(
                path.dirname(path.dirname(path.dirname(sharedAssetsPath))),
              )}`
        }/${config.folder.assets}/${config.folder.shared}`,
      );

      Helpers.copy(sharedAssetsPath, dest, {
        copySymlinksAsFiles: true,
        overwrite: true,
        recursive: true,
      });
    }
  }
  //#endregion

  //#region copy compiled sources and declarations
  copyCompiledSourcesAndDeclarations(
    destination: Project,
    isTempLocalProj: boolean,
  ) {
    const monitorDir = isTempLocalProj //
      ? this.monitoredOutDir // other package are getting data from temp-local-projecg
      : this.localTempProj.__node_modules.pathFor(this.rootPackageName);

    if (isTempLocalProj) {
      // when destination === tmp-local-proj => fix d.ts imports in (dist)
      this.dtsFixer.processFolderWithBrowserWebsqlFolders(monitorDir);
    }

    //#region final copy from dist to node_moules/rootpackagename
    const pkgLocInDestNodeModules = destination.__node_modules.pathFor(
      this.rootPackageName,
    );
    const filter = Helpers.filterDontCopy(this.sourceFolders, monitorDir);

    this.removeSourceLinksFolders(pkgLocInDestNodeModules);

    Helpers.copy(monitorDir, pkgLocInDestNodeModules, {
      copySymlinksAsFiles: false,
      filter,
    });

    //#endregion
  }
  //#endregion

  //#region replace d.ts files in destination after copy
  replaceIndexDtsForEntryPorjIndex(destination: Project) {
    const location = destination.__node_modules.pathFor(this.rootPackageName);
    Helpers.writeFile(
      path.join(
        // override dts to easly debugging
        location,
        config.file.index_d_ts,
      ),
      `export * from './${config.folder.src}';\n`,
    );
  }
  //#endregion

  //#region add source symlinks
  addSourceSymlinks(destination: Project) {
    const source = crossPlatformPath(
      path.join(
        destination.__node_modules.pathFor(this.rootPackageName),
        config.folder.source,
      ),
    );

    const srcDts = crossPlatformPath([
      destination.__node_modules.pathFor(this.rootPackageName),
      'src.d.ts',
    ]);

    Helpers.removeIfExists(source);
    Helpers.createSymLink(this.sourcePathToLink, source);

    Helpers.writeFile(
      srcDts,
      `
// THIS FILE IS GENERATED
export * from './source';
// THIS FILE IS GENERATED
// please use command: taon build:watch to see here links for your globally builded lib code files
// THIS FILE IS GENERATED
            `.trimStart(),
    );
  }
  //#endregion

  //#region remove source symlinks
  removeSourceSymlinks(destination: Project) {
    const srcDts = crossPlatformPath([
      destination.__node_modules.pathFor(this.rootPackageName),
      'src.d.ts',
    ]);

    Helpers.writeFile(
      srcDts,
      `
// THIS FILE IS GENERATED
export * from './source';
// THIS FILE IS GENERATED
// please use command: taon build:watch to see here links for your globally builded lib code files
// THIS FILE IS GENERATED
            `.trimStart(),
    );

    const source = crossPlatformPath(
      path.join(
        destination.__node_modules.pathFor(this.rootPackageName),
        config.folder.source,
      ),
    );

    Helpers.removeIfExists(source);
  }
  //#endregion

  //#region copy source maps
  /**
   *
   * @param destination that already has node_modues/rootPackagename copied
   * @param isTempLocalProj
   */
  copySourceMaps(destination: Project, isTempLocalProj: boolean) {
    if (isTempLocalProj) {
      // destination === tmp-local-proj
      this.fixBackendAndBrowserJsMapFilesInLocalProj();
    } else {
      this.copyBackendAndBrowserJsMapFilesFromLocalProjTo(destination);
    }
  }
  //#endregion

  //#region fix js map files in destination folder
  fixJsMapFiles(
    destinationPackageLocation: string,
    currentBrowserFolder?: 'browser' | 'websql' | string,
  ) {
    const forBrowser = !!currentBrowserFolder;
    const filesPattern =
      `${destinationPackageLocation}` +
      `${forBrowser ? `/${currentBrowserFolder}` : ''}` +
      `/**/*.${forBrowser ? 'm' : ''}js.map`;

    // console.log({
    //   destinationPackageLocation,
    //   currentBrowserFolder,
    //   filesPattern
    // })
    const mapFiles = glob.sync(filesPattern, {
      ignore: forBrowser
        ? []
        : [`${config.folder.browser}/**/*.*`, `${config.folder.websql}/**/*.*`],
    });

    for (let index = 0; index < mapFiles.length; index++) {
      const absFilePath = mapFiles[index];
      const relative = crossPlatformPath(absFilePath).replace(
        destinationPackageLocation + '/',
        '',
      );
      this.writeFixedMapFile(forBrowser, relative, destinationPackageLocation);
    }
  }
  //#endregion

  //#region fix backend and browser js (m)js.map files (for proper debugging)
  /**
   *  fix backend and browser js (m)js.map files (for proper debugging)
   *
   * destination is (should be) tmp-local-project
   *
   * Fix for 2 things:
   * - debugging when in cli mode (fix in actual (dist)/(browser/websql)  )
   * - debugging when in node_modules of other project (fixing only tmp-local-project)
   * @param destinationPackageLocation desitnation/node_modues/< rootPackageName >
   */
  fixBackendAndBrowserJsMapFilesInLocalProj() {
    const destinationPackageLocation =
      this.localTempProj.__node_modules.pathFor(this.rootPackageName);

    for (
      let index = 0;
      index < CopyMangerHelpers.browserwebsqlFolders.length;
      index++
    ) {
      const currentBrowserFolder =
        CopyMangerHelpers.browserwebsqlFolders[index];
      this.fixJsMapFiles(destinationPackageLocation, currentBrowserFolder);
    }

    this.fixJsMapFiles(destinationPackageLocation);
  }
  //#endregion

  //#region copy map files from local proj to copyto proj§
  copyMapFilesesFromLocalToCopyToProj(
    destination: Project,
    tmpLocalProjPackageLocation: string,
  ) {
    const allMjsBrowserFiles = CopyMangerHelpers.browserwebsqlFolders
      .map(currentBrowserFolder => {
        const mjsBrowserFilesPattern =
          `${tmpLocalProjPackageLocation}/` +
          `${currentBrowserFolder}` +
          `/**/*.mjs.map`;

        const mjsBrwoserFiles = glob.sync(mjsBrowserFilesPattern);
        return mjsBrwoserFiles;
      })
      .reduce((a, b) => a.concat(b), []);

    const mapBackendFilesPattern = `${tmpLocalProjPackageLocation}/**/*.js.map`;
    const mapBackendFiles = glob.sync(mapBackendFilesPattern, {
      ignore: [
        `${config.folder.browser}/**/*.*`,
        `${config.folder.websql}/**/*.*`,
      ],
    });

    const toCopy = [...allMjsBrowserFiles, ...mapBackendFiles];

    for (let index = 0; index < toCopy.length; index++) {
      const fileAbsPath = toCopy[index];
      const fileRelativePath = fileAbsPath.replace(
        `${tmpLocalProjPackageLocation}/`,
        '',
      );
      const destAbs = crossPlatformPath(
        path.join(
          destination.__node_modules.pathFor(this.rootPackageName),
          fileRelativePath,
        ),
      );
      Helpers.copyFile(fileAbsPath, destAbs, { dontCopySameContent: false });
    }
  }
  //#endregion

  //#region copy backend and browser jsM (m)js.map files to destination location
  /**
   * Copy fixed maps from tmp-local-project to other projects
   *
   * @param destination any project other than tmp-local-proj
   */
  copyBackendAndBrowserJsMapFilesFromLocalProjTo(destination: Project) {
    const destinationPackageLocation =
      this.localTempProj.__node_modules.pathFor(this.rootPackageName);
    this.copyMapFilesesFromLocalToCopyToProj(
      destination,
      destinationPackageLocation,
    );
  }
  //#endregion

  //#region fix d.ts import with wrong package names
  fixDtsImportsWithWronPackageName(
    absOrgFilePathInDist: string,
    destinationFilePath: string,
  ) {
    if (absOrgFilePathInDist.endsWith('.d.ts')) {
      const contentToWriteInDestination =
        Helpers.readFile(absOrgFilePathInDist) || '';
      for (
        let index = 0;
        index < CopyMangerHelpers.browserwebsqlFolders.length;
        index++
      ) {
        const currentBrowserFolder =
          CopyMangerHelpers.browserwebsqlFolders[index];
        const newContent = this.dtsFixer.forContent(
          contentToWriteInDestination,
          // sourceFile,
          currentBrowserFolder,
        );
        if (newContent !== contentToWriteInDestination) {
          Helpers.writeFile(destinationFilePath, newContent);
        }
      }
    }
  }
  //#endregion

  //#region handle copy of asset file
  handleCopyOfAssetFile(absoluteAssetFilePath: string, destination: Project) {
    const monitoredOutDirSharedAssets = this.monitoredOutDirSharedAssets;
    for (let index = 0; index < monitoredOutDirSharedAssets.length; index++) {
      const folderAssetsShareAbsPath = monitoredOutDirSharedAssets[index];
      if (absoluteAssetFilePath.startsWith(folderAssetsShareAbsPath)) {
        const relativePath = absoluteAssetFilePath.replace(
          `${folderAssetsShareAbsPath}/`,
          '',
        );
        const dest = destination.__node_modules.pathFor(
          `${this.rootPackageName}/${config.folder.assets}/${config.folder.shared}/${relativePath}`,
        );
        Helpers.remove(dest, true);
        if (Helpers.exists(absoluteAssetFilePath)) {
          Helpers.copyFile(absoluteAssetFilePath, dest);
        }
      }
    }
  }
  //#endregion

  //#region handle copy of single file
  handleCopyOfSingleFile(
    destination: Project,
    isTempLocalProj: boolean,
    specyficFileRelativePath: string,
    wasRecrusive = false,
  ): void {
    specyficFileRelativePath = specyficFileRelativePath.replace(/^\//, '');

    Helpers.log(
      `Handle single file: ${specyficFileRelativePath} for ${destination.location}`,
    );

    if (this.notAllowedFiles.includes(specyficFileRelativePath)) {
      return;
    }

    if (!wasRecrusive) {
      this.preventWeakDetectionOfchanges(
        specyficFileRelativePath,
        destination,
        isTempLocalProj,
      );
    }

    const destinationFilePath = crossPlatformPath(
      path.normalize(
        path.join(
          destination.__node_modules.pathFor(this.rootPackageName),
          specyficFileRelativePath,
        ),
      ),
    );

    if (!isTempLocalProj) {
      const readyToCopyFileInLocalTempProj = crossPlatformPath(
        path.join(
          this.localTempProj.__node_modules.pathFor(this.rootPackageName),
          specyficFileRelativePath,
        ),
      );
      // Helpers.log(`Eqal content with temp proj: ${}`)
      if (Helpers.exists(readyToCopyFileInLocalTempProj)) {
        Helpers.copyFile(readyToCopyFileInLocalTempProj, destinationFilePath);
      }
      return;
    }

    let absOrgFilePathInDist = crossPlatformPath(
      path.normalize(
        path.join(
          this.project.location,
          this.buildOptions.outDir,
          specyficFileRelativePath,
        ),
      ),
    );

    // TODO QUICK_FIOX DISTINC WHEN IT COM FROM BROWSER
    // and do not allow
    if (destinationFilePath.endsWith('d.ts')) {
      const newAbsOrgFilePathInDist = absOrgFilePathInDist.replace(
        `/${this.buildOptions.outDir}/${specyficFileRelativePath}`,
        `/${this.buildOptions.outDir}-nocutsrc/${specyficFileRelativePath}`,
      );
      if (!Helpers.exists(newAbsOrgFilePathInDist)) {
        Helpers.log(
          `[copyto] New path does not exists or in browser | websql: ${newAbsOrgFilePathInDist}`,
        );
      } else {
        absOrgFilePathInDist = newAbsOrgFilePathInDist;
      }
    }

    this.fixDtsImportsWithWronPackageName(
      absOrgFilePathInDist,
      destinationFilePath,
    );

    const isBackendMapsFile = destinationFilePath.endsWith('.js.map');
    const isBrowserMapsFile = destinationFilePath.endsWith('.mjs.map');

    if (isBackendMapsFile || isBrowserMapsFile) {
      if (isBackendMapsFile) {
        this.writeFixedMapFile(
          false,
          specyficFileRelativePath,
          destination.__node_modules.pathFor(this.rootPackageName),
        );
      }
      if (isBrowserMapsFile) {
        this.writeFixedMapFile(
          true,
          specyficFileRelativePath,
          destination.__node_modules.pathFor(this.rootPackageName),
        );
      }
    } else {
      Helpers.writeFile(
        destinationFilePath,
        Helpers.readFile(absOrgFilePathInDist) || '',
      );
    }

    // TODO check this
    if (specyficFileRelativePath === config.file.package_json) {
      // TODO this is VSCODE/typescirpt new fucking issue
      // Helpers.copyFile(sourceFile, path.join(path.dirname(destinationFile), config.folder.browser, path.basename(destinationFile)));
    }
  }
  //#endregion

  //#region prevent not fixing files in dist when source map hasn't been changed
  /**
   * if I am changing just thing in single line - maps are not being triggered asynch (it is good)
   * BUT typescript/angular compiler changes maps files inside dist or dist/browser|websql
   *
   *
   */
  preventWeakDetectionOfchanges(
    specyficFileRelativePath: string,
    destination: Project,
    isTempLocalProj: boolean,
  ) {
    (() => {
      const specyficFileRelativePathBackendMap =
        specyficFileRelativePath.replace('.js', '.js.map');
      const possibleBackendMapFile = crossPlatformPath(
        path.normalize(
          path.join(this.monitoredOutDir, specyficFileRelativePathBackendMap),
        ),
      );

      if (Helpers.exists(possibleBackendMapFile)) {
        this.handleCopyOfSingleFile(
          destination,
          isTempLocalProj,
          specyficFileRelativePathBackendMap,
          true,
        );
      }
    })();

    (() => {
      const specyficFileRelativePathBackendMap =
        specyficFileRelativePath.replace('.js', '.d.ts');
      const possibleBackendMapFile = crossPlatformPath(
        path.normalize(
          path.join(this.monitoredOutDir, specyficFileRelativePathBackendMap),
        ),
      );

      if (Helpers.exists(possibleBackendMapFile)) {
        this.handleCopyOfSingleFile(
          destination,
          isTempLocalProj,
          specyficFileRelativePathBackendMap,
          true,
        );
      }
    })();

    for (
      let index = 0;
      index < CopyMangerHelpers.browserwebsqlFolders.length;
      index++
    ) {
      const browserFolder = CopyMangerHelpers.browserwebsqlFolders[index];
      const specyficFileRelativePathBrowserMap =
        specyficFileRelativePath.replace('.mjs', '.mjs.map');
      const possibleBrowserMapFile = crossPlatformPath(
        path.normalize(
          path.join(
            this.monitoredOutDir,
            browserFolder,
            specyficFileRelativePathBrowserMap,
          ),
        ),
      );
      if (Helpers.exists(possibleBrowserMapFile)) {
        this.handleCopyOfSingleFile(
          destination,
          isTempLocalProj,
          specyficFileRelativePathBrowserMap,
          true,
        );
      }
    }
  }
  //#endregion

  //#region write fixed map files for non cli
  /**
   * fix content of map files in destination package location
   */
  writeFixedMapFileForNonCli(
    isForBrowser: boolean,
    specyficFileRelativePath: string,
    destinationPackageLocation: string,
  ) {
    //#region map fix for node_moules/pacakge
    const absMapFilePathInLocalProjNodeModulesPackage = crossPlatformPath(
      path.join(destinationPackageLocation, specyficFileRelativePath),
    );

    // console.log('SHOULD FIX NON CLI', {
    //   absMapFilePathInLocalProjNodeModulesPackage
    // })

    if (
      Helpers.exists(absMapFilePathInLocalProjNodeModulesPackage) &&
      !Helpers.isFolder(absMapFilePathInLocalProjNodeModulesPackage) &&
      !Helpers.isSymlinkFileExitedOrUnexisted(
        absMapFilePathInLocalProjNodeModulesPackage,
      ) &&
      path.basename(absMapFilePathInLocalProjNodeModulesPackage) !==
        config.file.package_json // TODO QUICK_FIX
    ) {
      const fixedContentNonCLI = this.changedJsMapFilesInternalPathesForDebug(
        Helpers.readFile(absMapFilePathInLocalProjNodeModulesPackage),
        isForBrowser,
        false,
        absMapFilePathInLocalProjNodeModulesPackage,
      );

      Helpers.writeFile(
        absMapFilePathInLocalProjNodeModulesPackage,
        fixedContentNonCLI,
      );
    }

    //#endregion
  }

  writeFixedMapFileForCli(
    isForBrowser: boolean,
    specyficFileRelativePath: string,
    destinationPackageLocation: string,
  ) {
    //#region mpa fix for CLI
    const monitoredOutDirFileToReplaceBack = crossPlatformPath(
      path.join(this.monitoredOutDir, specyficFileRelativePath),
    );

    // console.log('SHOULD FIX CLI', {
    //   monitoredOutDirFileToReplaceBack
    // })

    if (
      Helpers.exists(monitoredOutDirFileToReplaceBack) &&
      !Helpers.isFolder(monitoredOutDirFileToReplaceBack) &&
      !Helpers.isSymlinkFileExitedOrUnexisted(
        monitoredOutDirFileToReplaceBack,
      ) &&
      path.basename(monitoredOutDirFileToReplaceBack) !==
        config.file.package_json // TODO QUICK_FIX
    ) {
      const fixedContentCLIDebug = this.changedJsMapFilesInternalPathesForDebug(
        Helpers.readFile(monitoredOutDirFileToReplaceBack),
        isForBrowser,
        true,
        monitoredOutDirFileToReplaceBack,
      );

      Helpers.writeFile(monitoredOutDirFileToReplaceBack, fixedContentCLIDebug);
    }

    //#endregion
  }
  //#endregion

  //#region write fixed map files
  /**
   *
   * @param isForBrowser
   * @param specyficFileRelativePath
   * @param destinationPackageLocation should be ONLY temp project
   */
  protected writeFixedMapFile(
    isForBrowser: boolean,
    specyficFileRelativePath: string,
    destinationPackageLocation: string,
  ) {
    this.writeFixedMapFileForNonCli(
      isForBrowser,
      specyficFileRelativePath,
      destinationPackageLocation,
    );
    this.writeFixedMapFileForCli(
      isForBrowser,
      specyficFileRelativePath,
      destinationPackageLocation,
    );
  }
  //#endregion

  //#region update backend full dts files
  updateBackendFullDtsFiles(destinationOrDist: Project | string) {
    const base = crossPlatformPath([
      this.project.location,
      `${this.buildOptions.outDir}-nocutsrc`,
    ]);

    const filesToUpdate = Helpers.filesFrom(base, true)
      .filter(f => f.endsWith('.d.ts'))
      .map(f => f.replace(`${base}/`, ''));

    for (let index = 0; index < filesToUpdate.length; index++) {
      const relativePath = filesToUpdate[index];
      const source = crossPlatformPath(path.join(base, relativePath));
      const dest = crossPlatformPath(
        path.join(
          _.isString(destinationOrDist)
            ? this.monitoredOutDir
            : destinationOrDist.__node_modules.pathFor(this.rootPackageName),
          relativePath,
        ),
      );
      // if (Helpers.exists(dest)) {
      // console.log(dest);
      const sourceContent = Helpers.readFile(source);

      Helpers.writeFile(dest, this.dtsFixer.forBackendContent(sourceContent));
      // }
    }
  }
  //#endregion
}
