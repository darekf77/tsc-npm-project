import type { Project } from "./project/abstract/project";

import {
  crossPlatformPath, path,
  //#region @backend
  os
  //#endregion
} from "tnp-core/src";

export const firedevFrameworkName = 'firedev';
export const morphiFrameworkName = 'morphi';

export const OVERRIDE_FROM_TNP = [
  'scripts',
  'description',
  'license',
  'private',
  'author',
  'homepage',
  'main',
  'engines',
  'categories',
  'keywords',
  'activationEvents',
];

export const UNIT_TEST_TIMEOUT = 30000;
export const INTEGRATION_TEST_TIMEOUT = 30000;


export let morphiPathUserInUserDir: string
  //#region @backend
  = path.join(crossPlatformPath(os.homedir()), '.firedev', morphiFrameworkName);
//#endregion


export const argsToClear = [
  'websql',
  'serveApp',
  'skipNodeModules',
  'skipSmartContainerDistInit',
  'copyto',
  'port',
  'branding',
  'struct',
  'verbose',
];

export const folder_shared_folder_info = 'shared_folder_info.txt';

export const TEMP_DOCS = 'tmp-documentation';

export const DEFAULT_PORT = {
  DIST_SERVER_DOCS: 4000,
  APP_BUILD_LOCALHOST: 4200,
  SERVER_LOCALHOST: 4199,
}

export const tmpBuildPort = 'tmp-build-port';

/**
 *
 * Ports for:
      max = max instances = max container childs = 20;
      n = folder process build number (searches for new port always)
      index = container project index (can't exceeds max)

      build process service 4100 = 4100 + n

      standalone server 4500 = 4100  + 400 + n
      containers servers 4600 = 4100  + 500 + n * max + index

      standalone ng serve normal 4300 = 4100  + 200 + n
      standalone ng serve websql 4400 = 4100  + 300 + n

      container ng serve normal 4800 = 4100  + 700 + n + max + index
      container ng serve websql 4900 = 4100  + 800 + n + max + index
 *
 * @param basePort 4100 + n
 * @returns
 */
export class PortUtils {
  static instance(basePort: number) {
    return new PortUtils(basePort);
  }

  private readonly n: number;
  constructor(
    private basePort: number,
  ) {
    this.n = ((basePort - (basePort % 1000)) / 1000);
  }

  /**
   * max container  childs
   */
  private max = 20;

  calculatePortForElectronDebugging(project: Project): number {
    if (!project.__isIsomorphicLib) {
      return;
    }
    return 9876 + this.n;
  }

  calculateServerPortFor(project: Project): number {
    //#region @backendFunc
    if (project.__isContainer) {
      return;
    }
    if (project.__isSmartContainerTarget) {
      project = project.__smartContainerTargetParentContainer.children.find(c => c.name === project.name);
    }
    if (project.__isSmartContainerChild) {
      const index = project.parent.children.indexOf(project);
      return this.calculateForContainerServer(index);
    }
    if (project.__isStandaloneProject) {
      return this.calculateForStandaloneServer();
    }
    //#endregion
  }

  calculateClientPortFor(project: Project, { websql }: { websql: boolean }): number {
    //#region @backendFunc
    if (project.__isContainer) {
      return;
    }
    if (project.__isSmartContainerTarget) {
      project = project.__smartContainerTargetParentContainer.children.find(c => c.name === project.name);
    }
    if (project.__isSmartContainerChild) {
      const index = project.parent.children.indexOf(project);
      return this.calculateForContainerClient(index, { websql });
    }
    if (project.__isStandaloneProject) {
      return this.calculateForStandaloneClient({ websql });
    }
    //#endregion
  }

  private calculateForStandaloneServer() {
    const clientStandalonePort = this.basePort + 400 + this.n
    return clientStandalonePort;
  }

  private calculateForContainerServer(index: number) {
    const clientSmartContainerChildPort = this.basePort + 500 + (this.n * this.max) + index;
    // console.log({ clientSmartContainerChildPort })
    return clientSmartContainerChildPort;
  }

  private calculateForStandaloneClient({ websql }: { websql: boolean }) {
    const clientPort = (this.basePort + (websql ? 300 : 200)) + this.n;
    return clientPort;
  }

  private calculateForContainerClient(index: number, { websql }: { websql: boolean }) {
    const clientPort = (this.basePort + (websql ? 800 : 700)) + this.n * this.max + index;
    return clientPort;
  }



  appHostTemplateFor(project: Project) {
    const backendPort = this.calculateServerPortFor(project);

    //#region @backendFunc
    const clientPorts = (project.__isStandaloneProject && !project.__isSmartContainerTarget) ? `
export const CLIENT_DEV_NORMAL_APP_PORT = ${project.__standaloneNormalAppPort};
export const CLIENT_DEV_WEBSQL_APP_PORT = ${project.__standaloneWebsqlAppPort};
    `: ''

    return `
// THIS FILE IS GENERATED - DO NOT MODIFY

export const HOST_BACKEND_PORT = ${backendPort};
${clientPorts}

// Check yout build info here http://localhost:${this.basePort}
// NORMAL APP: http://localhost:${project.__standaloneNormalAppPort}
// WEBSQL APP: http://localhost:${project.__standaloneWebsqlAppPort}

// THIS FILE IS GENERATED - DO NOT MODIFY
`.trim()
    //#endregion
  }

}



export const notAllowedProjectNames = [
  'app',
  'apps',
  'libs',
  'lib',
  'src',
  'migrations',
  'assets',
  'assets-for',
  'browser',
  'websql',
  'compiled',
  'docs',
  '_',
]


export function tempSourceFolder(outDir: 'dist', appForLib: boolean, websql: boolean) {
  return `tmp-src-${appForLib ? 'app-' : ''}${outDir}${websql ? '-websql' : ''}`
}


export const MESSAGES = {
  SHUT_DOWN_FOLDERS_AND_DEBUGGERS: 'Please shut down your code debugger and any open windows from node_modules and press any key...'
}


export const ONLY_COPY_ALLOWED = [
  'background-worker-process',
  'better-sqlite3',
  '.bin',
  '.install-date',
];
