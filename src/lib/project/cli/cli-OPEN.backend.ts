//#region @backend
import {
  CoreModels,
  _,
  crossPlatformPath,
  fse,
  glob,
  os,
  path,
} from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';
import { BaseCommandLineFeature } from 'tnp-helpers/src';
import { Project } from '../abstract/project';
import { BuildOptions, InitOptions } from '../../options';
import { MESSAGES, TEMP_DOCS } from '../../constants';
import { config } from 'tnp-config/src';
import { VpnSplit } from 'vpn-split/src';

export class $Open extends BaseCommandLineFeature<{}, Project> {
  public _() {
    Helpers.info('Opening folder...');
    let pathToFolder = this.firstArg;
    if (!pathToFolder) {
      pathToFolder = this.cwd;
    }
    if (!path.isAbsolute(pathToFolder)) {
      pathToFolder = this.project.pathFor(pathToFolder);
    }
    Helpers.openFolderInFileExploer(pathToFolder);
    this._exit();
  }

  CORE_CONTAINER() {
    const proj = this.project;
    const container = Project.by('container', proj.__frameworkVersion);
    if (container) {
      container.run(`code .`).sync();
    } else {
      Helpers.error(`Core container not found...`, false, true);
    }
    this._exit();
  }

  CORE_PROJECT() {
    if (
      this.project.__isCoreProject &&
      this.project.__frameworkVersionAtLeast('v2')
    ) {
      this.project
        .run(
          `code ${Project.by(this.project.type, this.project.__frameworkVersionMinusOne).location} &`,
        )
        .sync();
    } else {
      this.project
        .run(
          `code ${Project.by(this.project.type, this.project.__frameworkVersion).location} &`,
        )
        .sync();
    }
    this._exit();
  }

  TNP_PROJECT() {
    Project.ins.Tnp.run(`code ${Project.ins.Tnp.location} &`).sync();
    this._exit();
  }

  UNSTAGE() {
    const proj = Project.ins.Current;
    const libs = proj.__childrenThatAreLibs.filter(f =>
      f.git.thereAreSomeUncommitedChangeExcept([
        config.file.package_json,
        config.file.taon_jsonc,
      ]),
    );
    libs.forEach(l => l.__openInVscode());
    this._exit();
  }

  DB() {
    this._openThing('tmp-db.sqlite');
  }

  ROUTES() {
    this._openThing('tmp-routes.json');
  }


  release() {
    Helpers.run(`code ${this.project.releaseCiProject.location}`).sync();
    process.exit(0);
  }

  private _openThing(fileName: string) {
    const proj = this.project;

    const openFn = pathToTHing => {
      if (fileName.endsWith('.json')) {
        Helpers.run(`code ${pathToTHing}`, { biggerBuffer: false }).sync();
      } else {
        Helpers.openFolderInFileExploer(pathToTHing);
      }
    };

    if (proj.__isStandaloneProject && !proj.__isSmartContainerChild) {
      const pathToDB = path.join(proj.location, fileName);
      openFn(pathToDB);
    }

    const smartContainerFn = (project: Project) => {
      const patternPath = `${path.join(project.location, config.folder.dist, project.name)}/*`;
      const folderPathes = glob.sync(patternPath);

      const lastFolder = _.first(
        folderPathes
          .map(f => {
            return {
              folderPath: f,
              mtimeMs: fse.lstatSync(f).mtimeMs,
            };
          })
          .sort((a, b) => {
            if (a.mtimeMs > b.mtimeMs) return 1;
            if (a.mtimeMs < b.mtimeMs) return -1;
            return 0;
          }),
      );

      if (!lastFolder) {
        Helpers.error(
          `Last project not started...

          not porjects here in "${patternPath}"

          `,
          false,
          true,
        );
      }

      const pathToTHing = path.join(lastFolder.folderPath, fileName);
      openFn(pathToTHing);
    };

    if (proj.__isSmartContainer) {
      smartContainerFn(proj);
    }
    if (proj.__isSmartContainerChild) {
      smartContainerFn(proj.parent);
    }
    this._exit();
  }
}

export default {
  $Open: Helpers.CLIWRAP($Open, '$Open'),
};
