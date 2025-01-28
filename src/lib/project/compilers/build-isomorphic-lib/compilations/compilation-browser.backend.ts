//#region imports
import {
  _,
  path,
  fse,
  rimraf,
  crossPlatformPath,
  CoreModels,
} from 'tnp-core/src';
import { IncCompiler } from 'incremental-compiler/src';
import { config } from 'tnp-config/src';
import { Helpers } from 'tnp-helpers/src';
import { BackendCompilation } from './compilation-backend.backend';
import { BuildOptions } from '../../../../options';
import { Project } from '../../../abstract/project';
import { JSON10 } from 'json10/src';
import { CodeCut } from '../code-cut/code-cut.backend';
import { codeCuttFn } from '../code-cut/cut-fn.backend';
import { TAGS } from 'tnp-config/src';
import { Models } from '../../../../models';
//#endregion

export class BroswerCompilation extends BackendCompilation {
  /**
   * @deprecated
   */
  private static instances = {} as { [websql: string]: BroswerCompilation };

  //#region fields & getters
  compilerName = 'Browser standard compiler';
  public codecut: CodeCut;

  /**
   * ex: <project-path>/tmp-src-dist
   */
  public get absPathTmpSrcDistFolder() {
    if (_.isString(this.sourceOutBrowser) && _.isString(this.cwd)) {
      return crossPlatformPath(path.join(this.cwd, this.sourceOutBrowser));
    }
  }
  get customCompilerName() {
    if (this.ENV) {
      return `Browser compilation for ${this.ENV.currentProjectName}`;
    }
    return `Browser compilation`;
  }

  //#endregion

  //#region constructor
  readonly project: Project;
  constructor(
    isWatchBuild: boolean,
    public compilationProject: Project,
    public moduleName: string,
    public ENV: Models.EnvConfig,
    /**
     * tmp-src-for-(dist)-browser
     */
    protected sourceOutBrowser: string,
    /**
     * browser-for-(dist|projectName)
     */
    outFolder: CoreModels.OutFolder,
    location: string,
    cwd: string,
    public backendOutFolder: string,
    public buildOptions: BuildOptions,
  ) {
    super(
      buildOptions,
      isWatchBuild,
      outFolder,
      location,
      cwd,
      buildOptions.websql,
    );
    BroswerCompilation.instances[String(!!buildOptions.websql)] = this;
    this.compilerName = this.customCompilerName;

    Helpers.log(
      `[BroswerCompilation][constructor]

    compilationProject.genericName: ${compilationProject?.genericName}
    compilationProject.type: ${compilationProject?.type}
    ENV?: ${!!ENV}

    cwd: ${cwd}
    sourceOut: ${sourceOutBrowser}
    location: ${location}
    backendOut: ${backendOutFolder}

    `,
      1,
    );

    Helpers.log(`\n\nbuildOptions: ${JSON10.stringify(buildOptions)}\n\n`, 2);

    // console.log('SOURCE OUT', sourceOut)
    // console.log('OUT FOLDER', outFolder)
    // console.log('LOCATION', location)
    // console.log('MODULE NAME', moduleName)
    // console.log(Helpers.terminalLine())
    this.project = Project.ins.From(this.cwd) as Project;
  }
  //#endregion

  //#region methods

  //#region methods / sync action
  async syncAction(absFilesFromSrc: string[]) {
    Helpers.removeFolderIfExists(this.absPathTmpSrcDistFolder);
    Helpers.mkdirp(this.absPathTmpSrcDistFolder);

    const tmpSource = this.absPathTmpSrcDistFolder.replace(
      'tmp-src-',
      'tmp-source-',
    );
    Helpers.removeFolderIfExists(tmpSource);
    Helpers.mkdirp(tmpSource);

    this.initCodeCut();
    this.project.quickFixes.recreateTempSourceNecessaryFiles('dist');

    const filesBase = crossPlatformPath(path.join(this.cwd, this.srcFolder));
    const relativePathesToProcess = absFilesFromSrc.map(absFilePath => {
      return absFilePath.replace(`${filesBase}/`, '');
    });

    //#region copy core asset files
    if (!this.project.__isSmartContainerTarget) {
      const corepro = Project.by(
        'isomorphic-lib',
        this.project.__frameworkVersion,
      ) as Project;
      const coreAssetsPath = corepro.pathFor('app/src/assets');
      const filesToCopy = Helpers.filesFrom(coreAssetsPath, true);
      for (let index = 0; index < filesToCopy.length; index++) {
        const fileAbsPath = crossPlatformPath(filesToCopy[index]);
        const relativeFilePath = fileAbsPath.replace(`${coreAssetsPath}/`, '');
        const destAbsPath = crossPlatformPath([
          this.absPathTmpSrcDistFolder,
          config.folder.assets,
          relativeFilePath,
        ]);
        Helpers.copyFile(fileAbsPath, destAbsPath);
        // if (relativeFilePath.startsWith(`${config.folder.shared}/`)) {
        //   const arr = [
        //     crossPlatformPath([this.cwd, config.folder.dist]),
        //   ];
        //   for (let index = 0; index < arr.length; index++) {
        //     const absPathDest = crossPlatformPath([arr[index], config.folder.assets, relativeFilePath]);
        //     Helpers.copyFile(fileAbsPath, absPathDest);
        //   }
        // }
      }
    }
    //#endregion

    this.codecut.files(relativePathesToProcess);
    this.project.__assetsManager.copyExternalAssets(
      this.buildOptions?.outDir,
      this.buildOptions?.websql,
    );
    // process.exit(0)
  }
  //#endregion

  //#region methods / async action
  async asyncAction(event: IncCompiler.Change) {
    // console.log('ASYNC ACTION CODE CUT ', event.fileAbsolutePath);
    if (!this.codecut) {
      // TODO QUICK - but I thin it make sense => there is not backedn compilation for websql
      return;
    }

    if (!this.buildOptions.websql) {
      // TODO QUICK_FIX QUICK_DIRTY_FIX
      const websqlInstance =
        BroswerCompilation.instances[String(!this.buildOptions.websql)];
      await websqlInstance.asyncAction(event);
    }

    const absoluteFilePath = crossPlatformPath(event.fileAbsolutePath);
    const relativeFilePath = crossPlatformPath(
      absoluteFilePath.replace(
        `${crossPlatformPath(path.join(this.cwd, this.srcFolder))}/`,
        '',
      ),
    );
    if (path.basename(relativeFilePath) === '.DS_Store') {
      return;
    }

    const destinationFilePath = crossPlatformPath(
      path.join(this.cwd, this.sourceOutBrowser, relativeFilePath),
    );
    const destinationFileBackendPath = crossPlatformPath(
      path.join(
        this.cwd,
        this.sourceOutBrowser.replace('tmp-src', 'tmp-source'),
        relativeFilePath,
      ),
    );

    if (event.eventName === 'unlinkDir') {
      Helpers.removeFolderIfExists(destinationFilePath);
      Helpers.removeFolderIfExists(destinationFileBackendPath);
    } else {
      if (event.eventName === 'unlink') {
        if (relativeFilePath.startsWith(`${config.folder.assets}/`)) {
          this.codecut.files([relativeFilePath], true);
        } else {
          Helpers.removeFileIfExists(destinationFilePath);
          Helpers.removeFileIfExists(destinationFileBackendPath);
        }
      } else {
        if (fse.existsSync(absoluteFilePath)) {
          //#region mkdirp basedir
          if (!fse.existsSync(path.dirname(destinationFilePath))) {
            fse.mkdirpSync(path.dirname(destinationFilePath));
          }
          if (!fse.existsSync(path.dirname(destinationFileBackendPath))) {
            fse.mkdirpSync(path.dirname(destinationFileBackendPath));
          }
          //#endregion

          //#region remove deist if directory
          if (
            fse.existsSync(destinationFilePath) &&
            fse.lstatSync(destinationFilePath).isDirectory()
          ) {
            fse.removeSync(destinationFilePath);
          }
          if (
            fse.existsSync(destinationFileBackendPath) &&
            fse.lstatSync(destinationFileBackendPath).isDirectory()
          ) {
            fse.removeSync(destinationFileBackendPath);
          }
          //#endregion

          this.codecut.files([relativeFilePath]);
        }
      }
    }
  }
  //#endregion

  //#region methods / init code cut
  initCodeCut() {
    // console.log('inside')
    let env: Models.EnvConfig = this.ENV;
    const compilationProject: Project = this.compilationProject;
    if (!compilationProject) {
      return;
    }
    env = _.cloneDeep(env);
    this.ENV = env;
    // console.log('here1')

    let project: Project;
    if (env) {
      project = Project.ins.From(env.currentProjectLocation);
    }

    if (compilationProject.__isStandaloneProject) {
      project = compilationProject;
    }

    const replacements = [];

    replacements.push([TAGS.BACKEND_FUNC, `return (void 0);`]);
    replacements.push(TAGS.BACKEND as any);

    if (!this.buildOptions.websql) {
      replacements.push(TAGS.WEBSQL_ONLY as any);
      replacements.push([TAGS.WEBSQL_FUNC, `return (void 0);`]);
      replacements.push(TAGS.WEBSQL as any);
    }

    replacements.push([TAGS.CUT_CODE_IF_TRUE, codeCuttFn(true)]);
    replacements.push([TAGS.CUT_CODE_IF_FALSE, codeCuttFn(false)]);

    this.codecut = new CodeCut(
      this.absPathTmpSrcDistFolder,
      {
        replacements: replacements.filter(f => !!f),
        env,
      },
      project,
      compilationProject,
      this.buildOptions,
      this.sourceOutBrowser,
    );
  }
  //#endregion

  //#endregion
}
