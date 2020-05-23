import * as _ from 'lodash';
import * as path from 'path';
import * as fse from 'fs-extra';
import chalk from 'chalk';
import { Project } from '../../project/abstract/project';
import { Helpers } from 'tnp-helpers';
import { config } from '../../config';
import { TnpDB } from 'tnp-db';
import { resolvePacakgesFromArgs } from '../../project/features/npm-packages/npm-packages-helpers.backend';

async function copyModuleto(args: string) {
  let [packageName, project]: [string, (Project | string)] = args.split(' ') as any;
  if (_.isString(packageName) && packageName.trim() !== '' && _.isString(project) && project.trim() !== '') {
    if (packageName.startsWith(`${config.folder.node_modules}/`)) {
      packageName = packageName.replace(`${config.folder.node_modules}/`, '')
    }
    if (!path.isAbsolute(project)) {
      project = Project.From(path.join(process.cwd(), project)) as Project;
    } else {
      project = Project.From(project) as Project;
    }

    await project.node_modules.copy(packageName).to(project);
    Helpers.info(`Copy DONE`)
  } else {
    Helpers.error(`Bad argument for ${chalk.bold('copy to module')} : "${args}"`)
  }
  process.exit(0)
}


function copyToDestination(destLocaiton) {

  const currentLib = Project.Current;
  const destination = Project.From(destLocaiton);
  if (!destination) {
    Helpers.error(`Incorect project in: ${destLocaiton}`)
  }
  currentLib.copyManager.copyBuildedDistributionTo(destination, void 0, false);
  Helpers.info(`Project "${chalk.bold(currentLib.name)}" successfully installed in "${destination.name}"`);
}

function copyToHandleArgs(args: string) {

  const destLocaitons = args.split(' ').filter(a => a.trim() !== '');

  destLocaitons.forEach(c => copyToDestination(c));


  process.exit(0)
}

export async function $INSTALL(args, smooth = false, exit = true) {
  // console.log('instalaltion')
  await Project.Current.npmPackages.installFromArgs(args, smooth);
  // console.log('instalaltion after')
  if (exit) {
    process.exit(0);
  }
}

export async function $UNINSTALL(args, exit = true) {
  await Project.Current.npmPackages.uninstallFromArgs(args);
  if (exit) {
    process.exit(0);
  }
}

export async function $DEPS_SET_CATEGORY(args: string, exit = true) {
  let argumn: string[] = (args.trim() === '' ? [] : args.split(' ')) as any;
  process.chdir(Project.Tnp.location);
  const packages = resolvePacakgesFromArgs(argumn);
  for (let index = 0; index < packages.length; index++) {
    const pkg = packages[index];
    await Project.Tnp.packageJson.setCategoryFor(pkg);
  }
  if (exit) {
    process.exit(0);
  }
}

export async function $DEPS_UPDATE_FROM(args: string, exit = true) {
  let locations: string[] = (args.trim() === '' ? [] : args.split(' ')) as any;

  if (_.isArray(locations)) {
    locations = locations
      .map(l => {
        if (path.isAbsolute(l)) {
          return path.resolve(l);
        }
        return path.resolve(path.join(process.cwd(), l));
      });
  }
  Project.Current.packageJson.updateFrom(locations);

  if (exit) {
    process.exit(0);
  }
}

export async function $RESET_NPM(args: string, exit = true) {
  await Project.Current.packageJson.reset();
  if (exit) {
    process.exit(0);
  }
}

export async function $RESET_NPM_ALL(args: string, exit = true) {
  const db = await TnpDB.Instance(config.dbLocation);
  const projects = await db.getProjects();
  for (let index = 0; index < projects.length; index++) {
    const project = projects[index];
    // console.log(project.project.genericName)
    (project.project as Project).packageJson.reset();
  }
  if (exit) {
    process.exit(0);
  }
}


function DEPS_SHOW(args: string) {
  Project.Current.packageJson.showDeps('deps show')
  process.exit(0)
}

function DEPS_HIDE(args: string) {
  if (Project.Current.isCoreProject) {
    Project.Current.packageJson.showDeps('deps show')
  } else {
    Project.Current.packageJson.hideDeps('deps hide')
  }
  process.exit(0)
}

function $INSTALL_IN_TNP() {
  const inTnp = path.join(Project.Tnp.location, config.folder.node_modules, Project.Current.name);
  const inCurrent = path.join(Project.Current.location, config.folder.dist);
  if (!fse.existsSync(inCurrent)) {
    Helpers.error(`Please build dist version of project first with tsc: tsc`, false, true);
  }
  Helpers.tryRemoveDir(inTnp);
  Helpers.tryCopyFrom(inCurrent, inTnp);
  Helpers.info(`Current project "${Project.Current.genericName}" installed in node_moduels of tnp`);
  process.exit(0)
}

const $I_IN_TNP = () => {
  $INSTALL_IN_TNP()
};

const $DEPS_SET_CAT = (args) => {
  $DEPS_SET_CATEGORY(args);
};

async function $DEPS_FROM(args) {
  await $DEPS_UPDATE_FROM(args)
}

function $DEPS_RESET(args) {
  $RESET_NPM(args)
}

function $DEPS_RESET_ALL(args) {
  $RESET_NPM_ALL(args)
}

function $DEDUPE(args: string) {
  Project.Current.node_modules.dedupe(args.trim() === '' ? void 0 : args.split(' '))
  process.exit(0)
}

function $DEDUPE_COUNT(args: string) {
  Project.Current.node_modules.dedupeCount(args.trim() === '' ? void 0 : args.split(' '))
  process.exit(0)
}

function $DEDUPE_CHECK(args: string) {
  Project.Current.node_modules.dedupeCount(args.trim() === '' ? void 0 : args.split(' '))
  process.exit(0)
}

function $DEPS_DEDUPE(args: string) {
  Project.Current.node_modules.dedupe()
  process.exit(0)
}

function $DEPS_RECREATE(args: string) {
  DEPS_SHOW(args)
}

function $SHOW_CHILDREN() {
  console.log(Project.Current.children.map(c => c.genericName).join('\n'))
  process.exit(0)
}

function DEPS_SHOW_IF_STANDALONE(args: string) {
  Helpers.log(`Hook update start`)
  if (Project.Current.isStandaloneProject) {
    Helpers.info(`Showing deps for standalone project`)
    Project.Current.packageJson.save('is standalone show')
  }
  Helpers.git.commitWhatIs(`show package.json dependencies`)
  Helpers.log(`Hook update ended`)
  process.exit(0)
}

function $DEPS_CLEAN(args: string) {
  DEPS_HIDE(args)
}

const $I = (args) => {
  $INSTALL(args);
}

const $SINSTALL = (args) => {
  $INSTALL(args, true);
}

async function $LINK() {
  let project = Project.Current;

  if (project.isStandaloneProject) {
    Project.Current.applyLinkedPorjects();
  } else {
    if (project.isWorkspaceChildProject) {
      project = project.parent;
    }
    if (!project.isWorkspace) {
      Helpers.error(`This is not workspace or workpace child projct`, false, true)
    }
    project.workspaceSymlinks.add(`Add workspace symlinks`);
  }
  Helpers.info(`Linking DONE!`)
  process.exit(0)
}

async function $UNLINK() {
  let project = Project.Current;
  if (project.isWorkspaceChildProject) {
    project = project.parent;
  }
  if (!project.isWorkspace) {
    Helpers.error(`This is not workspace or workpace child projct`, false, true)
  }
  project.workspaceSymlinks.remove(`Remove workspace symlinks`);
  process.exit(0)
}

const $copytoproject = (args) => {
  copyToHandleArgs(args)
}
const $copy_to_project = (args) => {
  copyToHandleArgs(args)
}
const $copyto = (args) => {
  copyToHandleArgs(args)
}
const $copymoduletoproject = async (args) => {
  await copyModuleto(args)
}

const $copy_module_to_project = async (args) => {
  await copyModuleto(args)
}

async function $DEPS_TREE() {
  const proj = Project.Current;
  if (proj.isWorkspaceChildProject) {
    const c = proj;
    Helpers.info(`child: ${c.name}`);
    const libs = c.libsForTraget(c);
    if (libs.length === 0) {
      Helpers.log(`-- no deps --`);
    } else {
      libs.forEach(d => {
        Helpers.log(`dep ${d.name}`);
      })
    }
  } else if (proj.isWorkspace) {
    proj.children.forEach(c => {
      Helpers.info(`child: ${c.name}`);
      const libs = c.libsForTraget(c);
      if (libs.length === 0) {
        Helpers.log(`-- no deps --`);
      } else {
        libs.forEach(d => {
          Helpers.log(`dep ${d.name}`);
        })
      }

    });
  }

  process.exit(0)

}

async function $DEPS_TREE2() {
  const proj = Project.Current;
  proj.children.forEach(c => {
    Helpers.info(`child: ${c.name}`);
    if (c.workspaceDependencies.length === 0) {
      Helpers.log(`-- no deps --`);
    } else {
      c.workspaceDependencies.forEach(d => {
        Helpers.log(`dep ${d.name}`);
      })
    }

  });
  process.exit(0)

}

export default {
  $DEPS_TREE2: Helpers.CLIWRAP($DEPS_TREE2, '$DEPS_TREE2'),
  $DEPS_TREE: Helpers.CLIWRAP($DEPS_TREE, '$DEPS_TREE'),
  $INSTALL_IN_TNP: Helpers.CLIWRAP($INSTALL_IN_TNP, '$INSTALL_IN_TNP'),
  $I_IN_TNP: Helpers.CLIWRAP($I_IN_TNP, '$I_IN_TNP'),
  $DEPS_SET_CATEGORY: Helpers.CLIWRAP($DEPS_SET_CATEGORY, '$DEPS_SET_CATEGORY'),
  $DEPS_SET_CAT: Helpers.CLIWRAP($DEPS_SET_CAT, '$DEPS_SET_CAT'),
  $DEPS_UPDATE_FROM: Helpers.CLIWRAP($DEPS_UPDATE_FROM, '$DEPS_UPDATE_FROM'),
  $DEPS_FROM: Helpers.CLIWRAP($DEPS_FROM, '$DEPS_FROM'),
  $RESET_NPM: Helpers.CLIWRAP($RESET_NPM, '$RESET_NPM'),
  $RESET_NPM_ALL: Helpers.CLIWRAP($RESET_NPM_ALL, '$RESET_NPM_ALL'),
  $DEPS_RESET: Helpers.CLIWRAP($DEPS_RESET, '$DEPS_RESET'),
  $DEPS_RESET_ALL: Helpers.CLIWRAP($DEPS_RESET_ALL, '$DEPS_RESET_ALL'),
  $DEDUPE: Helpers.CLIWRAP($DEDUPE, '$DEDUPE'),
  $DEDUPE_COUNT: Helpers.CLIWRAP($DEDUPE_COUNT, '$DEDUPE_COUNT'),
  $DEDUPE_CHECK: Helpers.CLIWRAP($DEDUPE_CHECK, '$DEDUPE_CHECK'),
  $DEPS_DEDUPE: Helpers.CLIWRAP($DEPS_DEDUPE, '$DEPS_DEDUPE'),
  DEPS_SHOW: Helpers.CLIWRAP(DEPS_SHOW, 'DEPS_SHOW'),
  $DEPS_RECREATE: Helpers.CLIWRAP($DEPS_RECREATE, '$DEPS_RECREATE'),
  $SHOW_CHILDREN: Helpers.CLIWRAP($SHOW_CHILDREN, '$SHOW_CHILDREN'),
  DEPS_SHOW_IF_STANDALONE: Helpers.CLIWRAP(DEPS_SHOW_IF_STANDALONE, 'DEPS_SHOW_IF_STANDALONE'),
  DEPS_HIDE: Helpers.CLIWRAP(DEPS_HIDE, 'DEPS_HIDE'),
  $DEPS_CLEAN: Helpers.CLIWRAP($DEPS_CLEAN, '$DEPS_CLEAN'),
  $INSTALL: Helpers.CLIWRAP($INSTALL, '$INSTALL'),
  $UNINSTALL: Helpers.CLIWRAP($UNINSTALL, 'UNINSTALL'),
  $I: Helpers.CLIWRAP($I, '$I'),
  $SINSTALL: Helpers.CLIWRAP($SINSTALL, '$SINSTALL'),
  $LINK: Helpers.CLIWRAP($LINK, '$LINK'),
  $UNLINK: Helpers.CLIWRAP($UNLINK, '$UNLINK'),
  $copytoproject: Helpers.CLIWRAP($copytoproject, '$copytoproject'),
  $copy_to_project: Helpers.CLIWRAP($copy_to_project, '$copy_to_project'),
  $copyto: Helpers.CLIWRAP($copyto, '$copyto'),
  $copymoduletoproject: Helpers.CLIWRAP($copymoduletoproject, '$copymoduletoproject'),
  $copy_module_to_project: Helpers.CLIWRAP($copy_module_to_project, '$copy_module_to_project'),
}
