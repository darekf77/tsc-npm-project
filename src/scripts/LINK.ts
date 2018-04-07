import * as os from "os";
import { run } from "../process";
import { Project } from "../project";
import { error } from "../messages";
import * as _ from "lodash";
import { LibType } from "../models";
import chalk from "chalk";

export function onlyLibsChildrens(workspaceProject: Project) {
    // console.log(workspaceProject.children.map )
    const chidrenTypeToNotLinkNodeModules: LibType[] = [
        'workspace',
        'docker'
    ]
    const children = workspaceProject.children
        .filter(c => !chidrenTypeToNotLinkNodeModules.includes(c.type))
    // console.log(children.map(c => c.location))
    return children;
}

export function link(workspaceProject: Project) {
    if (workspaceProject.type !== 'workspace') {
        error(`This project is not workspace type project`)
    }
    if (!workspaceProject.node_modules.exist()) {
        workspaceProject.node_modules.installPackages();
    }
    if (_.isArray(workspaceProject.children)) {
        onlyLibsChildrens(workspaceProject).forEach(c => {
            // console.log('link nodemoulse to ')
            workspaceProject.node_modules.linkToProject(c, true)
        })
    }
    workspaceProject.node_modules.localChildrensWithRequiredLibs.removeSymlinks();
    workspaceProject.node_modules.localChildrensWithRequiredLibs.addSymlinks();
    Project.Tnp.ownNpmPackage.linkTo(workspaceProject);
}



export default {
    $LINK: [(args) => {
        link(Project.Current)
        process.exit(0)
    }, `
ln ${chalk.bold('source')} ${chalk.bold('target')}

    `]    

}
