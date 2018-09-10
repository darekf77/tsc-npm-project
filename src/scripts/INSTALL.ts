import { run } from "../process";
import { Project } from '../project';
import { link } from "./LINK";
import { checkValidNpmPackageName } from "../helpers";
import { error } from "../messages";
import { unlink } from "./UNLINK";


export function install(a: string, project = Project.Current, unlinkChilds = true) {
  const args = a.split(' ').filter(a => !!a);

  if (args.length === 0) { // NPM INSTALL
    if (project.type === 'workspace') {
      console.log('** npm install in workspace')
      if (unlinkChilds) {
        unlink(project)
      }
      project.node_modules.installPackages()
      link(project)
    } else if (project.parent && project.parent.type === 'workspace') {
      console.log('** npm install in child of workspace')
      const parent = project.parent;
      if (unlinkChilds) {
        unlink(parent)
      }
      parent.node_modules.installPackages()
      link(parent)
    } else {
      console.log('** npm install in separated project')
      project.node_modules.installPackages()
    }

    if (project.isWorkspace) {
      project.run(`increase-memory-limit`).sync();
    } else if (project.isWorkspaceChildProject) {
      project.baseline.run(`increase-memory-limit`).sync();
    }

  } if (args.length >= 1) { // NPM INSTALL <package name>
    //#region npm packages
    const npmPackagesToAdd = args
      .map(p => p.trim())
      .filter(p => {
        const res = checkValidNpmPackageName(p)
        if (!res) {
          error(`Invalid package to install: ${p}`, true)
        }
        return res;
      })
    //#endregion

    if (project.type === 'workspace') {  // workspace project: npm i <package name>
      console.log('** npm install <package> in workspace')
      if (unlinkChilds) {
        unlink(project)
      }
      if (!project.node_modules.exist()) {
        project.node_modules.installPackages()
      }
      npmPackagesToAdd.forEach(npmPackageName => {
        project.node_modules.installPackage(npmPackageName)
      })
      link(project)
    } else if (project.parent && project.parent.type === 'workspace') {
      console.log('** npm install <package> in child of workspace')
      if (unlinkChilds) {
        unlink(project.parent)
      }
      if (!project.parent.node_modules.exist()) {
        project.parent.node_modules.installPackages()
      }
      npmPackagesToAdd.forEach(npmPackageName => {
        project.parent.node_modules.installPackage(npmPackageName)
      })
      link(project.parent)
    } else {
      console.log('** npm install <package> in separated project')
      if (!project.node_modules.exist()) {
        project.node_modules.installPackages()
      }
      npmPackagesToAdd.forEach(npmPackageName => {  // Other normal porojects
        project.node_modules.installPackage(npmPackageName)
      })
    }
  }
}

export default {
  $INSTALL: (args) => {
    install(args);
    process.exit(0);
  },
  $I: (args) => {
    install(args);
    process.exit(0);
  }
}
