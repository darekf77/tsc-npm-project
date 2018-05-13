import * as _ from 'lodash';
import { run, clearConsole } from "../process";
import { Project, ProjectIsomorphicLib, ProjectFrom } from '../project';
import { clear } from "./CLEAR";
import { BuildOptions, BuildDir, LibType } from "../models";
import { info, error } from "../messages";

import chalk from "chalk";
import { nearestProjectTo } from '../helpers';

export function buildLib(prod = false, watch = false, outDir: BuildDir, args: string) {

    const argsObj: { copyto: string[] | string } = require('minimist')(args.split(' '));
    let copyto: Project[] = []
    if (argsObj.copyto) {
        if (_.isString(argsObj.copyto)) {
            argsObj.copyto = [argsObj.copyto]
        }
        copyto = argsObj.copyto.map(path => {
            const project = nearestProjectTo(path);
            if (!project) {
                error(`Path doesn't contain tnp type project: ${path}`)
            }
            return project;
        });
    }

    const options: BuildOptions = {
        prod, watch, outDir, copyto
    };
    build(options, ['angular-lib', 'isomorphic-lib'])
}


export function buildApp(prod = false, watch = false, outDir: BuildDir = 'dist') {

    const options: BuildOptions = {
        prod, watch, outDir, appBuild: true
    };
    build(options, ['angular-cli', 'angular-client', 'angular-lib', 'ionic-client', 'docker']);
}


function build(opt: BuildOptions, allowedLibs: LibType[]) {

    const { prod, watch, outDir, appBuild, copyto } = opt;

    clearConsole()


    const project: Project = Project.Current;

    if (allowedLibs.includes(project.type)) {
        if (project.isSite) {
            project.recreate.join.init()
        }
        project.build(opt);
        if (watch) {
            if (project.isSite) {
                project.recreate.join.watch()
            }
        } else {
            process.exit(0)
        }
    } else {
        if (appBuild) {
            error(`App build only for tnp ${chalk.bold(allowedLibs.join(','))} project types`)
        } else {
            error(`Library build only for tnp ${chalk.bold(allowedLibs.join(','))} project types`)
        }
    }
}


export default {

    $BUILD_DIST: [(args) => buildLib(false, false, 'dist', args), `Build dist version of project library.`],
    $BUILD_DIST_WATCH: (args) => buildLib(false, true, 'dist', args),
    $BUILD_DIST_PROD: (args) => buildLib(true, false, "dist", args),

    $BUILD_BUNDLE: (args) => buildLib(false, false, 'bundle', args),
    $BUILD_BUNDLE_WATCH: (args) => buildLib(false, true, 'bundle', args),
    $BUILD_BUNDLE_PROD: (args) => buildLib(true, false, 'bundle', args),

    $BUILD_APP: () => buildApp(false, false),
    $BUILD_APP_WATCH: () => buildApp(false, true),


    'Documentation': `
Building purpose:
- library
- application`

}