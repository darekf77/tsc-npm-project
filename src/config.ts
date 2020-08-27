import * as _ from 'lodash';
//#region @backend
import * as path from 'path';
import * as os from 'os';
import * as fse from 'fs-extra';
import * as child from 'child_process';
//#endregion
import { Helpers as Ng2LoggerHelpers } from 'ng2-logger';
import { Models } from 'tnp-models';
import type { Helpers as TnpHelpers } from 'tnp-helpers'
import type { Project as AbstractProject } from './project/abstract/project';


const allowedEnvironments: Models.env.EnvironmentName[] = ['static', 'dev', 'prod', 'stage', 'online', 'test', 'qa', 'custom'];
const allowedEnvironmentsObj = {};
allowedEnvironments.forEach(s => {
  allowedEnvironmentsObj[s] = s
})
// let { environmentName, env }: { environmentName: EnvironmentName, env: EnvironmentName } = require('minimist')(process.argv);

// if (_.isString(env)) {
//   environmentName = env;
// }

const firedev = 'firedev';
const morphi = 'morphi';
const urlMorphi = 'https://github.com/darekf77/morphi.git';


// environmentName = _.isString(environmentName) && environmentName.toLowerCase() as any;
// environmentName = allowedEnvironments.includes(environmentName) ? environmentName : 'local';
// console.log(`Current environment prefix: "${environmentName}"  , args: ${JSON.stringify(process.argv)}`);
const filesNotAllowedToClean = {
  _gitignore: '.gitignore',
  _npmrc: '.npmrc',
  _npmignore: '.npmignore',
  tslint_json: 'tslint.json',
  _editorconfig: '.editorconfig',
  _angularCli_json: '.angular-cli.json',
  _vscode_launch_json: '.vscode/launch.json',
}

const file = {
  controllers_ts: 'controllers.ts',
  entities_ts: 'entities.ts',
  autob_actions_js: 'auto-actions.js',
  package_json: 'package.json',
  yarn_lock: 'yarn.lock',
  package_lock_json: 'package-lock.json',
  tnpEnvironment_json: 'tmp-environment.json',
  environment: 'environment',
  environment_js: 'environment.js',
  tmp_transaction_pid_txt: 'tmp-transaction-pid.txt',
  manifest_webmanifest: 'manifest.webmanifest',
  publicApi_ts: 'public_api.ts',
  _babelrc: '.babelrc',
  index_d_ts: 'index.d.ts',
  index_js: 'index.js',
  index_js_map: 'index.js.map',
  db_json: 'db.json',
  db_for_tests_json: 'db-for-tests.json',
  tmpDockerImageId: 'tmp-docker-image-id',
  ...filesNotAllowedToClean
};

const tempFolders = {
  bundle: 'bundle',
  vendor: 'vendor',
  docs: 'docs',
  dist: 'dist',
  tmp: 'tmp',
  tempSrc: 'tmp-src',
  tempSrcDist: 'tmp-src-dist',
  previewDistApp: 'dist-app',
  preview: 'preview',
  browser: 'browser',
  module: 'module',
  backup: 'backup',
  node_modules: 'node_modules',
  client: 'client',
  tnp_tests_context: 'tmp-tests-context',
  tmpPackage: 'tmp-package'
}

const folder = {
  scripts: 'scripts',
  bower: 'bower',
  src: 'src',
  custom: 'custom',
  components: 'components',
  assets: 'assets',
  apps: 'apps',
  // entities: 'entities',
  // controllers: 'controllers',
  // projects: 'projects',
  workspace: 'workspace',
  container: 'container',
  bin: 'bin',
  _bin: '.bin',
  _vscode: '.vscode',
  project: 'project',
  ...tempFolders
};

//#region @backend
const tnp_folder_location =
  (path.basename(path.dirname(__dirname)) === folder.node_modules) ?
    __dirname : path.resolve(__dirname, '..');
//#endregion

//#region @backend
function pathResolved(...partOfPath: string[]) {
  // console.log('pathResolved', partOfPath);

  if (global['frameworkName'] && global['frameworkName'] === firedev) {
    const joined = partOfPath.join('/');
    const projectsInUserFolder = path.join(os.homedir(), firedev, morphi, 'projects')
    let pathResult = joined.replace((__dirname + '/' + '../../firedev-projects'), projectsInUserFolder);

    pathResult = path.resolve(pathResult);
    const morphiPathUserInUserDir = path.join(os.homedir(), firedev, morphi);
    if (pathResolved.prototype.resolved) {
      // console.info(`Firedev base projects in are ok.`);
    } else {
      if (!fse.existsSync(morphiPathUserInUserDir)) {
        if (!fse.existsSync(path.dirname(morphiPathUserInUserDir))) {
          fse.mkdirpSync(path.dirname(morphiPathUserInUserDir))
        }
        try {
          child.execSync(`git clone ${urlMorphi}`, { cwd: path.dirname(morphiPathUserInUserDir) });
          fse.removeSync(path.join(path.dirname(morphiPathUserInUserDir), 'morphi/.vscode'));
        } catch (error) {
          console.error(`[config] Not able to clone repository: ${urlMorphi} in:
           ${morphiPathUserInUserDir}`);
        }
      } else {
        try {
          child.execSync(`git reset --hard && git pull origin master`,
            { cwd: morphiPathUserInUserDir });
          fse.removeSync(path.join(path.dirname(morphiPathUserInUserDir), 'morphi/.vscode'));
        } catch (error) {
          console.error(`[config] Not pull origin of morphi: ${urlMorphi} in:
          ${morphiPathUserInUserDir}`);
        }
      }
      pathResolved.prototype.resolved = true;
    }
    return pathResult;
  }
  return path.resolve(path.join(...partOfPath))
}
//#endregion

const moduleNameAngularLib = [
  folder.components,
  folder.module,
  folder.dist,
  folder.browser,
];

const moduleNameIsomorphicLib = [
  folder.src,
  folder.dist,
  folder.browser,
];

const argsReplacementsBuild = {
  'baw': 'build:app:watch',
  'ba': 'build:app',
  'bap': 'build:app:prod',
  'bdw': 'build:dist:watch',
  'bw': 'build:watch',
  'bdpw': 'build:dist:prod:watch',
  'bd': 'build:dist',
  'bb': 'build:bundle',
  'bbp': 'build:bundle:prod',
  'bbpw': 'build:bundle:prod:watch',
  'bbw': 'build:bundle:watch',
  'sb': 'static:build',
  'sbp': 'static:build:prod',
  'sbd': 'static:build:dist',
  'sbl': 'static:build:lib',
  'sba': 'static:build:app',
  'cb': 'clean:build'
};

export const config = {
  //#region @backend
  get dbLocation() {
    let dbFileName = config.file.db_json;
    if (global.testMode) {
      dbFileName = config.file.db_for_tests_json;
    }
    const location = path.join(os.homedir(), `${config.frameworkName}`, dbFileName);
    return location;
  },
  async initCoreProjects(Project: typeof AbstractProject, Helpers: typeof TnpHelpers) {
    let allCoreProject: AbstractProject[] = [];
    (config.coreProjectVersions as Models.libs.FrameworkVersion[]).forEach(v => {
      const corePorjectsTypes: Models.libs.LibType[] = ['angular-lib', 'isomorphic-lib'];
      const projects = corePorjectsTypes.map(t => Project.by(t, v));
      allCoreProject = [
        ...projects,
        ...allCoreProject,
      ] as any;
    });

    for (let index = 0; index < allCoreProject.length; index++) {
      const p = allCoreProject[index];
      console.log(`${p.genericName} ${p.location}`);
      const linkedFiles = p.projectLinkedFiles();
      for (let index2 = 0; index2 < linkedFiles.length; index2++) {
        const l = linkedFiles[index2];
        const source = path.join(l.sourceProject.location, l.relativePath);
        const dest = path.join(p.location, l.relativePath);
        if (!Helpers.exists(source)) {
          Helpers.error(`[config] Core source do not exists: ${source}`, false, true);
        }
        Helpers.info(`link from: ${source} to ${dest}`);
        Helpers.createSymLink(source, dest);
      }
      await p.filesStructure.struct();
    }
  },
  //#endregion
  coreProjectVersions: ['v1', 'v2'],
  regexString: {
    pathPartStringRegex: `(\/([a-zA-Z0-9]|\\-|\\_|\\+|\\.)*)`
  },
  placeholders: {
    forProjectsInEnvironmentFile: '//<PLACEHOLDER_FOR_PROJECTS>'
  },
  defaultFrameworkVersion: 'v1' as ('v1' | 'v2'),
  CONST: {
    TEST_TIMEOUT: 3600000
  },
  debug: {
    sourceModifier: [

    ],
    baselineSiteJoin: {
      DEBUG_PATHES: [
        // "src/apps/auth/AuthController.ts",
        // '/src/app/+preview-components/preview-components.component.ts',
        // '/src/controllers.ts',
        // '/src/app/+preview-components/components/+preview-buildtnpprocess/preview-buildtnpprocess.component.ts'
      ],
      DEBUG_MERGE_PATHES: [
        // "src/apps/auth/AuthController.ts",
        // '/src/app/+preview-components/components/+preview-buildtnpprocess/preview-buildtnpprocess.component.ts'
        // '/components/formly/base-components/editor/editor-wrapper.component.ts'
        // '/src/app/+preview-components/components/+preview-buildtnpprocess/preview-buildtnpprocess.component.ts'
      ]
    }
  },
  frameworkName: (global['frameworkName'] ? global['frameworkName'] : 'tnp'),
  startPort: 6001,
  frameworks: ['bootstrap', 'ionic', 'material'] as Models.env.UIFramework[],
  //#region @backend
  argsReplacementsBuild,
  argsReplacements: {
    ...argsReplacementsBuild,
    'ghpush': 'githubpush',
    'ghpull': 'githubpull',
    'l': 'last',
    'sl': 'show:last',
    'i': 'install',
    'rc': 'recommit',
    'rp': 'release:prod',
    'r': 'release',
    'lb': 'last:build',
    'scm': 'showcoremodules',
    '--version': 'version',
    '-v': 'version',
  },
  coreBuildFrameworkNames: [
    'tnp',
    'tnp-ins',
    'tnp-debug',
    'firedev',
    'firedev-debug',
    'firedev-ins',
    'morphi',
    'morphi-debug',
    'morphi-ins',
  ],
  pathes: {

    logoSvg: 'logo.svg',
    logoPng: 'logo.png',

    /**
     * Location of compiled source code for tnp framework
     * Can be in 3 places:
     * - <..>/tnp/dist
     * - <..>/tnp/bundle
     * - <some-project>/node_modules/tnp
    */
    tnp_folder_location,
    tnp_vscode_ext_location: pathResolved(__dirname, '../../firedev-projects', 'plugins', 'tnp-vscode-ext'),

    tnp_tests_context: pathResolved(tnp_folder_location, folder.tnp_tests_context),
    tnp_db_for_tests_json: pathResolved(tnp_folder_location, folder.bin, file.db_for_tests_json),

    scripts: {
      HELP_js: pathResolved(__dirname, folder.scripts, 'HELP.js'),
      allHelpFiles: path.join(__dirname, folder.scripts, '/**/*.js'),
      allPattern: path.join(__dirname, `/${folder.scripts}/**/*.js`),
    },

    projectsExamples: (version?: Models.libs.FrameworkVersion) => {
      version = (!version || version === 'v1') ? '' : `-${version}` as any;
      const result = {
        workspace: pathResolved(__dirname, `../../firedev-projects/container${version}/workspace${version}`),
        container: pathResolved(__dirname, `../../firedev-projects/container${version}`),
        projectByType(libType: Models.libs.NewFactoryType) {
          return pathResolved(__dirname, `../../firedev-projects/container${version}/workspace${version}/${libType}${version}`);
        },
        singlefileproject: pathResolved(__dirname, `../../firedev-projects/container${version}/single-file-project${version}`)
      }
      return result;
    }
  },
  //#endregion
  allowedEnvironments,
  folder,
  tempFolders,
  filesNotAllowedToClean: Object.keys(filesNotAllowedToClean).map(key => filesNotAllowedToClean[key]) as string[],
  file,
  default: {
    cloud: {
      environment: {
        name: 'online' as Models.env.EnvironmentName
      }
    }
  },
  message: {
    globalSystemToolMode: 'globalSystemToolMode'
  },
  names: {
    env: allowedEnvironmentsObj,
    baseline: 'baseline'
  },
  extensions: {
    /**
       * Modify source: import,export, requires
       */
    get modificableByReplaceFn() {
      return [
        'ts',
        'js',
        'css',
        'sass',
        'scss',
        'less',
      ].map(f => `.${f}`)
    },
  },
  /**
   * Build allowed types
   */
  allowedTypes: {
    /**
     * Projects for build:app:watch command
     */
    app: [
      Models.libs.GlobalLibTypeName.angularClient,
      Models.libs.GlobalLibTypeName.angularLib,
      Models.libs.GlobalLibTypeName.isomorphicLib,
      Models.libs.GlobalLibTypeName.ionicClient,
      Models.libs.GlobalLibTypeName.docker,
      Models.libs.GlobalLibTypeName.container,
    ] as Models.libs.LibType[],
    /**
     * Projects for build:(dist|bundle):(watch) command
     */
    libs: [
      Models.libs.GlobalLibTypeName.angularLib,
      Models.libs.GlobalLibTypeName.isomorphicLib,
      Models.libs.GlobalLibTypeName.workspace,
      Models.libs.GlobalLibTypeName.container,
      Models.libs.GlobalLibTypeName.docker,
    ] as Models.libs.LibType[]
  },
  moduleNameAngularLib,
  moduleNameIsomorphicLib,
  filesExtensions: {
    filetemplate: 'filetemplate'
  },
  projectTypes: {
    forNpmLibs: [
      Models.libs.GlobalLibTypeName.angularLib,
      Models.libs.GlobalLibTypeName.isomorphicLib,
    ],
    with: {
      angularAsCore: [
        Models.libs.GlobalLibTypeName.angularClient,
        Models.libs.GlobalLibTypeName.angularLib,
        Models.libs.GlobalLibTypeName.ionicClient,
      ],
      componetsAsSrc: [
        Models.libs.GlobalLibTypeName.angularLib,
      ],
    }
  },
  // environmentName,
  localLibs: [
    'eslint',
    'mkdirp',
    'gulp',
    'npm-run',
    'rimraf',
    'nodemon',
    'release-it',
    'tsc',
    'watch',
    'http-server',
    'ts-node',
    'sort-package-json',
    'concurrently',
    'sloc',
    'morphi'
  ],
  helpAlias: [
    '-h',
    '--help',
    '-help',
    'help'
  ],
  required: {
    npm: [
      { name: 'extract-zip', version: '1.6.7' },
      { name: 'watch', version: '1.0.2' },
      { name: 'check-node-version' },
      { name: 'npm-run', version: '4.1.2' },
      { name: 'rimraf' },
      { name: 'mkdirp' },
      { name: 'renamer' },
      { name: 'nodemon' },
      { name: 'madge' },
      { name: 'http-server' },
      { name: 'increase-memory-limit' },
      { name: 'bower' },
      { name: 'fkill', installName: 'fkill-cli' },
      { name: 'yo' },
      { name: 'mocha' },
      // { name: 'chai' },
      { name: 'ts-node' },
      { name: 'vsce' },
      { name: 'stmux' },
      { name: 'webpack-bundle-analyzer' },
      { name: 'ng', installName: '@angular/cli' },
      { name: 'ngx-pwa-icons', version: '0.1.2' },
      { name: 'real-favicon', installName: 'cli-real-favicon' },
      { name: 'babel', installName: 'babel-cli' },
      { name: 'javascript-obfuscator' },
      { name: 'uglifyjs', installName: 'uglify-js' },
    ],
    niceTools: [
      { name: 'speed-test' },
      { name: 'npm-name' }, // check if name is available on npm
      { name: 'vantage', platform: 'linux' }, // inspect you live applicaiton
      { name: 'clinic', platform: 'linux' }, // check why nodejs is slow
      { name: 'vtop', platform: 'linux' }, // inspect you live applicaiton,
      { name: 'public-ip' },
      { name: 'empty-trash' },
      { name: 'is-up' }, // check if website is ok
      { name: 'is-online' }, // check if internet is ok,
      { name: 'ttystudio' }, // record terminal actions,
      { name: 'bcat' }, // redirect any stream to browser,
      { name: 'wifi-password', installName: 'wifi-password-cli' },
      { name: 'wallpaper', installName: 'wallpaper-cli' },
      { name: 'brightness', installName: 'brightness-cli' },
      { name: 'subdownloader' },
      { name: 'rtail' }, // monitor multiple server
      { name: 'iponmap' }, // show ip in terminal map,
      { name: 'jsome' }, // display colored jsons,
      { name: 'drawille', isNotCli: true }, // 3d drwa in temrinal
      { name: 'columnify', isNotCli: true }, // draw nice columns in node,
      { name: 'multispinner', isNotCli: true }, // progres for multiple async actions
      { name: 'cfonts' }, // draw super nice fonts in console
    ],
    programs: [,
      //   {
      //     name: 'code',
      //     website: 'https://code.visualstudio.com/'
      //   }
    ]
  }
}



if (Ng2LoggerHelpers.isNode) {
  //#region @backend
  if (!global['ENV']) {
    global['ENV'] = {};
  }
  global['ENV']['config'] = config;
  //#endregion
} else {
  if (!window['ENV']) {
    window['ENV'] = {};
  }
  window['ENV']['config'] = config;
}

