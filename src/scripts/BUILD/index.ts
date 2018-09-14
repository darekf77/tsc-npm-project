import * as _ from 'lodash';
import chalk from "chalk";
// local
import { Project } from '../../project';
import { BuildOptions, BuildDir, LibType } from "../../models";
import { error } from "../../messages";
import { config } from '../../config';
import { handleArguments } from './handle-arguments.fn';
import { install } from '../INSTALL';



export function buildLib(prod = false, watch = false, outDir: BuildDir, args: string) {

  const { copyto, environmentName, onlyWatchNoBuild } = handleArguments(args, outDir, watch);

  const options: BuildOptions = {
    prod, watch, outDir, copyto, environmentName, onlyWatchNoBuild, args
  };
  build(options, config.allowedTypes.libs)
}


export function buildApp(prod = false, watch = false, outDir: BuildDir = 'dist', args: string) {

  const { environmentName, onlyWatchNoBuild } = handleArguments(args, outDir, watch);

  const options: BuildOptions = {
    prod, watch, outDir, appBuild: true, environmentName, onlyWatchNoBuild, args
  };
  build(options, config.allowedTypes.app);
}


function build(opt: BuildOptions, allowedLibs: LibType[]) {

  const { watch, appBuild } = opt;


  const project: Project = Project.Current;

  if (!allowedLibs.includes(project.type)) {
    if (appBuild) {
      error(`App build only for tnp ${chalk.bold(allowedLibs.join(','))} project types`)
    } else {
      error(`Library build only for tnp ${chalk.bold(allowedLibs.join(','))} project types`)
    }
  }

  // console.log(`Prepare node modules: ${this.name}`)
  if (project.isWorkspaceChildProject && !project.parent.node_modules.exist()) {
    install('', project.parent, false);
  } else if (!project.node_modules.exist()) {
    install('', project, false);
  }

  if (project.parent) {
    project.parent.recreate.init();// TODO QUICK IFX
  }
  project.recreate.init();

  if (project.isSite) {
    project.baseline.recreate.init();

    if (watch) {
      // console.log("HERE !!")

      project.join.init().watch()
      if (project.isWorkspaceChildProject) {
        project.parent.join.init().watch()
      }
    } else {
      project.join.init()
      if (project.isWorkspaceChildProject) {
        project.parent.join.init()
      }
    }

  }
  project.build(opt);
  if (!watch) {
    process.exit(0)
  }



}

function buildWatch(args) {
  if (config.allowedTypes.libs.includes(Project.Current.type)) {
    buildLib(false, true, 'dist', args)
  }
  if (config.allowedTypes.app.includes(Project.Current.type)) {
    buildApp(false, true, 'dist', args)
  }
}


export default {

  $BUILD_DIST: [(args) => buildLib(false, false, 'dist', args), `Build dist version of project library.`],
  $BUILD_DIST_WATCH: (args) => buildLib(false, true, 'dist', args),
  $BUILD_DIST_PROD: (args) => buildLib(true, false, "dist", args),

  $BUILD_BUNDLE: (args) => buildLib(false, false, 'bundle', args),
  $BUILD_BUNDLE_WATCH: (args) => buildLib(false, true, 'bundle', args),
  $BUILD_BUNDLE_PROD: (args) => buildLib(true, false, 'bundle', args),

  $BUILD_APP_PROD: (args) => buildApp(true, false, 'dist', args),
  $BUILD_APP: (args) => buildApp(false, false, 'dist', args),

  $BUILD_APP_WATCH: (args) => buildApp(false, true, 'dist', args),
  $BUILD_APP_WATCH_PROD: (args) => buildApp(false, true, 'dist', args),

  $START_APP: () => {
    Project.Current.start()
  },

  // aliases
  $BUILD: (args) => {
    if (config.allowedTypes.libs.includes(Project.Current.type)) {
      buildLib(false, false, 'dist', args)
    }
    if (config.allowedTypes.app.includes(Project.Current.type)) {
      buildApp(false, false, 'dist', args)
    }
  },

  $BUILD_PROD: (args) => {
    if (config.allowedTypes.libs.includes(Project.Current.type)) {
      buildLib(true, false, 'dist', args)
    }
    if (config.allowedTypes.app.includes(Project.Current.type)) {
      buildApp(true, false, 'dist', args)
    }
  },

  $BUILDWATCH: (args) => {
    buildWatch(args)
  },

  $BUILD_WATCH: (args) => {
    buildWatch(args)
  },



  $START: () => {

    Project.Current.start()
  },

  'Documentation': `
Building purpose:
- library
- application`

}

