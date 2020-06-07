//#region @backend
import * as fse from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';

import { config } from '../../config';
import { Helpers } from 'tnp-helpers';
import { Project } from '../abstract/project/project';
import { Models } from 'tnp-models';
import { FeatureForProject } from '../abstract';

export class TnpBundle extends FeatureForProject {

  private notNeededReinstallationTnp = {};

  private reinstallCounter = 1;

  public get projectIsAllowedForInstall() {
    return ((this.project.isWorkspace || this.project.isStandaloneProject) &&
      !this.project.isTnp &&
      !this.project.name.startsWith('tnp')
    )
  }

  public installAsPackage() {

    if (!Project.Tnp) {
      console.trace(`** ERR Project.Tnp not available yet`)
    }

    let pathTnpCompiledJS = path.join((Project.Tnp as Project).location, config.folder.dist);
    if (!fse.existsSync(pathTnpCompiledJS)) {
      pathTnpCompiledJS = path.join((Project.Tnp as Project).location, config.folder.bundle);
    }
    const pathTnpPackageJSONData: Models.npm.IPackageJSON = fse
      .readJsonSync(path.join((Project.Tnp as Project).location, config.file.package_json)) as any;

    pathTnpPackageJSONData.name = config.file.tnpBundle;
    pathTnpPackageJSONData.tnp = undefined;
    pathTnpPackageJSONData.bin = undefined;
    pathTnpPackageJSONData.main = undefined;
    pathTnpPackageJSONData.preferGlobal = undefined;
    pathTnpPackageJSONData.dependencies = undefined;
    pathTnpPackageJSONData.devDependencies = undefined;

    this.reinstallTnp(this.project, pathTnpCompiledJS, pathTnpPackageJSONData)
  }


  private reinstallTnp(project: Project,
    pathTnpCompiledJS: string,
    pathTnpPackageJSONData: Models.npm.IPackageJSON) {

    const workspaceOrStandaloneLocation = (project.isWorkspace || project.isStandaloneProject) ? project.location :
      (project.isWorkspaceChildProject ? project.parent.location : void 0);

    if (!_.isString(workspaceOrStandaloneLocation)) {
      return;
    }

    if (_.isUndefined(this.notNeededReinstallationTnp[workspaceOrStandaloneLocation])) {
      this.notNeededReinstallationTnp[workspaceOrStandaloneLocation] = 0;
    }

    if (project.isTnp) {
      return;
    }

    if (this.notNeededReinstallationTnp[workspaceOrStandaloneLocation] > 2) {
      Helpers.log('[TNP helper] reinstall not needed')
      return;
    }


    const toCopyTnpDeps = [
      'tnp-models',
      'tnp-helpers',
      'tnp-db',
    ];

    function removeLinks(destNodeMOdulesPkgFolder: string) {
      [
        config.folder.src,
        config.folder.components,
        config.folder.tempSrcDist
      ].map(p => path.join(destNodeMOdulesPkgFolder, p)).forEach(c => {
        Helpers.removeIfExists(c);
      });
    }

    for (let index = 0; index < toCopyTnpDeps.length; index++) {
      const depName = toCopyTnpDeps[index];
      const sourceDep = path.join((Project.Tnp as Project).location, config.folder.node_modules, depName);
      const destDep = path.join(workspaceOrStandaloneLocation, config.folder.node_modules, depName);
      // Helpers.removeFolderIfExists(destDep);
      removeLinks(destDep);
      Helpers.copy(sourceDep, destDep, {
        overwrite: true,
        recursive: true,
        dereference: true,
      } as any);
    }

    const destCompiledJs = path.join(
      workspaceOrStandaloneLocation,
      config.folder.node_modules,
      config.file.tnpBundle
    );
    const destPackageJSON = path.join(
      workspaceOrStandaloneLocation,
      config.folder.node_modules,
      config.file.tnpBundle,
      config.file.package_json
    );

    removeLinks(destCompiledJs);
    Helpers.tryCopyFrom(`${pathTnpCompiledJS}/`, destCompiledJs, {
      dereference: true,
      filter: (src: string, dest: string) => {
        return !src.endsWith('/dist/bin') &&
          !src.endsWith('/bin') &&
          !/.*node_modules.*/g.test(src);
      }
    });

    fse.writeJsonSync(destPackageJSON, pathTnpPackageJSONData, {
      encoding: 'utf8',
      spaces: 2
    })

    const sourceTnpPath = path.join((Project.Tnp as Project).location, config.file.tnp_system_path_txt);
    const destTnpPath = path.join(workspaceOrStandaloneLocation, config.folder.node_modules,
      config.file.tnpBundle, config.file.tnp_system_path_txt)

    fse.copyFileSync(sourceTnpPath, destTnpPath);

    let lastTwo = _.first(pathTnpCompiledJS.match(/\/[a-zA-Z0-9\-\_]+\/[a-zA-Z0-9\-\_]+\/?$/));
    // console.info(`** tnp-bundle reinstalled from ${lastTwo}`)

    if (_.isUndefined(this.notNeededReinstallationTnp[workspaceOrStandaloneLocation])) {
      this.notNeededReinstallationTnp[workspaceOrStandaloneLocation] = 1;
    } else {
      ++this.notNeededReinstallationTnp[workspaceOrStandaloneLocation];
    }

    Helpers.log(`Tnp-bundle installed in ${project.name} from ${lastTwo} , `
      + `installs counter:${this.notNeededReinstallationTnp[workspaceOrStandaloneLocation]} `)

  }

}

 //#endregion
