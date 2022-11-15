//#region imports
import { crossPlatformPath, _ } from 'tnp-core';
import { fse } from 'tnp-core'
import { path } from 'tnp-core'
import { glob } from 'tnp-core';
import { chokidar } from 'tnp-core';
import { config, ConfigModels } from 'tnp-config';
import { Project } from '../../abstract';
import { Models } from 'tnp-models';
import { Helpers } from 'tnp-helpers';;
import { BuildOptions, TnpDB } from 'tnp-db';
import { FeatureForProject, FeatureCompilerForProject } from '../../abstract';
import { CopyMangerHelpers } from './copy-manager-helpers.backend';
import { IncCompiler } from 'incremental-compiler';
import { Log } from 'ng2-logger';

const log = Log.create(_.startCase(path.basename(__filename)));
//#endregion

const browserwebsqlFolders = [
  config.folder.browser,
  config.folder.websql,
]

export class CopyManager extends FeatureCompilerForProject {

  //#region fields
  // TODO remove this
  private readonly isomorphicPackages = [] as string[];
  private readonly projectChildren = [] as Project[];
  private readonly copyto: Project[] = [];
  private readonly args: string;
  private readonly outDir: Models.dev.BuildDir;
  private readonly watch: boolean;
  private renameDestinationFolder?: string;
  //#endregion

  //#region getters

  //#region getters / target
  get targetProjNameForOrgBuild() {
    const target = _.first((this.args || '').split(' ')).replace('/', '')
    return target;
  }
  //#endregion

  //#region getters / project copyto
  projectToCopyTo(outdir: Models.dev.BuildDir) {
    if (Array.isArray(this.copyto) && this.copyto.length > 0) {
      // @ts-ignore
      return [
        this.localTempProj(outdir),
        ...this.copyto,
      ] as Project[];
    }
    return [this.localTempProj(outdir)];
  }
  //#endregion

  //#region getters / is origanization package build
  get isOrganizationPackageBuild() {
    const isOrganizationPackageBuild = this.project.isSmartContainer;
    return isOrganizationPackageBuild;
  }
  //#endregion

  //#endregion

  //#region api

  //#region api / async action
  @IncCompiler.methods.AsyncAction()
  async asyncAction(event: IncCompiler.Change) {
    const absoluteFilePath = crossPlatformPath(event.fileAbsolutePath);

    const outDir = this.outDir;
    const specyficFileRelativePath = absoluteFilePath.replace(this.monitoredOutDir(outDir) + '/', '');

    Helpers.log(`ASYNC ACTION
    absoluteFilePath: ${absoluteFilePath}
    specyficFileRelativePath: ${specyficFileRelativePath}
    `);
    const projectToCopyTo = this.projectToCopyTo(outDir)

    for (let index = 0; index < projectToCopyTo.length; index++) {
      const projectToCopy = projectToCopyTo[index];
      this._copyBuildedDistributionTo(projectToCopy,
        {
          specyficFileRelativePath: event && specyficFileRelativePath,
          outDir: outDir as any,
          event
        }
      );
    }
  }
  //#endregion

  //#region api / sync action
  async syncAction(files: string[]) {
    Helpers.log('SYNC ACTION');

    const outDir = this.outDir;

    const projectToCopyTo = this.projectToCopyTo(outDir);

    for (let index = 0; index < projectToCopyTo.length; index++) {
      const projectToCopy = projectToCopyTo[index];
      log.data(`copying to ${projectToCopy?.name}`)
      this._copyBuildedDistributionTo(projectToCopy,
        {
          outDir: outDir as any,
          files
        }
      );
      log.data('copy done...')
    }
  }
  //#endregion

  //#region api / init
  public init(
    buildOptions: Omit<BuildOptions, 'websql'>,
    renameDestinationFolder?: string,
  ) {
    this.renameDestinationFolder = renameDestinationFolder;

    // @ts-ignore
    this.outDir = buildOptions.outDir;
    // @ts-ignore
    this.copyto = buildOptions.copyto;
    // @ts-ignore
    this.args = buildOptions.args;
    // @ts-ignore
    this.watch = !!buildOptions.watch;

    if (!Array.isArray(this.copyto)) {
      // @ts-ignore
      this.copyto = [];
    }

    if (this.copyto.length === 0) {
      Helpers.log(`No need to --copyto on build finsh...(only copy to local temp proj) `);
    }

    // @ts-ignore
    this.projectChildren = this.project.children;

    // @ts-ignore
    this.isomorphicPackages = this.project.availableIsomorphicPackagesInNodeModules;
    Helpers.log(`Opearating on ${this.isomorphicPackages.length} isomorphic pacakges...`);



    Helpers.remove(this.localTempProjPath(this.outDir));
    Helpers.writeFile(this.localTempProjPathes(this.outDir).packageJson, {
      name: path.basename(this.localTempProjPath(this.outDir)),
      version: '0.0.0'
    });
    Helpers.mkdirp(this.localTempProjPathes(this.outDir).nodeModules);

    const monitorDir = this.monitoredOutDir(buildOptions.outDir);

    const toMonitorBrowser = browserwebsqlFolders
      .map(currentBrowserFolder => path.join(monitorDir, currentBrowserFolder));

    if (this.project.isStandaloneProject) {
      this.initOptions({
        folderPath: [
          path.join(monitorDir, config.file.package_json),
          path.join(monitorDir, config.file.index_d_ts),
          path.join(monitorDir, config.file.index_js),
          path.join(monitorDir, config.file.index_js_map),
          path.join(monitorDir, config.folder.lib),

          ...toMonitorBrowser,
        ],
        folderPathContentCheck: [
          path.join(monitorDir, config.folder.lib),
          ...toMonitorBrowser,
        ]
      })
    }
    if (this.project.isSmartContainer) {
      // console.log({ monitorDir })
      this.initOptions({
        folderPath: [
          monitorDir,
        ],
        folderPathContentCheck: [
          monitorDir
        ]
      })
    }
  }
  //#endregion

  //#region api / generate source copy in
  public generateSourceCopyIn(destinationLocation: string,
    options?: Models.other.GenerateProjectCopyOpt): boolean {
    destinationLocation = crossPlatformPath(destinationLocation);
    //#region fix options
    if (_.isUndefined(options)) {
      options = {} as any;
    }
    if (_.isUndefined(options.filterForBundle)) {
      options.filterForBundle = true;
    }
    if (_.isUndefined(options.forceCopyPackageJSON)) {
      options.forceCopyPackageJSON = false;
    }
    if (_.isUndefined(options.ommitSourceCode)) {
      options.ommitSourceCode = false;
    }
    if (_.isUndefined(options.override)) {
      options.override = true;
    }
    if (_.isUndefined(options.showInfo)) {
      options.showInfo = true;
    }
    if (_.isUndefined(options.regenerateProjectChilds)) {
      options.regenerateProjectChilds = false;
    }
    if (_.isUndefined(options.useTempLocation)) {
      options.useTempLocation = true;
    }
    if (_.isUndefined(options.markAsGenerated)) {
      options.markAsGenerated = true;
    }
    if (_.isUndefined(options.regenerateOnlyCoreProjects)) {
      options.regenerateOnlyCoreProjects = true;
    }
    //#endregion

    const { override, showInfo, markAsGenerated } = options;

    const sourceLocation = this.project.location;
    //#region modify package.json for generated
    var packageJson: Models.npm.IPackageJSON = fse.readJsonSync(path.join(
      sourceLocation,
      config.file.package_json
    ), {
      encoding: 'utf8'
    });
    if (markAsGenerated && packageJson && packageJson.tnp) {
      packageJson.tnp.isGenerated = true;
    }
    if (this.project.isContainerWorkspaceRelated || options.forceCopyPackageJSON) {
      if (this.project.isWorkspace && markAsGenerated) {
        packageJson.tnp.isCoreProject = false;
      }
    }
    //#endregion

    //#region execute copy
    if (fse.existsSync(destinationLocation)) {
      if (override) {
        Helpers.tryRemoveDir(destinationLocation);
        Helpers.mkdirp(destinationLocation);
      } else {
        if (showInfo) {
          Helpers.warn(`Destination for project "${this.project.name}" already exists, only: source copy`);
        };
      }
    }

    CopyMangerHelpers.executeCopy(sourceLocation, destinationLocation, options, this.project);
    //#endregion

    //#region handle additional package.json markings
    if (this.project.isContainerWorkspaceRelated || this.project.isVscodeExtension || options.forceCopyPackageJSON) {
      const packageJsonLocation = path.join(destinationLocation, config.file.package_json);
      // console.log(`packageJsonLocation: ${ packageJsonLocation } `)
      // console.log('packageJson', packageJson)
      fse.writeJsonSync(packageJsonLocation, packageJson, {
        spaces: 2,
        encoding: 'utf8'
      });
      // console.log(`packageJsonLocation saved: ${ packageJsonLocation } `)
    }
    if (this.project.isWorkspace) {
      if (options.markAsGenerated) {
        Helpers.writeFile(path.resolve(path.join(destinationLocation, '../info.txt')), `
    This workspace is generated.
    `);
      } else {
        Helpers.writeFile(path.resolve(path.join(destinationLocation, '../info.txt')), `
    This is container for workspaces.
    `);
      }
    }
    //#endregion

    if (showInfo) {
      //#region show info about generation
      let dir = path.basename(path.dirname(destinationLocation));
      if (fse.existsSync(path.dirname(path.dirname(destinationLocation)))) {
        dir = `${path.basename(path.dirname(path.dirname(destinationLocation)))}/${dir}`
      }
      Helpers.info(`Source of project "${this.project.genericName}" generated in ${dir} /(< here >) `);
      //#endregion
    }

    //#region recrusive execution for childrens
    if (options.regenerateProjectChilds && this.project.isContainerWorkspaceRelated) {
      let childs = this.project.children.filter(f => !['lib', 'app'].includes(path.basename(f.location)));

      if (options.regenerateOnlyCoreProjects) {
        if (this.project.isCoreProject) {
          if (this.project.isContainer) {
            childs = this.project.children.filter(c => c.name === 'workspace');
          }

          if (this.project.isWorkspace) {
            childs = this.project.children.filter(c => config.projectTypes.forNpmLibs.includes(c.name as any));
          }
        } else {
          childs = [];
        }
      }

      childs.forEach(c => {
        // console.log('GENERATING CHILD ' + c.genericName)
        c.copyManager.generateSourceCopyIn(path.join(destinationLocation, c.name), options);
      });
    }
    //#endregion

    return true;
  }
  //#endregion

  //#endregion

  //#region private methods

  //#region private methods / copy build distribution to
  public copyBuildedDistributionTo(destination: Project) {
    return this._copyBuildedDistributionTo(destination);
  }

  /**
  * There are 3 typese of --copyto build
  * 1. dist build (wihout source maps buit without links)
  * 2. dist build (with source maps and links) - when no buildOptions
  * 3. same as 2 buit with watch
  */
  private _copyBuildedDistributionTo(
    destination: Project,
    options?: {
      specyficFileRelativePath?: string,
      outDir?: 'dist',
      event?: any,
      /**
       * sync action
       * all files - abs pathes
       */
      files?: string[]
    }
  ) {

    //#region init & prepare parameters
    const { specyficFileRelativePath = void 0, outDir = 'dist', event, files } = options || {};

    // if (!specyficFileRelativePath) {
    //   debugger
    //   Helpers.warn(`Invalid project: ${destination?.name}`)
    //   return;
    // }
    if (!destination || !destination?.location) {
      Helpers.warn(`Invalid project: ${destination?.name}`)
      return;
    }

    const isOrganizationPackageBuild = this.isOrganizationPackageBuild;
    const children = isOrganizationPackageBuild ? this.projectChildren : [];

    const rootPackageName = ((_.isString(this.renameDestinationFolder) && this.renameDestinationFolder !== '') ?
      this.renameDestinationFolder
      : (this.isOrganizationPackageBuild ? `@${this.project.name}` : this.project.name)
    );

    const isomorphicPackages = [
      ...this.isomorphicPackages,
      rootPackageName,
    ]

    const folderToLinkFromRootLocation = [
      config.folder.src,
    ];

    const isWatchBuild = (this.watch);
    const isTempLocalProj = (destination.location === this.localTempProjPath(outDir));

    const scope = {
      isomorphicPackages,
      isOrganizationPackageBuild,
      destination,
      rootPackageName,
      folderToLinkFromRootLocation,
      children,
      outDir,
      files,
      specyficFileRelativePath,
      isWatchBuild,
      isTempLocalProj,
    };

    // console.log(scope)


    if (!specyficFileRelativePath) {
      this.initalFixForDestinationPackage({
        ...scope
      });
    }


    const allFolderLinksExists = !isWatchBuild ? true : this.handleAllFilesActions({
      mode: 'check-dest-packge-source-link-ok',
      ...scope
    });


    // if(specyficFileRelativePath) {
    //   Helpers.log(`[${destination?.name}] Specyfic file change (allFolderLinksExists=${allFolderLinksExists}) (event:${event})`
    //   + ` ${outDir}${specyficFileRelativePath}`);
    // }
    //#endregion

    if (specyficFileRelativePath && allFolderLinksExists) {
      //#region handle single file
      this.handleCopyOfSingleFile({
        ...scope
      });
      //#endregion
    } else {
      //#region handle all files
      log.data('copying all files')
      this.handleAllFilesActions({
        mode: '1__copy-compiled-source-and-declarations',
        ...scope
      });


      if (isWatchBuild || isTempLocalProj) {
        log.data('addiing links')
        this.handleAllFilesActions({
          mode: 'add-links',
          ...scope,
        });
      } else {
        log.data('removing links')
        this.handleAllFilesActions({
          mode: 'remove-links',
          ...scope,
        });
      }

      log.d('copying surce maps')
      this.handleAllFilesActions({
        mode: '2__copy-source-maps',
        ...scope,
      });

      // TODO not working werid tsc issue with browser/index
      // {const projectOudBorwserSrc = path.join(destination.location,
      //   config.folder.node_modules,
      //   rootPackageName,
      //   config.file.package_json
      // );
      // const projectOudBorwserDest = path.join(destination.location,
      //   config.folder.node_modules,
      //   rootPackageName,
      //   config.folder.browser,
      //   config.file.package_json
      // );
      // Helpers.copyFile(projectOudBorwserSrc, projectOudBorwserDest);}
      //#endregion
    }

  }
  //#endregion

  //#region private methods / handle copy of single file
  private handleCopyOfSingleFile(options: {
    isOrganizationPackageBuild: boolean;
    destination: Project;
    folderToLinkFromRootLocation: string[];
    rootPackageName: string;
    children: Project[];
    isomorphicPackages: string[];
    outDir: Models.dev.BuildDir;
    specyficFileRelativePath: string;
    isWatchBuild: boolean;
    isTempLocalProj: boolean;
  }) {
    //#region handle single file

    const notAllowedFiles = [
      '.DS_Store',
      config.file.index_d_ts,
    ];

    const {
      destination,
      rootPackageName,
      specyficFileRelativePath,
      isOrganizationPackageBuild,
      outDir,
      children,
      isWatchBuild,
      isomorphicPackages,
      isTempLocalProj,
    } = options;

    let destinationFile = crossPlatformPath(path.normalize(path.join(destination.location,
      config.folder.node_modules,
      rootPackageName,
      specyficFileRelativePath
    )));

    const relativePath = specyficFileRelativePath.replace(/^\//, '');

    if (notAllowedFiles.includes(relativePath)) {
      return;
    }

    const sourceFileInLocalTempFolder = crossPlatformPath(path.join(
      this.localTempProjPathes(this.outDir).package(rootPackageName),
      specyficFileRelativePath
    ));

    if (!isTempLocalProj) {
      // Helpers.log(`Eqal content with temp proj: ${}`)
      Helpers.copyFile(sourceFileInLocalTempFolder, destinationFile);
      return;
    }

    const sourceFile = crossPlatformPath(isOrganizationPackageBuild
      ? path.normalize(path.join(// ORGANIZATION
        this.monitoredOutDir(outDir),
        specyficFileRelativePath
      )
      ) : path.normalize(path.join(
        this.project.location,
        outDir,
        specyficFileRelativePath
      )));

    let contentToWriteInDestination = (Helpers.readFile(sourceFile));

    contentToWriteInDestination = contentToWriteInDestination ? contentToWriteInDestination : '';

    if (path.basename(sourceFile).endsWith('.d.ts')) {
      for (let index = 0; index < browserwebsqlFolders.length; index++) {
        const currentBrowserFolder = browserwebsqlFolders[index];
        contentToWriteInDestination = fixDtsImport(
          contentToWriteInDestination,
          sourceFile,
          currentBrowserFolder,
          isomorphicPackages,
        );
      }
    }

    if (isWatchBuild || isTempLocalProj) {
      const isBackendMapsFile = destinationFile.endsWith('.js.map');
      const isBrowserMapsFile = destinationFile.endsWith('.mjs.map');

      if (isBackendMapsFile || isBrowserMapsFile) {
        if (isBackendMapsFile) {
          contentToWriteInDestination = this.transformMapFile({
            children, content: contentToWriteInDestination, outDir, isOrganizationPackageBuild, isBrowser: false
          });

          if (isTempLocalProj) {
            const monitoredOutDirFileToReplaceBack = crossPlatformPath(path.join(
              this.monitoredOutDir(outDir),
              crossPlatformPath(sourceFile).replace(this.monitoredOutDir(outDir), ''),
            ));


            Helpers.writeFile(monitoredOutDirFileToReplaceBack, this.transformMapFile({
              isForCliDebuggerToWork: true,
              content: contentToWriteInDestination, outDir, isOrganizationPackageBuild, isBrowser: false, children
            }));
          }

        }
        if (isBrowserMapsFile) {
          contentToWriteInDestination = this.transformMapFile({
            children, content: contentToWriteInDestination, outDir, isOrganizationPackageBuild, isBrowser: true
          });

          if (isTempLocalProj) {
            const monitoredOutDirFileToReplaceBack = crossPlatformPath(path.join(
              this.monitoredOutDir(outDir),
              crossPlatformPath(sourceFile).replace(this.monitoredOutDir(outDir), ''),
            ));

            Helpers.writeFile(monitoredOutDirFileToReplaceBack, this.transformMapFile({
              isForCliDebuggerToWork: true,
              content: contentToWriteInDestination, outDir, isOrganizationPackageBuild, isBrowser: true, children
            }));
          }


        }
      }
    }

    Helpers.writeFile(destinationFile, contentToWriteInDestination);

    // TODO check this
    if (relativePath === config.file.package_json) {
      // TODO this is VSCODE/typescirpt new fucking issue
      // Helpers.copyFile(sourceFile, path.join(path.dirname(destinationFile), config.folder.browser, path.basename(destinationFile)));
    }
    //#endregion
  }

  //#endregion

  //#region private methods / initial fix for destination
  private initalFixForDestinationPackage(options: {
    isOrganizationPackageBuild: boolean;
    destination: Project,
    rootPackageName: string,
    children: Project[],
  }) {
    const {
      isOrganizationPackageBuild,
      destination,
      rootPackageName,
      children,
    } = options;
    const destPackageInNodeModules = path.join(destination.location, config.folder.node_modules, rootPackageName);

    for (let index = 0; index < browserwebsqlFolders.length; index++) {
      const currentBrowserFolder = browserwebsqlFolders[index];
      const destPackageInNodeModulesBrowser = path.join(destPackageInNodeModules, currentBrowserFolder);

      if (isOrganizationPackageBuild) {
        Helpers.remove(destPackageInNodeModulesBrowser);
      } else {
        if (Helpers.isSymlinkFileExitedOrUnexisted(destPackageInNodeModules)) {
          Helpers.removeFileIfExists(destPackageInNodeModules);
        }
        if (!Helpers.exists(destPackageInNodeModules)) {
          Helpers.mkdirp(destPackageInNodeModules);
        }
        if (Helpers.isSymlinkFileExitedOrUnexisted(destPackageInNodeModulesBrowser)) {
          Helpers.removeFileIfExists(destPackageInNodeModulesBrowser);
        }
        if (!Helpers.exists(destPackageInNodeModulesBrowser)) {
          Helpers.mkdirp(destPackageInNodeModulesBrowser);
        }
      }

      if (isOrganizationPackageBuild) {
        for (let index = 0; index < children.length; index++) {
          const c = children[index];
          const childDestPackageInNodeModules = path.join(destPackageInNodeModules, childPureName(c))
          const childDestPackageInNodeModulesBrowser = path.join(
            destPackageInNodeModules,
            childPureName(c),
            currentBrowserFolder,
          );

          if (Helpers.isSymlinkFileExitedOrUnexisted(childDestPackageInNodeModules)) {
            Helpers.removeFileIfExists(childDestPackageInNodeModules);
          }
          if (!Helpers.exists(childDestPackageInNodeModules)) {
            Helpers.mkdirp(childDestPackageInNodeModules);
          }
          if (Helpers.isSymlinkFileExitedOrUnexisted(childDestPackageInNodeModulesBrowser)) {
            Helpers.removeFileIfExists(childDestPackageInNodeModulesBrowser);
          }
          if (!Helpers.exists(childDestPackageInNodeModulesBrowser)) {
            Helpers.mkdirp(childDestPackageInNodeModulesBrowser);
          }
        }
      }
    }


  }
  //#endregion

  //#region private methods / all files action
  private handleAllFilesActions(options: {
    isOrganizationPackageBuild: boolean;
    destination: Project;
    folderToLinkFromRootLocation: string[];
    rootPackageName: string;
    children: Project[];
    isomorphicPackages: string[];
    isTempLocalProj: boolean;
    mode: 'remove-links'
    | 'add-links'
    | 'check-dest-packge-source-link-ok'
    | '2__copy-source-maps'
    | '1__copy-compiled-source-and-declarations'
    ;
    outDir: Models.dev.BuildDir;
    files: string[],
  }) {
    const {
      isOrganizationPackageBuild,
      destination,
      folderToLinkFromRootLocation,
      rootPackageName,
      mode,
      isomorphicPackages,
      children,
      outDir,
      files,
      isTempLocalProj,
    } = options;

    //#region action
    const action = (options: {
      sourceFolder: string;
      sourceToLink: string;
      destPackageLinkSourceLocation: string;
    }, parent?: Project) => {
      const {
        sourceFolder,
        sourceToLink,
        destPackageLinkSourceLocation,
      } = options;
      const destPackageLocation = path.dirname(destPackageLinkSourceLocation);

      if (mode === 'remove-links') {
        //#region remove links to sources in destination packages
        Helpers.taskStarted('')
        Helpers.removeIfExists(destPackageLinkSourceLocation);
        //#endregion
      }
      if (mode === 'add-links') {
        //#region add links to source in destination packges
        Helpers.removeIfExists(destPackageLinkSourceLocation);
        Helpers.createSymLink(sourceToLink, destPackageLinkSourceLocation);
        //#endregion
      }
      if (mode == 'check-dest-packge-source-link-ok') {
        //#region check if destination pacakage has proper links to sources
        return Helpers.exists(destPackageLinkSourceLocation)
        //#endregion
      }

      const getSourceFolder = (monitorDir, currentBrowserFolder) => {
        const sourceBrowser = crossPlatformPath(isTempLocalProj ? path.join(
          path.dirname(monitorDir),
          currentBrowserFolder,
        ) : path.join(
          this.localTempProjPath(outDir),
          config.folder.node_modules,
          rootPackageName,
          currentBrowserFolder,
        ));
        return sourceBrowser;
      };

      if (mode === '1__copy-compiled-source-and-declarations') {
        //#region copy compiled source and declarations
        const monitorDir = isTempLocalProj
          ? this.monitoredOutDir(outDir)
          : this.localTempProjPathes(outDir).package(rootPackageName);

        const worksapcePackageName = path.basename(destPackageLocation);

        for (let index = 0; index < browserwebsqlFolders.length; index++) {
          const currentBrowserFolder = browserwebsqlFolders[index];
          const sourceBrowser = getSourceFolder(monitorDir, currentBrowserFolder);

          //#region fix d.ts files in angular build - problem with require() in d.ts with wrong name

          if (crossPlatformPath(destPackageLocation) === this.localTempProjPathes(outDir).package(rootPackageName)) {
            // debugger
            Helpers.log('Fixing .d.ts. files start...')
            const browserDtsFiles = Helpers.filesFrom(sourceBrowser, true).filter(f => f.endsWith('.d.ts'));
            // console.log({
            //   browserDtsFiles
            // })
            for (let index = 0; index < browserDtsFiles.length; index++) {
              const dtsFileAbsolutePath = browserDtsFiles[index];
              const dtsFileContent = Helpers.readFile(dtsFileAbsolutePath);
              const dtsFixedContent = fixDtsImport(
                dtsFileContent,
                dtsFileAbsolutePath,
                currentBrowserFolder,
                isomorphicPackages
              );
              if (dtsFileAbsolutePath.trim() !== dtsFileContent.trim()) {
                Helpers.writeFile(dtsFileAbsolutePath, dtsFixedContent);
              }
              // Helpers.log(`[] Fixing files: ${}`)
            }
            Helpers.log('Fixing .d.ts. files done.')
          }
        }


        //#endregion

        if (isOrganizationPackageBuild) {
          //#region organizaiton package copy
          for (let index = 0; index < browserwebsqlFolders.length; index++) {
            const currentBrowserFolder = browserwebsqlFolders[index];
            const sourceBrowser = getSourceFolder(monitorDir, currentBrowserFolder);

            Helpers.writeFile(path.join(destination.location,
              config.folder.node_modules,
              rootPackageName,
              config.file.index_d_ts,
            ),
              `// Plase use: import { < anything > } from '@${this.project.name}/<${children.map(c => c.name).join('|')}>';\n`
            );

            Helpers.copy(path.join(monitorDir, worksapcePackageName), destPackageLocation, {
              recursive: true,
              overwrite: true,
              omitFolders: [config.folder.browser, config.folder.websql, config.folder.node_modules]
            });

            const browserDest = path.join(
              destPackageLocation,
              currentBrowserFolder
            );

            Helpers.copy(sourceBrowser, browserDest, {
              recursive: true,
              overwrite: true,
            });

            const browserDestPackageJson = path.join(
              destPackageLocation,
              currentBrowserFolder,
              config.file.package_json,
            );
            const packageJsonBrowserDest = Helpers.readJson(browserDestPackageJson, {});
            packageJsonBrowserDest.name = worksapcePackageName;
            Helpers.writeJson(browserDestPackageJson, packageJsonBrowserDest);

            const browserDestPublicApiDest = path.join(
              destPackageLocation,
              currentBrowserFolder,
              'public-api.d.ts',
            );
            Helpers.writeFile(browserDestPublicApiDest,
              (worksapcePackageName === this.targetProjNameForOrgBuild) ? `
export * from './lib';\n
`.trimLeft() : `
export * from './libs/${worksapcePackageName}';\n
`.trimLeft()
            );
          }

          // TODO extract child specyfic things from browser build if it is possible
          //#endregion
        } else {
          //#region standalone package copy
          const sourceFolders = [
            config.folder.src,
            config.folder.node_modules,
            config.folder.tempSrcDist,
            config.file.package_json,
          ];
          const filter = Helpers.filterDontCopy(sourceFolders, monitorDir);

          sourceFolders.forEach(sourceFolder => {
            const toRemoveLink = crossPlatformPath(path.join(destPackageLocation, sourceFolder));
            if(Helpers.isSymlinkFileExitedOrUnexisted(toRemoveLink)) {
              Helpers.removeFileIfExists(crossPlatformPath(path.join(destPackageLocation, sourceFolder)));
            }
          })

          Helpers.copy(monitorDir, destPackageLocation, {
            copySymlinksAsFiles: false,
            // asSeparatedFiles: true,
            filter,
          });
          //#endregion
        }

        Helpers.writeFile(path.join( // override dts to easly debugging
          destPackageLocation,
          config.file.index_d_ts,
        ), `export * from './${this.project.sourceFolder}';\n`);

        //#endregion
      }

      if (mode === '2__copy-source-maps') {
        //#region copy source maps

        if (isTempLocalProj) {
          //#region fix files in local temp project
          for (let index = 0; index < browserwebsqlFolders.length; index++) {
            const currentBrowserFolder = browserwebsqlFolders[index];
            Helpers.log('fixing js.maps started...')
            const mjsBrowserFilesPattern = `${destPackageLocation}/`
              + `${currentBrowserFolder}`
              + `/**/*.mjs.map`;

            const mjsBrwoserFiles = glob.sync(mjsBrowserFilesPattern);

            // console.log({
            //   mjsBrowserFilesPattern,
            //   mjsBrwoserFiles
            // })

            mjsBrwoserFiles.forEach(f => {
              let orgContent = Helpers.readFile(f);
              Helpers.writeFile(f, this.transformMapFile({
                content: orgContent, outDir, isOrganizationPackageBuild, isBrowser: true, children
              }));

              const monitoredOutDirFileToReplaceBack = path.join(
                this.monitoredOutDir(outDir),
                crossPlatformPath(f).replace(this.localTempProjPathes(outDir).package(rootPackageName), ''),
              );
              Helpers.writeFile(monitoredOutDirFileToReplaceBack, this.transformMapFile({
                isForCliDebuggerToWork: true,
                content: orgContent, outDir, isOrganizationPackageBuild, isBrowser: true, children
              }));

            });
          }

          const mapBackendFilesPattern = `${destPackageLocation}/**/*.js.map`;
          const mpaBackendFiles = glob.sync(mapBackendFilesPattern,
            { ignore: [`${config.folder.browser}/**/*.*`, `${config.folder.websql}/**/*.*`] })


          mpaBackendFiles.forEach(f => {
            let orgContent = Helpers.readFile(f);
            Helpers.writeFile(f, this.transformMapFile({
              content: orgContent, outDir, isOrganizationPackageBuild, isBrowser: false, children
            }));
            const monitoredOutDirFileToReplaceBack = path.join(
              this.monitoredOutDir(outDir),
              crossPlatformPath(f).replace(this.localTempProjPathes(outDir).package(rootPackageName), ''),
            );
            Helpers.writeFile(monitoredOutDirFileToReplaceBack, this.transformMapFile({
              isForCliDebuggerToWork: true,
              content: orgContent, outDir, isOrganizationPackageBuild, isBrowser: false, children
            }));

          });
          Helpers.log('fixing js.maps done...')
          //#endregion
        } else {
          //#region for other project thatn local temp -> copy files from local tmep
          const localTempProjOutFolder = this.localTempProjPathes(outDir).package(rootPackageName);

          const allMjsBrowserFiles = browserwebsqlFolders.map(currentBrowserFolder => {
            const mjsBrowserFilesPattern = `${localTempProjOutFolder}/`
              + `${currentBrowserFolder}`
              + `/**/*.mjs.map`;

            const mjsBrwoserFiles = glob.sync(mjsBrowserFilesPattern);
            return mjsBrwoserFiles;
          }).reduce((a, b) => a.concat(b), [])



          const mapBackendFilesPattern = `${localTempProjOutFolder}/**/*.js.map`;
          const mapBackendFiles = glob.sync(mapBackendFilesPattern,
            { ignore: [`${config.folder.browser}/**/*.*`, `${config.folder.websql}/**/*.*`] })


          const toCopy = [
            ...allMjsBrowserFiles,
            ...mapBackendFiles,
          ];

          for (let index = 0; index < toCopy.length; index++) {
            const fileAbsPath = toCopy[index];
            const fileRelativePath = fileAbsPath.replace(`${localTempProjOutFolder}/`, '');
            const destAbs = crossPlatformPath(path.join(
              destination.location,
              config.folder.node_modules,
              rootPackageName,
              fileRelativePath,
            ));
            Helpers.copyFile(fileAbsPath, destAbs, { dontCopySameContent: false });
          }
          //#endregion
        }
        //#endregion
      }

    };
    //#endregion

    //#region execute actions
    for (let index = 0; index < folderToLinkFromRootLocation.length; index++) {
      const sourceFolder = folderToLinkFromRootLocation[index];
      if (isOrganizationPackageBuild) {
        //#region execture action for children when organization

        for (let index = 0; index < children.length; index++) {
          const c = children[index];
          const childName = childPureName(c);
          const sourceToLink = crossPlatformPath(path.join(c.location, sourceFolder));
          const destPackageLinkSourceLocation = crossPlatformPath(path.join(
            destination.location,
            config.folder.node_modules,
            rootPackageName,
            childName,
            sourceFolder
          ));

          const res = action({
            sourceFolder,
            sourceToLink,
            destPackageLinkSourceLocation
          }, this.project);
          if ((mode === 'check-dest-packge-source-link-ok') && !res) {
            return false;
          }
        }

        //#endregion
      } else {
        //#region execture action for standalone project
        const sourceToLink = crossPlatformPath(path.join(this.project.location, sourceFolder));
        const destPackageLinkSourceLocation = crossPlatformPath(path.join(
          destination.location,
          config.folder.node_modules,
          rootPackageName,
          sourceFolder
        ));
        const res = action({
          sourceFolder,
          sourceToLink,
          destPackageLinkSourceLocation,
        });
        if ((mode === 'check-dest-packge-source-link-ok') && !res) {
          return false;
        }
        //#endregion
      }
    }
    //#endregion

    return true;
  }
  //#endregion

  //#region private methods / transfor map file
  private transformMapFile(options: {
    content: string;
    outDir: Models.dev.BuildDir;
    isOrganizationPackageBuild: boolean;
    isBrowser: boolean;
    children: Project[];
    isForCliDebuggerToWork?: boolean,
  }) {

    const {
      isOrganizationPackageBuild,
      isBrowser,
      outDir,
      children,
      isForCliDebuggerToWork,
    } = options;
    let { content } = options;

    if (isOrganizationPackageBuild) {
      let toReplaceString2 = isBrowser
        ? `../tmp-libs-for-${outDir}/${this.project.name}/projects/${this.project.name}/${config.folder.src}`
        : `../../../tmp-source-${outDir}`;

      let toReplaceString1 = `"${toReplaceString2}`;
      const addon = `/libs/(${children.map(c => Helpers.escapeStringForRegEx(childPureName(c))).join('|')})`;
      const regex1 = new RegExp(Helpers.escapeStringForRegEx(toReplaceString1) + addon, 'g');
      const regex2 = new RegExp(Helpers.escapeStringForRegEx(toReplaceString2) + addon, 'g');

      if (isBrowser) { // TODO replace browser doesnt make sense ?? - for now yes
        // content = content.replace(regex1, `"./${config.folder.src}`);
        // content = content.replace(regex2, config.folder.src);
      } else {
        content = content.replace(regex1, `"./${config.folder.src}`);
        content = content.replace(regex2, config.folder.src);
      }

    } else {
      let toReplaceString2 = isBrowser
        ? `../tmp-libs-for-${outDir}/${this.project.name}/projects/${this.project.name}/${config.folder.src}`
        : `../tmp-source-${outDir}`;

      let toReplaceString1 = `"${toReplaceString2}`;


      if (isBrowser) { // TODO replace browser doesnt make sense ?? - for now yes
        // content = content.replace(regex1, `"./${config.folder.src}`);
        // content = content.replace(regex2, config.folder.src);
      } else {
        if (isForCliDebuggerToWork) { // TODO do same thing for organizaiton
          const regex2 = new RegExp(Helpers.escapeStringForRegEx(toReplaceString2), 'g');
          content = content.replace(regex2, `../${config.folder.src}`);
        } else {
          const regex1 = new RegExp(Helpers.escapeStringForRegEx(toReplaceString1), 'g');
          const regex2 = new RegExp(Helpers.escapeStringForRegEx(toReplaceString2), 'g');
          content = content.replace(regex1, `"./${config.folder.src}`);
          content = content.replace(regex2, config.folder.src);
        }

      }
    }

    return content;
  }
  //#endregion

  //#region private methods / monitored out dir
  private monitoredOutDir(outDir: Models.dev.BuildDir, project?: Project) {
    const proj = project ? project : this.project;
    const monitorDir: string = crossPlatformPath(
      proj.isSmartContainer
        ? path.join(proj.location, 'dist', proj.name, this.targetProjNameForOrgBuild, outDir, 'libs')
        : path.join(proj.location, outDir)
    );
    return monitorDir;
  }
  //#endregion

  //#region private methods / local temp proj path
  localTempProjPath(outdir: Models.dev.BuildDir) {
    return crossPlatformPath(path.join(this.project.location, `tmp-local-copyto-proj-${outdir}`));
  }
  //#endregion

  //#region private methods / local temp proj pathes
  localTempProjPathes(outdir: Models.dev.BuildDir) {
    const self = this;
    return {
      get packageJson() {
        return crossPlatformPath(path.join(self.localTempProjPath(outdir), config.file.package_json));
      },
      get nodeModules() {
        return crossPlatformPath(path.join(self.localTempProjPath(outdir), config.folder.node_modules));
      },
      package(rootPackageName: string) {
        return crossPlatformPath(path.join(self.localTempProjPath(outdir), config.folder.node_modules, rootPackageName));
      }
    }
  }
  //#endregion

  //#region private methods / local temp proj
  private localTempProj(outdir: Models.dev.BuildDir) {
    let localProj = Project.From(this.localTempProjPath(outdir)) as Project;
    return localProj;
  }
  //#endregion


  //#endregion

}

//#region helpers

function fixDtsImport(content: string, filepath: string, browserFolder: string, isomorphicPackages: string[]) {
  content = content ? content : '';

  // if(path.basename(filepath) === 'framework-context.d.ts') {
  //   debugger
  // }

  for (let index = 0; index < isomorphicPackages.length; index++) {
    const isomorphicPackageName = isomorphicPackages[index];
    content = (content || '').replace(
      new RegExp(Helpers.escapeStringForRegEx(`import("${isomorphicPackageName}"`), 'g'),
      `import("${isomorphicPackageName}/${browserFolder}"`);
  }

  return content;
}

function childPureName(child: Project) {
  return child.name.startsWith('@') ? child.name.split('/')[1] : child.name; // pure name
}
//#endregion
