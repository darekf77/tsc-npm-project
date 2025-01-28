import { CoreModels, _, UtilsTerminal, path, chalk } from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';
import { BaseCommandLineFeature } from 'tnp-helpers/src';
import { Project } from '../abstract/project';
import { BuildOptions, ReleaseOptions } from '../../options';
import { Models } from '../../models';
import { config } from 'tnp-config/src';

class $Release extends BaseCommandLineFeature<ReleaseOptions, Project> {
  //#region __initialize__
  __initialize__() {
    //#region resolve smart containter
    let resolved = [];
    if (this.project.__isContainer) {
      // @ts-ignore
      resolved = Helpers.cliTool.resolveItemsFromArgsBegin<Project>(
        this.args,
        a => {
          return Project.ins.From(path.join(this.project.location, a));
        },
      )?.allResolved;

      const otherDeps = this.project.children.filter(c => {
        return !resolved.includes(c);
      });

      const trusdedPackages = this.project.__trusted;
      resolved = this.project.ins
        .sortGroupOfProject<Project>(
          [...resolved, ...otherDeps],
          proj => proj.__includeOnlyForRelease || [],
          proj => proj.name,
        )
        .filter(d => d.name !== this.project.name)
        .filter(d => {
          if (this.params.trusted) {
            return trusdedPackages.includes(d.name);
          }
          return true;
        });
    }
    this.params = ReleaseOptions.from({ ...this.params, resolved });
    //#endregion
  }
  //#endregion

  //#region _
  public async _() {
    await this.project.releaseProcess.displayReleaseProcessMenu();

    this._exit();
  }
  //#endregion

  //#region old release functions

  //#region install:locally
  async installLocally() {
    if (
      !this.project.hasFolder('out') ||
      Helpers.filesFrom(this.project.pathFor('out'), true).length === 0
    ) {
      Helpers.info('Building project...');
      await this.project.build(BuildOptions.from({ watch: false }));
    }
    await this.project.__libVscodext.installLocally(this.params);
    this._exit();
  }

  async clearInstallLocally() {
    await this.project.clear();
    await this.installLocally();
  }
  //#endregion

  //#region automatic release
  async auto() {
    await this.startReleaseProcess('patch', true);
  }
  //#endregion

  //#region major
  async major() {
    await this.startReleaseProcess('major');
  }
  //#endregion

  //#region minor
  async minor() {
    await this.startReleaseProcess('minor');
  }
  //#endregion

  //#region patch
  async patch() {
    await this.startReleaseProcess('patch');
  }
  //#endregion

  //#region set minor version
  async setMinorVersion() {
    let children = Project.ins.Current.children as Project[];
    const minorVersionToSet = Number(
      _.first(this.args).trim().replace('v', ''),
    );

    for (let index = 0; index < children.length; index++) {
      const child = children[index] as Project;
      // if (child.minorVersion === minorVersionToSet) {
      //   Helpers.info(`[${child.name}] Minor version ${minorVersionToSet} alread set.`);
      // } else {
      Helpers.info(
        `[${child.name}] Updating minor version for ${child.name}@${child.__packageJson.data.version} => ${minorVersionToSet} ... `,
      );
      await child.__setMinorVersion(minorVersionToSet, true);
      // }

      // Helpers.taskDone();
    }
    this._exit();
  }
  //#endregion

  //#region set major version
  /**
   * settin npm version
   */
  async setMajorVersion() {
    let children = this.project.children;

    const majorVersionToSet = Number(
      _.first(this.args).trim().replace('v', ''),
    );

    const frameworkVersion = (this.params.frameworkVersion ||
      this.params['frameworkVer'] ||
      this.params['fver']) as string;

    //#region quesitons
    if (frameworkVersion) {
      Helpers.info(
        `
      Setting major npm version "${majorVersionToSet}" for this
      and for all ${children.length} children packages.
      (Framework version from parameters "v${frameworkVersion}"
      will be set for this and all children packages as well)
      `,
      );
      if (!(await Helpers.questionYesNo(`Proceed ?`))) {
        this._exit();
      }
    } else {
      Helpers.info(
        `
      Setting major npm version "${majorVersionToSet}" for this
      and for all ${children.length} children packages.`,
      );
      if (!(await Helpers.questionYesNo(`Proceed ?`))) {
        this._exit();
      }
    }
    //#endregion

    //#region setting major version (and optionally framework ver.) for current project
    if (frameworkVersion) {
      if (this.project.__frameworkVersion === `v${frameworkVersion}`) {
        Helpers.info(
          `[${this.project.universalPackageName}] Framwork version v${frameworkVersion} alread set.`,
        );
      }
      Helpers.info(
        `[${this.project.universalPackageName}] Updating framework version for ` +
          `${this.project.__frameworkVersion} => v${frameworkVersion} ... `,
      );
      await this.project.__setFramworkVersion(
        `v${frameworkVersion}` as CoreModels.FrameworkVersion,
      );
    }

    if (this.project.npmHelpers.majorVersion === majorVersionToSet) {
      Helpers.info(
        `[${this.project.universalPackageName}] Major version ${majorVersionToSet} alread set.`,
      );
    }
    Helpers.info(
      `[${this.project.universalPackageName}] Updating version ` +
        `${this.project.__packageJson.data.version} => ${majorVersionToSet} ... `,
    );
    await this.project.__setMajorVersion(majorVersionToSet);

    //#endregion

    //#region setting major version (and optionally framework ver.) for children
    for (let index = 0; index < children.length; index++) {
      const child = children[index] as Project;
      if (frameworkVersion) {
        if (child.__frameworkVersion === `v${frameworkVersion}`) {
          Helpers.info(
            `[${child.name}] Framwork version v${frameworkVersion} alread set.`,
          );
        }
        Helpers.info(
          `[${child.name}] Updating framework version for ` +
            `${child.__frameworkVersion} => v${frameworkVersion} ... `,
        );
        await child.__setFramworkVersion(
          `v${frameworkVersion}` as CoreModels.FrameworkVersion,
        );
      }
      if (child.npmHelpers.majorVersion === majorVersionToSet) {
        Helpers.info(
          `[${child.name}] Major version ${majorVersionToSet} alread set.`,
        );
      }
      Helpers.info(
        `[${child.name}] Updating version for ${child.name}` +
          `@${child.__packageJson.data.version} => ${majorVersionToSet} ... `,
      );
      await child.__setMajorVersion(majorVersionToSet);

      // Helpers.taskDone();
    }
    //#endregion

    Helpers.taskDone(`Major version set to ${majorVersionToSet}`);
    this._exit();
  }
  //#endregion

  //#region set framework version
  async setFrameworkVersion() {
    const newFrameworkVersion =
      `v${this.firstArg.replace('v', '')}` as CoreModels.FrameworkVersion;
    Helpers.info(
      `Setting framework version (${newFrameworkVersion}) for ${this.project.name}... and children`,
    );

    await this.project.__setFramworkVersion(newFrameworkVersion);
    for (const child of this.project.children) {
      await child.__setFramworkVersion(newFrameworkVersion);
    }
    Helpers.taskDone(`Framework version set to ${newFrameworkVersion}`);
    this._exit();
  }
  //#endregion

  //#region start
  private async startReleaseProcess(
    npmReleaseVersionType: CoreModels.ReleaseVersionType = 'patch',
    automaticRelease: boolean = false,
  ) {
    Helpers.clearConsole();
    // const taonReleaseVersionType = await this.chooseTaonReleaseVersionType();

    const releaseOptions = ReleaseOptions.from({
      ...this.params,
      releaseType: npmReleaseVersionType,
      automaticRelease,
      skipProjectProcess: true,
      finishCallback: () => {
        this._exit();
      },
    });
    releaseOptions.specifiedVersion =
      this.args.find(
        k => k.startsWith('v') && Number(k.replace('v', '')) >= 3,
      ) || '';
    releaseOptions.shouldReleaseLibrary = await this.shouldReleaseLibMessage(
      releaseOptions,
      this.project,
    );
    await this.project.release(releaseOptions);
    this._exit();
  }
  //#endregion

  //#region should release lib
  async shouldReleaseLibMessage(
    releaseOptions: ReleaseOptions,
    project: Project,
  ) {
    //#region @backendFunc
    if (releaseOptions.automaticReleaseDocs) {
      return false;
    }
    let newVersion;
    if (releaseOptions.releaseType === 'major') {
      newVersion = project.__versionMajorPlusWithZeros;
    } else if (releaseOptions.releaseType === 'minor') {
      newVersion = project.__versionMinorPlusWithZeros;
    } else if (releaseOptions.releaseType === 'patch') {
      newVersion = project.__versionPatchedPlusOne;
    }

    // TODO detecting changes for children when start container

    if (project.__isSmartContainer) {
      Helpers.info(`Pacakges available for new version release:

${project.children
  .map(c => ` - @${project.name}/${c.name} v${newVersion}`)
  .join('\n')}
`);
      const message = 'Proceed with lib release ?';

      return await Helpers.questionYesNo(message);
    }

    if (project.__isContainer && !project.__isSmartContainer) {
      Helpers.info(`Pacakges available for new version release:

    ${(releaseOptions.resolved || [])
      .map(
        (c, index) =>
          `(${index + 1}) ` +
          `${
            c.__isSmartContainer
              ? '@' + c.name + `/(${c.children.map(l => l.name).join(',')})`
              : c.name
          }` +
          `@${c.getVersionFor(releaseOptions.releaseType)}`,
      )
      .join(', ')}
    `);
      const message = `Proceed ${
        releaseOptions.automaticRelease ? '(automatic)' : ''
      } release of packages from ${project.genericName} ?`;
      if (!(await Helpers.questionYesNo(message))) {
        this._exit();
      }
      return true;
    } else {
      const message = `Proceed with release of new version: ${newVersion} ?`;
      return releaseOptions.automaticRelease
        ? true
        : await Helpers.questionYesNo(message);
    }
    //#endregion
  }
  //#endregion

  //#endregion
}

export default {
  $Release: Helpers.CLIWRAP($Release, '$Release'),
};
