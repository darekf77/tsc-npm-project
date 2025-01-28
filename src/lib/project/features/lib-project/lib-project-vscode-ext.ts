import { config } from 'tnp-config/src';
import { crossPlatformPath, fse, path, _, chalk } from 'tnp-core/src';
import { BaseFeatureForProject, Helpers } from 'tnp-helpers/src';
import { Project } from '../../abstract/project';
import { Models } from '../../../models';
import { BuildOptions, ReleaseOptions } from '../../../options';

export class LibProjectVscodeExt extends BaseFeatureForProject<Project> {
  public get extensionVsixName() {
    return `${this.project.name}-${this.project.version}.vsix`;
  }

  // methods / install locally
  async installLocally(releaseOptions?: ReleaseOptions) {
    //
    if (!this.project.__isVscodeExtension) {
      Helpers.error(`Project is not vscode extension`, false, true);
    }
    const vsixPackageName = this.extensionVsixName.replace(
      config.frameworkNames.productionFrameworkName,
      config.frameworkName,
    );
    // .replace('.vsix', '-') +
    // new Date().getTime() +
    // '.vsix';
    const copyToInstallDir = [
      'logo-128.png',
      config.file.package_json,
      config.file.tsconfig_json,
    ];

    if (!this.project.containsFile(config.folder.out)) {
      await this.project.build(BuildOptions.from({ watch: false }));
    }
    const pathTempInstallDir = this.project.pathFor(`tmp-install-dir`);
    const pathPackageJSON = crossPlatformPath([
      pathTempInstallDir,
      config.file.package_json,
    ]);
    const bundleExtensionJson = crossPlatformPath([
      pathTempInstallDir,
      'extension.js',
    ]);
    Helpers.remove(pathTempInstallDir);

    await Helpers.ncc(
      crossPlatformPath([this.project.location, 'out', 'extension.js']),
      bundleExtensionJson,
    );

    for (const fileRelative of copyToInstallDir) {
      const source = crossPlatformPath([this.project.location, fileRelative]);
      const dest = crossPlatformPath([pathTempInstallDir, fileRelative]);
      Helpers.copyFile(source, dest);
    }
    Helpers.setValueToJSON(pathPackageJSON, 'main', 'extension.js');
    const tempProj = Project.ins.From(pathTempInstallDir);
    // await tempProj.build(BuildOptions.from({ watch: false }));
    const extensionName = (tempProj.readJson(config.file.package_json) as any)
      .name;

    Helpers.setValueToJSON(
      tempProj.pathFor(config.file.package_json),
      'name',
      extensionName.replace(
        config.frameworkNames.productionFrameworkName,
        config.frameworkName,
      ),
    );

    Helpers.setValueToJSON(
      tempProj.pathFor(config.file.package_json),
      'scripts.vscode:prepublish',
      void 0,
    );

    Helpers.setValueToJSON(
      tempProj.pathFor(config.file.package_json),
      'displayName',
      extensionName.replace(
        config.frameworkNames.productionFrameworkName,
        config.frameworkName,
      ),
    );

    await tempProj.__libVscodext.createVscePackage(false);

    Helpers.info(
      `Installing extension: ${vsixPackageName} ` +
        `with creation date: ${fse.lstatSync(tempProj.pathFor(vsixPackageName)).birthtime}...`,
    );
    tempProj.run(`code --install-extension ${vsixPackageName}`).sync();
  }

  // methods / create vscode package
  async createVscePackage(showInfo = true) {
    //
    const vsixPackageName = this.extensionVsixName;
    try {
      await Helpers.actionWrapper(
        () => {
          this.project.run(`taon-vsce package`).sync();
        },
        `Building vsix package ` + chalk.bold(vsixPackageName) + `... `,
      );
      if (showInfo) {
        const commandInstall = chalk.bold(
          `${config.frameworkName} install:locally`,
        );
        Helpers.info(`

        Please use command: ${commandInstall} # or ${config.frameworkName} il
        to install this package in local vscode instance.

        `);
      }
    } catch (error) {
      Helpers.error(error, true, true);
      Helpers.error(`Not able to build ${vsixPackageName} package `);
    }
  }
}
