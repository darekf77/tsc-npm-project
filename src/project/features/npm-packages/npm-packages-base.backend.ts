//#region imports
import chalk from 'chalk';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as glob from 'glob';
import * as _ from 'lodash';

import { Project } from '../../abstract';
import { info, checkValidNpmPackageName, error, log, warn } from '../../../helpers';
import { FeatureForProject } from '../../abstract';
import { Package, InstalationTypeArr, InstalationType, LibType, NpmInstallOptions } from '../../../models';
import config from '../../../config';
import { PackagesRecognitionExtended } from '../packages-recognition-extended';
import { NpmPackagesCore } from './npm-packages-core.backend';
//#endregion


export class NpmPackagesBase extends NpmPackagesCore {

  public async installProcess(triggeredMsg: string, options?: NpmInstallOptions) {

    const { remove, npmPackage, smoothInstall } = fixOptions(options, this.project);
    const fullInstall = (npmPackage.length === 0);

    if (remove && fullInstall) {
      error(`[install process]] Please specify packages to remove`, false, true);
    }

    if (remove) {
      log(`Package [${
        npmPackage.map(p => p.name + (p.version ? `@${p.version}` : ''))
          .join(',')
        }] remove for ${chalk.bold(this.project.genericName)} ${triggeredMsg} `);
      npmPackage.forEach(p => {
        this.project.packageJson.removeDependencyAndSave(p, `package ${p && p.name} instalation`);
      });
    } else {
      if (fullInstall) {
        log(`Packages full installation for ${this.project.genericName}`)
      } else {
        log(`Package [${
          npmPackage.map(p => p.name + (p.version ? `@${p.version}` : ''))
            .join(',')
          }] instalation for ${chalk.bold(this.project.genericName)} ${triggeredMsg} `)
        npmPackage.forEach(p => {
          this.project.packageJson.setDependencyAndSave(p, `package ${p && p.name} instalation`);
        });
      }
    }

    if (!this.emptyNodeModuls) {
      if (this.project.isContainer) {
        this.project.node_modules.remove();
      } else {
        this.project.node_modules.recreateFolder();
      }
    }

    if (this.project.isWorkspaceChildProject) {
      await this.project.parent.npmPackages.installProcess(`workspace child: ${this.project.name} ${triggeredMsg} `, options)
    }

    if (this.project.isStandaloneProject || this.project.isWorkspace || this.project.isUnknowNpmProject || this.project.isContainer) {

      if (fullInstall) {
        this.project.packageJson.save(`${this.project.type} instalation before full insall [${triggeredMsg}]`);
      }

      if (this.project.isWorkspace && smoothInstall === false) {
        this.project.workspaceSymlinks.remove(triggeredMsg)
      }

      if (!this.project.isContainer) {
        if (fullInstall) {
          this.actualNpmProcess({ reason: triggeredMsg })
        } else {
          npmPackage.forEach(pkg => {
            this.actualNpmProcess({ pkg, reason: triggeredMsg, remove, smoothInstall });
          });
        }
      }

      if (this.project.isWorkspace && smoothInstall === false) {
        this.project.workspaceSymlinks.add(triggeredMsg)
      }
      if (this.project.isContainerChild) {
        this.project.packageJson.hideDeps(`${this.project.type} hide deps for container child [${triggeredMsg}]`);
      }
      if (this.project.isWorkspace || this.project.isStandaloneProject) {
        this.project.node_modules.dedupe();
      }
      if (this.project.isWorkspace && smoothInstall === false) {
        this.project.tnpBundle.installAsPackage();
      }
    }

  }
}


function fixOptions(options: NpmInstallOptions, project: Project): NpmInstallOptions {
  if (_.isNil(options)) {
    options = {};
  }
  if (!_.isArray(options.npmPackage)) {
    options.npmPackage = [];
  }
  if (_.isUndefined(options.remove)) {
    options.remove = false;
  }
  if (_.isUndefined(options.smoothInstall)) {
    options.smoothInstall = false;
  }
  if (options.npmPackage.length === 0) {
    options.smoothInstall = false;
  }
  return options;
}

