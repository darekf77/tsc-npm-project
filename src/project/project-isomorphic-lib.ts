import { BaseProjectLib } from "./base-project-lib";
//#region @backend
import * as fse from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';
import chalk from 'chalk';
import * as inquirer from 'inquirer';

import { Project } from "./base-project";

import { ClassHelper, tryCopyFrom, getControllers, getEntites } from "../helpers";

import { HelpersLinks } from '../helpers';
import { config } from '../config';
import { IncrementalBuildProcessExtended } from './features/build-isomorphic-lib/incremental-build-process';
import { error } from '../helpers';
import { ProjectFrom } from '.';
import { copyFile } from '../helpers';
import { TnpDB } from '../tnp-db';
import { CommandInstance } from '../tnp-db/entites/command-instance';
import { killProcessByPort } from '../helpers';
import { BuildOptions } from './features/build-options';
//#endregion


export class ProjectIsomorphicLib extends BaseProjectLib {

  //#region @backend
  startOnCommand(args: string) {
    const command = `node run.js ${args}`;
    return command;
  }

  projectSpecyficFiles(): string[] {
    return super.projectSpecyficFiles()
      .concat([
        '.vscode/launch.json',
        "tsconfig.json",
        "tsconfig.browser.json",
        "webpack.config.js",
        'run.js'
      ]).concat(
        !this.isStandaloneProject ? [
          "src/typings.d.ts",
        ] : []);
  }

  projectSpecyficIgnoredFiles() {
    return [
      "src/entities.ts",
      "src/controllers.ts"
    ]
  }


  private get additionalRequiredIsomorphcLibs() {
    const result: string[] = []

    if (Array.isArray(this.requiredLibs)) { // TODO QUCIK_FIX not fixing this
      this.requiredLibs.forEach(d => {
        result.push(d.name);
      })
    }


    // console.log(result)

    return result;
  }

  private getIsomorphcLibNames(parentWorksapce = false) {
    let result = [];
    result = result.concat(this.additionalRequiredIsomorphcLibs);

    // console.log('result', result)

    return result;
  }

  async buildSteps(buildOptions?: BuildOptions) {
    const { prod, watch, outDir, onlyWatchNoBuild, appBuild, args, forClient = [] } = buildOptions;
    if (!onlyWatchNoBuild) {
      if (appBuild) {
        let webpackEnvParams = `--env.outFolder=${outDir}`;
        webpackEnvParams = webpackEnvParams + (watch ? ' --env.watch=true' : '');
        // console.log('forClients', forClient)
        let client = _.first(forClient as Project[]);
        if (!this.isStandaloneProject && forClient.length === 0) {

          const answer: { project: string } = await inquirer
            .prompt([
              {
                type: 'list',
                name: 'project',
                message: 'Which project do you wanna simulate ?',
                choices: this.parent.children
                  .filter(c => config.allowedTypes.app.includes(c.type))
                  .filter(c => c.name !== this.name)
                  .map(c => c.name),
                filter: function (val) {
                  return val.toLowerCase();
                }
              }
            ]) as any;
          // console.log('ANSWER', answer)
          client = ProjectFrom(path.join(this.location, '..', answer.project))
          //           const clientsExamples = this.parent.children
          //             .filter(c => config.allowedTypes.app.includes(c.type))
          //             .map(c => chalk.bold('--forClient ' + c.name) + '  or')
          //           error(`Please define client parameter for app simulation:
          // ${clientsExamples.length > 0 ? clientsExamples.join('\n') : chalk.bold('--forClient my-example-client')}
          //           Please choose only one ${chalk.bold('--forClient')} parameter.
          //           `
          //             , false, true)
        }

        // console.log('CLIENT NAME', client.name)

        if (client) {
          let port = client.getDefaultPort()
          killProcessByPort(port)
          webpackEnvParams = `${webpackEnvParams} --env.moduleName=${client.name} --env.port=${port}`
        }

        const command = `npm-run webpack-dev-server ${webpackEnvParams}`
        // console.log(command)

        this.run(command).sync()

      } else {
        if (!this.isStandaloneProject && forClient.length === 0) {



          while (buildOptions.forClient.length === 0) {
            console.info('Please select at lease one client..')
            await this.selectClients(buildOptions)
          }

        }

        await this.buildLib(outDir, forClient as Project[], prod, watch);
      }

    }
    return;
  }

  private async selectClients(buildOptions: BuildOptions) {
    const { projects = [] }: { projects: string[] } = await inquirer
      .prompt([
        {
          type: 'checkbox',
          name: 'projects',
          message: 'Select target projects to build library: ',
          choices: this.parent.children
            .filter(c => config.allowedTypes.app.includes(c.type))
            .filter(c => c.name !== this.name)
            .map(c => {
              return { value: c.name, name: c.name }
            })
        }
      ]) as any;

    buildOptions.forClient = projects.map(p => ProjectFrom(path.join(this.location, '..', p)))

    const db = await TnpDB.Instance;
    await db.transaction.updateCommandBuildOptions(this.location, buildOptions);

  }

  private copyWhenExist(source: string, outDir: string) {
    const basename = source;
    source = path.join(this.location, source);
    outDir = path.join(this.location, outDir, basename);
    // console.log(`Copy from ${source} to ${outDir}`)
    if (fse.existsSync(source)) {
      if (fse.lstatSync(source).isDirectory()) {
        // console.log('copy folder')
        tryCopyFrom(source, outDir)
        // fse.copySync(source, outDir, { overwrite: true, recursive: true })
      } else {
        // console.log('copy copyfile')
        // fse.copyFileSync(source, outDir);
        copyFile(source, outDir)
      }
    } else {
      // console.log('not exist', source)
    }
  }
  private linkWhenExist(source: string, outLInk: string) {
    const basename = source;
    source = path.join(this.location, source);
    outLInk = path.join(this.location, outLInk, basename);
    if (fse.existsSync(outLInk)) {
      fse.unlinkSync(outLInk);
    }
    if (fse.existsSync(source)) {
      HelpersLinks.createLink(outLInk, source)
    }
  }

  async buildLib(outDir: "dist" | "bundle", forClient: Project[] = [], prod = false, watch = false) {
    const isomorphicNames = this.getIsomorphcLibNames(this.isWorkspaceChildProject)

    // console.log('Build fucking this', this.buildOptions)
    this.copyWhenExist('bin', outDir) // TODO make this for each library
    this.copyWhenExist('package.json', outDir)
    this.copyWhenExist('.npmrc', outDir)
    this.copyWhenExist('.npmignore', outDir)
    this.copyWhenExist('.gitignore', outDir)
    if (outDir === 'bundle') {
      this.linkWhenExist(config.folder.node_modules, outDir);
      if (this.isTnp) {
        this.linkWhenExist('projects', outDir);
        this.linkWhenExist('tests', outDir);
        this.linkWhenExist('autobuild.json', outDir);
      }
    }

    // console.log('config.file.tnpEnvironment_json',config.file.tnpEnvironment_json)

    if (watch) {
      await (new IncrementalBuildProcessExtended(this, this.buildOptions)).startAndWatch('isomorphic compilation (watch mode)')
    } else {
      await (new IncrementalBuildProcessExtended(this, this.buildOptions)).start('isomorphic compilation')
    }
  }
  //#endregion
}


//#region @backend
export function getReservedClassNames(project = Project.Current) {
  // console.log('get class names from : ' + project.name)
  // console.log('parent : ' + (project.parent && project.parent.name))
  // console.log('childeren' + (project.parent && project.parent.children.map(c => c.name)));
  // console.log('children isomorphic: ' + (project.parent && project.parent.children
  //     .filter((p) => p.type === 'isomorphic-lib')
  //     .map(c => c.name))
  // );
  if (project && project.parent && project.parent.type === 'workspace'
    && Array.isArray(project.parent.children)
    && project.parent.children.length > 0) {


    const names = []
    project.parent.children
      .filter((p) => p.type === 'isomorphic-lib')
      .forEach(p => {

        const controllers = getControllers(path.join(
          p.location,
          config.folder.src
        ))

        // console.log('controllers', controllers)
        controllers.forEach(c => {
          names.push(path.basename(c, '.ts'))
        });

        const entities = getEntites(path.join(
          p.location,
          config.folder.src
        ))
        // const entities = glob.sync(`${path.join(
        //   p.location,
        //   config.folder.src,
        //   config.folder.entities
        // )}/**/*.ts`)
        // console.log('entities', entities)
        entities.forEach(e => {
          names.push(path.basename(e, '.ts'))
        });
      })
    return names;
  }
  return [];
}
//#endregion
