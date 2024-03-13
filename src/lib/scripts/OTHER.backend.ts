import { os, _ } from 'tnp-core/src';
import { crossPlatformPath } from 'tnp-core/src'
import { Project } from '../project/abstract/project/project';
import * as  psList from 'ps-list';
import { CLASS } from 'typescript-class-helpers/src';
import { Helpers } from 'tnp-helpers/src';
import { Models } from 'tnp-models/src';
import chalk from 'chalk';
import { path, fse } from 'tnp-core/src'
import { config } from 'tnp-config/src';
// import * as nodemailer from 'nodemailer';

import { CLI } from 'tnp-cli/src';
import { Log } from 'ng2-logger/src';

const log = Log.create(path.basename(__filename))

declare const ENV: any;
// console.log('hello')

function $CONFIGS() { }

function CHECK_ENV() {
  Helpers.checkEnvironment(config.required);
  process.exit(0)
}

function ENV_INSTALL() {
  CLI.installEnvironment(config.required);
  process.exit(0)
}

function INSTALL_ENV() {
  ENV_INSTALL()
}


function recreate() {
  Project.Current.recreate.gitignore();
  process.exit(0)

}

async function version() {
  Helpers.log(`Framework name: ${config.frameworkName}`)
  //#region @notForNpm
  if (ENV.notForNpm) {
    Helpers.success(`I am secret project!!!`);
  }
  //#endregion
  // global.spinner?.start();
  // Helpers.sleep(1);
  // Helpers.info(`${config.frameworkName} location: ${Project.Tnp.location}`)
  // Helpers.sleep(1);
  // Helpers.info(`${config.frameworkName} location: ${Project.Tnp.location}`)
  // Helpers.sleep(1);
  // Helpers.info(`${config.frameworkName} location: ${Project.Tnp.location}`)
  // Helpers.sleep(1);
  // Helpers.info(`${config.frameworkName} location: ${Project.Tnp.location}`)
  // Helpers.sleep(1);
  // Helpers.info(`${config.frameworkName} location: ${Project.Tnp.location}`)
  // Helpers.info('waiting...');

  // global.spinner?.start();
  // Helpers.info('waiting next time!!. ..');
  // Helpers.sleep(5);
  // global.spinner?.stop();
  // log.data('Hellleoeoeo')
  const tnp = (Project.Tnp);
  const firedev = Project.From([fse.realpathSync(path.dirname(tnp.location)), config.frameworkNames.firedev]);
  Helpers.success(`

Firedev: ${firedev?.version ? `v${firedev.version}` : '-'}
Tnp: ${tnp?.version ? `v${tnp.version}` : '-'}

  `);
  process.exit(0)
}

async function RUN_PROCESS() {
  Helpers.log(`RUNNING ON PID: ${chalk.bold(process.pid.toString())}`)
  Helpers.log(`----------PPID: ${process.ppid}`)
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


function CIRCURAL_CHECK() {
  Project.Current.run(`madge --circular --extensions ts ./src`).sync()
  process.exit(0)
}

const $FILEINFO = (args) => {
  console.log(Helpers.getMostRecentFilesNames(crossPlatformPath(process.cwd())))

  process.exit(0)
}



const PSINFO = async (a) => {
  await $PSINFO(a)
}


function $isdistreleasemode(args) {
  console.log('IS DIST RELEASE MODE? ', Project.isReleaseDistMode)
  process.exit(0)
}

const $ASSETS = () => recreate();
const $VERSION = () => version();

async function $VERSIONS() {
  const children = Project.Current.children;

  for (let index = 0; index < children.length; index++) {
    const child = children[index] as Project;
    Helpers.info(`v${child.packageJson.data.version}\t - ${child.genericName}`);
  }

  process.exit(0)
}


async function $TRUSTED() {
  const all = Project.Current.trusted;
  console.log(all.join('\n'))
  process.exit(0)
}

async function $TRUSTED_MAX() {
  const all = Project.Current.trustedMaxMajorVersion;
  console.log(all);
  process.exit(0)
}

const PATH = () => {
  console.log((Project.Tnp).location);
  process.exit(0)
};

const COPY_RESOURCES = () => {
  const proj = Project.Current;
  proj.checkIfReadyForNpm();
  if (proj.isStandaloneProject) {
    const distReleaseFolder = path.join(proj.location, config.folder.dist);
    proj.packReleaseDistResources(distReleaseFolder);
  } else {
    // TODO
  }

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

// function CROP(args: string) {
//   const argv = args.split(' ');
//   const replacements = [
//     ['@backe'+'ndFunc', `return (void 0);`],
//     '@back'+'end' as any,
//     '@notF'+'orNpm',
//     ['@cutCod'+'eIfTrue', codeCuttFn(true)],
//     ['@cutCode'+'IfFalse', codeCuttFn(false)]
//   ] as Models.dev.Replacement[];
//   let filePath = _.first(argv);
//   if (!path.isAbsolute(filePath)) {
//     filePath = path.join(process.cwd(), filePath);
//   }
//   const rm = RegionRemover.from(filePath, Helpers.readFile(filePath), replacements, Project.Current as Project);
//   const output = rm.output;
//   Helpers.writeFile(path.join(process.cwd(), `output-${path.basename(filePath)}`), output);
//   Helpers.info('DONE');
//   process.exit(0);
// }

async function $SEND_EMAIL(args: string) {
  // Helpers.info('Send email');
  // // Generate test SMTP service account from ethereal.email
  // // Only needed if you don't have a real mail account for testing
  // let testAccount = await nodemailer.createTestAccount();

  // // create reusable transporter object using the default SMTP transport
  // let transporter = nodemailer.createTransport({
  //   host: "smtp.ethereal.email",
  //   port: 587,
  //   secure: false, // true for 465, false for other ports
  //   auth: {
  //     user: testAccount.user, // generated ethereal user
  //     pass: testAccount.pass, // generated ethereal password
  //   },
  // });

  // // send mail with defined transport object
  // let info = await transporter.sendMail({
  //   from: '"Fred Foo 👻" <foo@example.com>', // sender address
  //   to: "darekf77@icloud.com", // list of receivers
  //   subject: "Hello ✔", // Subject line
  //   text: "Hello world?", // plain text body
  //   html: "<b>Hello world?</b>", // html body
  // });

  // console.log("Message sent: %s", info.messageId);
  // // Message sent: <b658f8ca-6296-ccf4-8306-87d57a0b4321@example.com>

  // // Preview only available when sending through an Ethereal account
  // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
  // process.exit(0);
}

async function $THROW_ERR() {
  Helpers.error(`Erororoororo here`, false, true);
}

async function $OUTPUT_TEST_ASCII() {

  // console.log(`"${Helpers.commnadOutputAsString('date')}"`);
  // console.log(`"${Helpers.commnadOutputAsString('date')}"`);
  // console.log(`"${Helpers.commnadOutputAsString('${config.frameworkName} version')}"`);
  // console.log(`version "${Helpers.commnadOutputAsString('${config.frameworkName} version')}"`);
  // console.log(`version "${Helpers.commnadOutputAsString('navi version')}"`);
  // console.log(`version "${await Helpers.run(`${config.frameworkName} version`, { output: true }).asyncAsPromise()}`)

  process.exit(0)
}

export function $PRINT_RELATIVES(folder) {
  const base = folder;
  folder = path.join(process.cwd(), folder);
  const files = Helpers
    .getRecrusiveFilesFrom(folder)
    .map(f => f.replace(folder, base));

  console.log(`

  ${files.map(f => `'${f}'`).join(',\n')}

  `);
  process.exit(0)
}

//#region @notForNpm
/**
 *  npm install --global bin-version-check-cli
 *  npm i -g yt-dlp
 *  choco install ffmpeg
 *
 * @param args
 */
export function $MP3(args) {
  const downloadPath = crossPlatformPath(path.join(os.userInfo().homedir, 'Downloads', 'mp3-from-youtube'));
  if(!Helpers.exists(downloadPath)) {
    Helpers.mkdirp(downloadPath)
  }

  Helpers.run(`cd ${downloadPath} && yt-dlp --verbose --extract-audio --audio-format mp3 ` + args,
    {
      output: true,
      cwd: downloadPath
    }).sync();
  process.exit(0)
}

export function $MP4(args) {
  // yt-dlp --print filename -o "%(uploader)s-%(upload_date)s-%(title)s.%(ext)s"
  Helpers.run('yt-dlp --verbose  -S "res:1080,fps" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ' + args,
    {
      output: true,
      cwd: crossPlatformPath(path.join(os.userInfo().homedir, 'Downloads'))
    }).sync();
  process.exit(0)
}

export function $BREW(args) {
  const isM1MacOS = os.cpus()[0].model.includes('Apple M1');
  if (process.platform === 'darwin') {
    if (isM1MacOS) {
      Helpers.run(`arch -x86_64 brew ${args}`).sync();
    } else {
      Helpers.run(`brew ${args}`).sync();
    }
  }
  process.exit(0);
}
//#endregion


export default {
  //#region @notForNpm
  $BREW: Helpers.CLIWRAP($BREW, '$BREW'),
  $MP3: Helpers.CLIWRAP($MP3, '$MP3'),
  $MP4: Helpers.CLIWRAP($MP4, '$MP4'),
  //#endregion
  $PRINT_RELATIVES: Helpers.CLIWRAP($PRINT_RELATIVES, '$PRINT_RELATIVES'),
  $OUTPUT_TEST_ASCII: Helpers.CLIWRAP($OUTPUT_TEST_ASCII, '$OUTPUT_TEST_ASCII'),
  $THROW_ERR: Helpers.CLIWRAP($THROW_ERR, '$THROW_ERR'),
  $SEND_EMAIL: Helpers.CLIWRAP($SEND_EMAIL, '$SEND_EMAIL'),
  $AA: Helpers.CLIWRAP($AA, '$AA'),
  // CROP: Helpers.CLIWRAP(CROP, 'CROP'),
  NPM_FIXES: Helpers.CLIWRAP(NPM_FIXES, 'NPM_FIXES'),
  // $COPY_FROM(args: string) {
  //   const [from, to, pkgName] = args.trim().split(' ');
  //   Project.From<Project>(from).node_modules.copy(pkgName).to(Project.From<Project>(to))
  //   process.exit()
  // },
  $COMMAND: Helpers.CLIWRAP($COMMAND, '$COMMAND'),
  CIRCURAL_CHECK: Helpers.CLIWRAP(CIRCURAL_CHECK, 'CIRCURAL_CHECK'),
  $FILEINFO: Helpers.CLIWRAP($FILEINFO, '$FILEINFO'),
  RUN_PROCESS: Helpers.CLIWRAP(RUN_PROCESS, 'RUN_PROCESS'),
  PSINFO: Helpers.CLIWRAP(PSINFO, 'PSINFO'),
  $isdistreleasemode: Helpers.CLIWRAP($isdistreleasemode, '$isdistreleasemode'),
  $ASSETS: Helpers.CLIWRAP($ASSETS, '$ASSETS'),
  $VERSION: Helpers.CLIWRAP($VERSION, '$VERSION'),
  $VERSIONS: Helpers.CLIWRAP($VERSIONS, '$VERSIONS'),
  $TRUSTED: Helpers.CLIWRAP($TRUSTED, '$TRUSTED'),
  $TRUSTED_MAX: Helpers.CLIWRAP($TRUSTED_MAX, '$TRUSTED_MAX'),
  PATH: Helpers.CLIWRAP(PATH, 'PATH'),
  COPY_RESOURCES: Helpers.CLIWRAP(COPY_RESOURCES, 'COPY_RESOURCES'),
  $CHECK_ENV: Helpers.CLIWRAP($CHECK_ENV, '$CHECK_ENV'),
  $CHECK_ENVIRONMENT: Helpers.CLIWRAP($CHECK_ENVIRONMENT, '$CHECK_ENVIRONMENT'),
  $CONFIGS: Helpers.CLIWRAP($CONFIGS, '$CONFIGS'),
  CHECK_ENV: [Helpers.CLIWRAP(CHECK_ENV, 'CHECK_ENV'), `Sample docs`],
  ENV_CHECK: Helpers.CLIWRAP(ENV_CHECK, 'ENV_CHECK'),
  ENV_INSTALL: Helpers.CLIWRAP(ENV_INSTALL, 'ENV_INSTALL'),
  INSTALL_ENV: Helpers.CLIWRAP(INSTALL_ENV, 'INSTALL_ENV'),
}
