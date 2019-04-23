//#region @backend
import { Project } from "./base-project";
import { InstalationType } from "../models";
import { BaseProjectLib } from "./base-project-lib";
import { BuildOptions } from './features/build-options';

export class ProjectServerLib extends BaseProjectLib {


  startOnCommand(args: string) {
    const command = `node run.js ${args}`;
    return command;
  }

  projectSpecyficFiles(): string[] {
    return super.projectSpecyficFiles().concat([
      "tsconfig.json"
    ]);
  }

  async buildLib(outDir: "dist" | "bundle", forClient: Project[] = [], prod = false, watch = false) {
    this.run(`npm-run tsc ${watch ? '-w' : ''} --outDir ${outDir}`).sync()
  }

  async buildSteps(buildOptions?: BuildOptions) {
    const { prod, watch, outDir, onlyWatchNoBuild, forClient } = buildOptions;


    if (!onlyWatchNoBuild) {
      await this.buildLib(outDir, forClient as Project[], prod, watch);
    }
  }
}

//#endregion
