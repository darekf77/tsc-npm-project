//#region backend
import * as _ from 'lodash';
import { info, checkValidNpmPackageName, error, log, warn } from '../../../helpers';
import { NpmPackagesBase } from './npm-packages-base.backend';
import { resolvePacakgesFromArgs } from './npm-packages-helpers.backend';

export class NpmPackages extends NpmPackagesBase {

  public async installFromArgs(packagesNamesSpaceSeparated: string) {
    const project = this.project;
    const args = packagesNamesSpaceSeparated.split(' ').filter(a => !!a);

    if (args.length === 0) {
      await project.npmPackages.installAll(`tnp install`);
    } else {
      const packages = resolvePacakgesFromArgs(args);
      await project.npmPackages.install(`tnp install ${packages
        .map(p => `${p.installType}${p.version ? `$@${p.version}` : ''}`)
        .join(', ')} `, packages);
    }
  }

  public async uninstallFromArgs(packagesNamesSpaceSeparated: string) {
    const project = this.project;
    const args = packagesNamesSpaceSeparated.split(' ').filter(a => !!a);

    if (args.length === 0) {
      error(`Please specify package name: tnp uninstall exapmle-npm-package `, false, true)
    } else {
      const packages = resolvePacakgesFromArgs(args);
      await project.npmPackages.install(`tnp uninstall ${packages
        .map(p => `${p.installType}${p.version ? `$@${p.version}` : ''}`)
        .join(', ')} `, packages, true);
    }
  }

}
//#endregion
