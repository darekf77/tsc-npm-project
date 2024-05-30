//#region imports
import { crossPlatformPath, path } from 'tnp-core/src';
import { fse } from 'tnp-core/src';
import { _ } from 'tnp-core/src';
import { config } from 'tnp-config/src';
import { Project } from '../../abstract/project';
import { Helpers } from 'tnp-helpers/src';
import { BaseFeatureForProject } from 'tnp-helpers/src';
import {
  dedupePackages,
  nodeModulesExists,
  nodeModulesHasOnlyLinks,
} from './node-modules-helpers.backend';
//#endregion

export class NodeModulesCore extends BaseFeatureForProject<Project> {
  public get path() {
    return crossPlatformPath(
      path.join(this.project.location, config.folder.node_modules),
    );
  }
  public pathFor(packageName: string) {
    return crossPlatformPath(path.join(this.path, packageName));
  }
  public get exist() {
    return nodeModulesExists(this.project);
  }
  public get itIsSmartInstalation() {
    return nodeModulesHasOnlyLinks(this.project);
  }
  public get isLink() {
    return Helpers.isSymlinkFileExitedOrUnexisted(this.path);
  }
  public dedupe = (
    packagesOrOptions?: string[] | { packages?: string[]; reason: string },
  ) => {
    const packages = _.isArray(packagesOrOptions)
      ? packagesOrOptions
      : packagesOrOptions?.packages;
    if (!_.isArray(packagesOrOptions) && packagesOrOptions?.reason) {
      Helpers.logInfo(`Reason to dedupe: ${packagesOrOptions?.reason}`);
    }
    const tnpProj = Project.ins.Tnp;
    const arrTrusted =
      tnpProj.__packageJson.data.tnp.core.dependencies.trusted[
        this.project.__frameworkVersion
      ];
    const arrAddTrusted =
      tnpProj.__packageJson.data.tnp.core.dependencies['additionalTrusted'] ||
      {};
    const packagesNames =
      _.isArray(packages) && packages.length > 0
        ? packages
        : Helpers.arrays.uniqArray([
            ...tnpProj.__packageJson.data.tnp.core.dependencies.dedupe,
            ...arrTrusted,
            ...arrAddTrusted,
          ]);

    // if (this.project.frameworkVersionAtLeast('v3')) { // TODO QUICK_FIX REMOVE_THIS
    //   const onlyDedpupeForV3 = [
    //     "@angular/animations",
    //     "@angular/cdk",
    //     "@angular/common",
    //     "@angular/compiler",
    //     "@angular/http",
    //     "@angular/core",
    //     "@angular/forms",
    //     "@angular/material",
    //     "@angular/platform-browser",
    //     "@angular/platform-browser-dynamic",
    //     "@angular/pwa",
    //     "@angular/router",
    //     "@angular/service-worker",
    //     "zone.js",
    //     "typescript",
    //   ]

    //   const isomorphicPkgs = [
    //     ...this.project.isomorphicPackages,
    //     ...onlyDedpupeForV3,
    //   ];
    //   // console.log(`isomorphicPkgs ${this.project.name} ${this.project.location} `, isomorphicPkgs)
    //   dedupePackages(
    //     this.project.location,
    //     packagesNames.filter(f => isomorphicPkgs.includes(f)),
    //     false,
    //     !this.project.npmPackages.useSmartInstall
    //   );
    // } else {

    dedupePackages(
      this.project.location,
      packagesNames,
      false,
      !this.project.__npmPackages.useSmartInstall,
    );
    // }
  };

  public dedupeCount = (packages?: string[]) => {
    dedupePackages(
      this.project.location,
      packages,
      true,
      !this.project.__npmPackages.useSmartInstall,
    );
  };

  public remove = (packageInside?: string) => {
    Helpers.log(`Removing node_modules from ${this.project?.name}`);
    if (packageInside) {
      Helpers.removeIfExists(path.join(this.path, packageInside));
      return;
    }
    Helpers.remove(this.path, true);
  };

  public linkToProject = (target: Project) => {
    Helpers.createSymLink(this.path, target.__node_modules.path);
  };

  public linkTo = (target: string) => {
    if (!path.isAbsolute(target)) {
      Helpers.error(`[linkTo] taget path is not absolute "${target}"`);
    }
    if (!this.project.__node_modules.exist) {
      // TODO QUICK_FIX make it async install
      this.project.installNpmPackages();
    }
    Helpers.remove(path.join(target, config.folder.node_modules));
    Helpers.createSymLink(this.path, target, {
      continueWhenExistedFolderDoesntExists: true,
    });
  };

  /**
   * Just create folder... without npm instalation
   */
  public recreateFolder = () =>
    !fse.existsSync(this.path) && Helpers.mkdirp(this.path);

  // public contains(pkg: Package) {
  //   if (_.isObject(pkg) && pkg.name) {
  //     if (fse.existsSync(path.join(this.path, pkg.name))) {

  //     }
  //   }
  //   return false;
  // }
}
