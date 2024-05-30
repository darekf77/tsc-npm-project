//#region imports
import { chalk, crossPlatformPath, path } from 'tnp-core/src';
import { fse } from 'tnp-core/src';
import { _ } from 'tnp-core/src';

import * as TerminalProgressBar from 'progress';

import { PREFIXES, config } from 'tnp-config/src';
import { Project } from '../../abstract/project';
import { Helpers } from 'tnp-helpers/src';
import {
  dedupePackages,
  nodeModulesExists,
  addDependenceis,
} from './node-modules-helpers.backend';
import { NodeModulesCore } from './node-modules-core.backend';
import { ONLY_COPY_ALLOWED } from '../../../constants';
import { Models } from '../../../models';

//#endregion

export class NodeModulesBase extends NodeModulesCore {
  /**
   * Copy (just linke npm install) all package from
   * source project node_modules to itself
   * @param source project - source of node_modules
   * @param triggerMsg reason to copy packages
   */
  public async copyFrom(source: Project, options: { triggerMsg: string }) {
    const { triggerMsg } = options || {};

    Helpers.logInfo(
      `[node_modules] Copy instalation of npm packages from ` +
        `${chalk.bold(source.genericName)} to ${chalk.bold(this.project.genericName)} ${triggerMsg}`,
    );

    if (source.__smartNodeModules.exists) {
      this.project.__node_modules.remove();
      Helpers.mkdirp(this.project.__node_modules.path);
      const packagesToLinkOrCopy = [
        ...Helpers.foldersFrom(source.__smartNodeModules.path),
        ...Helpers.linksToFoldersFrom(source.__smartNodeModules.path),
        ...[crossPlatformPath([source.__node_modules.path, '.install-date'])],
      ].filter(f => {
        return (
          fse.existsSync(f) &&
          !path.basename(f).startsWith(PREFIXES.RESTORE_NPM)
        );
      });

      Helpers.logInfo(`

      UPDATING node_moduels from global container (${packagesToLinkOrCopy.length} packages)

      `);

      for (let index = 0; index < packagesToLinkOrCopy.length; index++) {
        const f = packagesToLinkOrCopy[index];
        const basename = path.basename(f);
        const destAbsPath = crossPlatformPath([
          this.project.__node_modules.path,
          basename,
        ]);
        const sourceRealAbsPath = fse.realpathSync(f);
        const copyInsteadLink = ONLY_COPY_ALLOWED.includes(basename);
        if (Helpers.exists(sourceRealAbsPath)) {
          if (copyInsteadLink) {
            if (Helpers.isFolder(sourceRealAbsPath)) {
              Helpers.copy(sourceRealAbsPath, destAbsPath, {
                recursive: true,
              });
            } else {
              Helpers.copyFile(sourceRealAbsPath, destAbsPath);
            }
          } else {
            Helpers.createSymLink(sourceRealAbsPath, destAbsPath, {
              speedUpProcess: process.platform === 'win32',
            });
          }
        }
      }

      return;
    }

    source.__packageJson.save(
      `instalation of packages from ${this.project.genericName} ${triggerMsg} `,
    );

    // global.spinner?.start()

    for (let index = 0; index < Models.ArrNpmDependencyType.length; index++) {
      const depName = Models.ArrNpmDependencyType[index];
      const deppp = source.__getDepsAsProject(depName);
      for (let index2 = 0; index2 < deppp.length; index2++) {
        const dep = deppp[index2];
        await source.__node_modules.copy(dep.name).to(this.project);
      }
    }

    source.__node_modules.copyBin.to(this.project);
    // global.spinner?.start()

    // const overridedDeps = this.project.getDepsAsPackage('tnp_overrided_dependencies');
    // for (let indexOverridedDeps = 0; indexOverridedDeps < overridedDeps.length; indexOverridedDeps++) {
    //   const d = overridedDeps[indexOverridedDeps];
    //   await this.project.npmPackages.install(triggerMsg, d);
    // }

    this.project.__node_modules.dedupe();
  }

  private get copyBin() {
    const self = this;
    return {
      to(destinationProject: Project, linkOnly = false) {
        const source = path.join(
          self.project.location,
          config.folder.node_modules,
          config.folder._bin,
        );
        const dest = path.join(
          destinationProject.location,
          config.folder.node_modules,
          config.folder._bin,
        );
        if (fse.existsSync(source)) {
          if (linkOnly) {
            Helpers.createSymLink(source, dest);
          } else {
            Helpers.copy(source, dest);
          }
        }
      },
    };
  }

  /**
   *  copy package to project
   * @param pkg
   * @param options
   */
  public copy(
    pkg: string | Models.Package,
    options?: { override?: boolean; linkOnly?: boolean },
  ) {
    const self = this;
    return {
      async to(destination: Project) {
        const { override = false, linkOnly = false } = options || {};

        const packageName = (
          _.isObject(pkg) ? (pkg as Models.Package).name : pkg
        ) as string;
        let projToCopy = Project.ins.From(
          path.join(
            self.project.location,
            config.folder.node_modules,
            packageName,
          ),
        );
        const nodeModeulesPath = path.join(
          destination.location,
          config.folder.node_modules,
        );
        if (!fse.existsSync(nodeModeulesPath)) {
          Helpers.mkdirp(nodeModeulesPath);
        }

        const pDestPath = path.join(nodeModeulesPath, projToCopy.name);

        if (linkOnly) {
          projToCopy.linkTo(pDestPath);
        } else {
          const addedSuccess = projToCopy.__copyManager.generateSourceCopyIn(
            pDestPath,
            { override, filterForReleaseDist: false, showInfo: false },
          );
          if (!addedSuccess) {
            return;
          }
        }

        // const orghideInfos = global.hideInfos;
        // global.hideInfos = true;
        // const orghideWarnings = global.hideWarnings;
        // global.hideWarnings = true;
        // const orghideLog = global.hideLog;
        // global.hideLog = true;
        const depsNames = addDependenceis(self.project, self.project.location);
        // global.hideInfos = orghideInfos;
        // global.hideWarnings = orghideWarnings;
        // global.hideLog = orghideLog;
        const prog = new TerminalProgressBar(
          'Please wait: :current / :total',
          depsNames.length,
        );
        depsNames
          // .filter(dep => dep !== self.project.name)
          .forEach(pkgName => {
            const pDestPathPackage = path.join(nodeModeulesPath, pkgName);
            projToCopy = Project.ins.From(
              path.join(
                self.project.location,
                config.folder.node_modules,
                pkgName,
              ),
            );
            if (projToCopy) {
              if (linkOnly) {
                projToCopy.linkTo(pDestPathPackage);
              } else {
                projToCopy.__copyManager.generateSourceCopyIn(
                  pDestPathPackage,
                  { override, filterForReleaseDist: false, showInfo: false },
                );
              }
            } else {
              Helpers.warn(
                `This is not a npm package: '${pkgName}' inside "${self.project.location}"`,
              );
            }
            prog.tick();
          });
        prog.terminate();
      },
    };
  }
}
