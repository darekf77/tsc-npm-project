//#region @backend
import { Project } from "../project";
import { FilesRecreator } from "../project/files-builder";
import { BaselineSiteJoin } from "../project/baseline-site-join";


export default {
    $FILES_CUSTOM: (args) => {
        console.log(new BaselineSiteJoin(Project.Current).files.allCustomFiles)
        process.exit(0)
    },
    $FILES_BASELINE: (args) => {
        console.log(new BaselineSiteJoin(Project.Current).files.allBaselineFiles)
        process.exit(0)
    }
}
//#endregion
