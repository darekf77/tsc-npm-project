//#region imports
//#region @backend
import { Project } from '../abstract';
//#endregion
import { BuildOptions } from 'tnp-db/src';
import { CLASS } from 'typescript-class-helpers/src';
import { Helpers } from 'tnp-helpers/src';
//#endregion

/**
 * DO NOT USE environment variables in this project directly
 */
//#region @backend
@CLASS.NAME('ProjectVscodeExt')
//#endregion
export class ProjectVscodeExt
  //#region @backend
  extends Project
//#endregion
{
  async buildLib() { }

  recreateIfNotExists() {
    return [
      'src/config.ts',
    ]
  }
  projectSpecyficFiles(): string[] {
    //#region @backendFunc
    return [
      '.vscode/tasks.json',
      '.vscode/launch.json',
      '.vscodeignore',
      'vsc-extension-quickstart.md',
      'tsconfig.json',
      'update-proj.js',
      ...this.projectSpecyficFilesLinked(),
      ...this.recreateIfNotExists(),
    ];
    //#endregion
  }

  projectSpecyficFilesLinked() {
    let files = [
      'src/extension.ts',
      'src/helpers.ts',
      'src/helpers-vscode.ts',
      'src/models.ts',
      'src/execute-command.ts',
      'src/progress-output.ts',
    ]
    if (this.frameworkVersionAtLeast('v3')) {
      files = files.filter(f => f !== 'src/helpers-vscode.ts');
    }

    return files;
  }


  async buildSteps(buildOptions?: BuildOptions) {
    //#region @backend
    try {
      if (buildOptions.watch) {
        this.run(`npm-run tsc -p ./`).sync();
        this.run(`node update-proj.js --watch`).async();
        this.run(`npm-run tsc -watch -p ./`).async();
      } else {
        this.run(`npm-run tsc -p ./`).sync();
        this.run(`node update-proj.js`).sync();
      }
    } catch (error) {
      Helpers.error(`Not able to build extension...`, false, true);
    }
    //#endregion
  }
  protected startOnCommand(args: string): string {
    //#region @backendFunc
    throw new Error("Method not implemented.");
    //#endregion
  }
}
