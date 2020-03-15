import * as _ from 'lodash';
import * as fse from 'fs-extra';
import { Project } from '../project';
import * as  psList from 'ps-list';
import { CLASS } from 'typescript-class-helpers';
import { Helpers } from 'tnp-helpers';
import { Models } from 'tnp-models';
import chalk from 'chalk';
import * as path from 'path';
import { config } from '../config';
import { PackagesRecognitionExtended } from '../project/features/packages-recognition-extended';

// console.log('hello')

function $CONFIGS() {
  Helpers.log(Project.Current.env.configsFromJs.map(c => c.domain).join('\n'));
  process.exit(0)
}

function CHECK_ENV() {
  Helpers.checkEnvironment(config.required);
  process.exit(0)
}


function recreate() {
  Project.Current.recreate.initAssets()
  Project.Current.recreate.gitignore()
  process.exit(0)

}

function version() {
  console.log(Project.Tnp.version);
  process.exit(0)
}

async function RUN_PROCESS() {
  console.log(`RUNNING ON PID: ${chalk.bold(process.pid.toString())}`)
  console.log(`----------PPID: ${process.ppid}`)
  process.env['teststttt'] = '12';
  process.env['hello'] = 'world';
}


async function $PSINFO(args: string) {
  const pid = Number(args)

  let ps: Models.system.PsListInfo[] = await psList()

  let info = ps.find(p => p.pid == pid);
  if (!info) {
    Helpers.error(`No process found with pid: ${args}`, false, true)
  }
  console.log(info)
}

function $COMMAND(args) {
  const command = decodeURIComponent(args);
  // info(`Starting command: ${command}`)
  Helpers.run(decodeURIComponent(args)).sync()
  // info(`Finish command: ${command}`)
  process.exit(0)
}



function NPM_FIXES() {
  console.log(Project.Current.node_modules.fixesForNodeModulesPackages)
  process.exit(0)
}

function LN(args: string) {
  let [target, link] = args.split(' ');
  Helpers.createSymLink(target, link)
  process.exit(0)
}

function CIRCURAL_CHECK() {
  Project.Current.run(`madge --circular --extensions ts ./src`).sync()
  process.exit(0)
}

const $FILEINFO = (args) => {
  console.log(Helpers.getMostRecentFilesNames(process.cwd()))

  process.exit(0)
}



const PSINFO = async (a) => {
  await $PSINFO(a)
}

function UPDATE_ISOMORPHIC() {
  PackagesRecognitionExtended.fromProject(Project.Current).start(true);
}

function $isbundlemode(args) {
  console.log('IS BUNDLE MODE? ', Project.isBundleMode)
  process.exit(0)
}

const $ASSETS = () => recreate();
const VERSION = () => version();
const PATH = () => {
  console.log(Project.Tnp.location);
  process.exit(0)
};

const COPY_RESOURCES = () => {
  Project.Current.checkIfReadyForNpm();
  Project.Current.bundleResources();
  process.exit(0)
}

const $CHECK_ENV = (args) => {
  Helpers.checkEnvironment()
  process.exit(0)
};

const $CHECK_ENVIRONMENT = (args) => {
  Helpers.checkEnvironment()
  process.exit(0)
};

function ENV_CHECK() {
  CHECK_ENV()
}


async function $AA() {
  console.log(CLASS.getBy('Project'))
}

export default {
  $AA: Helpers.CLIWRAP($AA, '$AA'),
  NPM_FIXES: Helpers.CLIWRAP(NPM_FIXES, 'NPM_FIXES'),
  LN: Helpers.CLIWRAP(LN, 'LN'),
  // $COPY_FROM(args: string) {
  //   const [from, to, pkgName] = args.trim().split(' ');
  //   Project.From(from).node_modules.copy(pkgName).to(Project.From(to))
  //   process.exit()
  // },
  $COMMAND: Helpers.CLIWRAP($COMMAND, '$COMMAND'),
  CIRCURAL_CHECK: Helpers.CLIWRAP(CIRCURAL_CHECK, 'CIRCURAL_CHECK'),
  $FILEINFO: Helpers.CLIWRAP($FILEINFO, '$FILEINFO'),
  RUN_PROCESS: Helpers.CLIWRAP(RUN_PROCESS, 'RUN_PROCESS'),
  PSINFO: Helpers.CLIWRAP(PSINFO, 'PSINFO'),
  UPDATE_ISOMORPHIC: Helpers.CLIWRAP(UPDATE_ISOMORPHIC, 'UPDATE_ISOMORPHIC'),
  $isbundlemode: Helpers.CLIWRAP($isbundlemode, '$isbundlemode'),
  $ASSETS: Helpers.CLIWRAP($ASSETS, '$ASSETS'),
  VERSION: Helpers.CLIWRAP(VERSION, 'VERSION'),
  PATH: Helpers.CLIWRAP(PATH, 'PATH'),
  COPY_RESOURCES: Helpers.CLIWRAP(COPY_RESOURCES, 'COPY_RESOURCES'),
  $CHECK_ENV: Helpers.CLIWRAP($CHECK_ENV, '$CHECK_ENV'),
  $CHECK_ENVIRONMENT: Helpers.CLIWRAP($CHECK_ENVIRONMENT, '$CHECK_ENVIRONMENT'),
  $CONFIGS: Helpers.CLIWRAP($CONFIGS, '$CONFIGS'),
  CHECK_ENV: [Helpers.CLIWRAP(CHECK_ENV, 'CHECK_ENV'), `Sample docs`],
  ENV_CHECK: Helpers.CLIWRAP(ENV_CHECK, 'ENV_CHECK'),

}