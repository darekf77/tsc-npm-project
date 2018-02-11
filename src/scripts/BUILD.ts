
import { run } from "../process";
import { Project, BUILD_ISOMORPHIC_LIB_WEBPACK } from '../project';
import { clear } from "./CLEAR";
import { BuildOptions, BuildDir } from "../models";


function build(prod = false, watch = false, outDir: BuildDir = 'dist', project: Project = Project.Current, runAsync = false) {

    const options: BuildOptions = {
        prod, watch, project, outDir
    };


    project.build(options);
    if (!watch) {
        process.exit(0)
    }

}


export default {
    BUILD_ISOMORPHIC_LIB_WEBPACK: (args: string) => {
        BUILD_ISOMORPHIC_LIB_WEBPACK(args)
    },

    $BUILD_DIST: () => build(),
    $BUILD_DIST_PROD: () => build(true),

    $BUILD_DIST_WATCH: () => build(false, true),
    $BUILD_DIST_WATCH_PROD: () => build(true, true),

    $BUILD_BUNDLE: () => build(false, false, 'bundle'),
    $BUILD_BUNDLE_PROD: () => build(false, false, 'bundle')

}
