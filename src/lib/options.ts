import { CoreModels, _, crossPlatformPath } from 'tnp-core/src';
import type { Project } from './project/abstract/project';
import { config } from 'tnp-config/src';
import { Models } from './models';
import { CLASS } from 'typescript-class-helpers/src';

//#region build options lib or app
class SystemTask<T> {
  protected constructor() {}
  finishCallback: () => any;
  public clone(override: Partial<T>): T {
    const classFn = CLASS.getFromObject(this);
    const result = _.merge(new classFn(), _.merge(_.cloneDeep(this), override));
    // console.log({result})
    return result;
  }
  copyto?: string[];
  copytoall?: boolean;
}

export class BaseBuild<T> extends SystemTask<T> {
  /**
   * watch build
   */
  watch: boolean;
  /**
   * build on remote server (user cannot interfere with console)
   * without user interaction
   */
  ci: boolean;

  /**
   * base-href -> is a part of lib code build
   *
   * overwite base href for app deployment.
   * Must be at least equal: '/'
   *
   * default: /
   * default for github pages standalone project: '/<project-name-or-overwritten>/'
   * default for organizaion main target: '/<project-name-or-overwritten>/'
   * default for organizaion main other targets: '/<project-name-or-overwritten>/-/<other-target-name>/'
   */
  get baseHref(): string {
    return this._baseHref;
  }
  set baseHref(v) {
    this._baseHref = crossPlatformPath(v);
  }
  private _baseHref: string;
  disableServiceWorker: boolean;
  buildAngularAppForElectron: boolean;
}

class BuildOptionsLibOrApp<T> extends BaseBuild<T> {
  cliBuildNoDts: boolean;
  cliBuildUglify: boolean;
  cliBuildObscure: boolean;
  cliBuildIncludeNodeModules: boolean;
  /**
   * Enable all production optimalization for build
   * - minification
   * - caches
   * etc.
   */
  prod: boolean;
}
//#endregion

//#region new options
export class NewOptions extends SystemTask<NewOptions> {
  branding: boolean;
}
//#endregion

//#region init options
export class InitOptions extends BaseBuild<InitOptions> {
  readonly alreadyInitedPorjects: Project[];
  private constructor() {
    super();
    this.alreadyInitedPorjects = [];
  }
  omitChildren: boolean;
  initiator: Project;
  /**
   * init only structre without deps
   */
  struct: boolean;
  websql: boolean;
  branding: boolean;

  public static from(options: Partial<InitOptions>): InitOptions {
    return instanceFrom(options, InitOptions);
  }

  public static fromBuild(options: BuildOptions): InitOptions {
    const initOptions = InitOptions.from({});

    const propsToInit = [
      'baseHref',
      'watch',
      'websql',
      'smartContainerTargetName',
      'ci',
      'targetApp',
      'prod',
      'disableServiceWorker',
      'buildAngularAppForElectron',
    ] as (keyof BuildOptions)[];

    for (const prop of propsToInit) {
      if (!_.isUndefined(options[prop])) {
        initOptions[prop] = options[prop];
      }
    }

    return initOptions;
  }

  public fillBaseHrefFromFile(project: Project) {}
}
//#endregion

//#region build options
export class BuildOptions extends BuildOptionsLibOrApp<BuildOptions> {
  readonly outDir: 'dist';
  readonly targetApp: 'pwa' | 'electron';
  get appBuild() {
    return this.buildType === 'app' || this.buildType === 'lib-app';
  }
  get libBuild() {
    return this.buildType === 'lib' || this.buildType === 'lib-app';
  }

  get temporarySrcForReleaseCutCode() {
    //#region @backendFunc
    return `tmp-cut-relase-src-${config.folder.dist}${this.websql ? '-websql' : ''}`;
    //#endregion
  }

  private constructor() {
    super();
    this.outDir = 'dist';
    this.targetApp = 'pwa';
  }
  /**
   *
   */
  websql: boolean;
  buildType: 'lib' | 'app' | 'lib-app';
  private _skipProjectProcess: boolean;
  /**
   * Skip project process for assigning automatic ports
   */
  get skipProjectProcess() {
    //#region @backendFunc
    return this._skipProjectProcess;
    //#endregion
  }
  set skipProjectProcess(value) {
    this._skipProjectProcess = value;
  }

  /**
   * override port number for app build
   */
  port: number;

  skipCopyManager: boolean;
  /**
   * build executed druring lib release
   */
  buildForRelease: boolean;

  /**
   * default: '<project-locaiton>/dist-app'
   * default for github page: '<project-location>/docs'
   */
  appBuildLocation: string;
  /**
   * Cut <@>notForNpm  tag from lib build
   */
  cutNpmPublishLibReleaseCode: boolean;
  /**
   * Do not generate backend code
   */
  genOnlyClientCode: boolean;
  /**
   * Generate only backend, without browser version
   */
  onlyBackend: boolean;
  /**
   * Optionally we can start build of smart container
   * with different app
   */
  smartContainerTargetName: string;

  public static from(
    options: Omit<Partial<BuildOptions>, 'appBuild' | 'serveApp'>,
  ): BuildOptions {
    return instanceFrom(options, BuildOptions);
  }
}
//#endregion

//#region release options
/**
 * @deprecated
 */
export class ReleaseOptions extends BuildOptionsLibOrApp<ReleaseOptions> {
  private constructor() {
    super();
    this.releaseType = 'patch';
    this.resolved = [];
  }
  releaseType: CoreModels.ReleaseVersionType;
  shouldReleaseLibrary: boolean;
  /**
   * build action only for specyfic framework version of prohect
   */
  frameworkVersion: CoreModels.FrameworkVersion;
  /**
   * start release on project
   */
  start?: string;
  /**
   * release only specified projects
   */
  only?: string | string[];
  /**
   * end release on project
   */
  end?: string;
  skipProjectProcess: boolean;
  /**
   * Projects to release in container
   */
  resolved: Project[];
  /**
   * quick automatic release of lib
   */
  automaticRelease: boolean;
  /**
   * quick automatic release of docs app(s)
   */
  automaticReleaseDocs: boolean;
  /**
   * @deprecated
   */
  specifiedVersion: string;
  /**
   * release only trusted projects for specific container framework version
   */
  trusted: boolean;
  releaseTarget: 'lib' | 'app' | 'lib-app';
  public static from(options: Partial<ReleaseOptions>): ReleaseOptions {
    return instanceFrom(options, ReleaseOptions);
  }
}

//#endregion

//#region helpers / instance from
function instanceFrom(
  options: Partial<InitOptions | BuildOptions | ReleaseOptions>,
  classFn: Function,
) {
  const orgFinishCallback = options?.finishCallback;
  options = (options ? options : {}) as any;
  const res = _.merge(new (classFn as any)(), _.cloneDeep(options));
  if (orgFinishCallback) {
    res.finishCallback = orgFinishCallback;
  } else {
    res.finishCallback = () => {};
  }
  return res;
}
//#endregion
