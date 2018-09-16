import * as _ from 'lodash';
import { Entity, Column, PrimaryGeneratedColumn, EntityRepository } from "typeorm";
import { FormlyForm, DefaultModelWithMapping, CLASSNAME, Global, META } from 'morphi';

//#region @backend
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as child from 'child_process';
import { run, HelpersLinks, killProcess, pullCurrentBranch } from 'tnp-bundle';
import { DOMAIN_ENVIRONMENT } from './DOMAIN';
//#endregion
import { ProgressBarData, IProgressBarData } from 'baseline/ss-common-logic/src/entities/PROGRESS_BAR';



export interface IBUILD {
  name: string;
  pidBuildProces: number;
  pidClearProces: number;
  pidServeProces: number;
}

export enum BuildStatus {
  NONE,
  FAIL,
  SUCCES
}

//#region @backend
@Entity(META.tableNameFrom(BUILD))
//#endregion
@FormlyForm<BUILD>()
@DefaultModelWithMapping<BUILD>({
  gitFolder: '/',
  gitRemote: '',
  friendlyName: 'fiiendly name'
})
@CLASSNAME('BUILD')
export class BUILD extends META.BASE_ENTITY<BUILD> {


  //#region @backend
  get nameFromIdAndRemote() {
    return `${this.id}-${this.nameFromRemote}`;
  }

  get localPath() {

    return {
      repository: path.join(ENV.pathes.backup.repositories, this.nameFromIdAndRemote),
      repositoryFolder: path.join(ENV.pathes.backup.repositories, this.nameFromIdAndRemote, this.gitFolder),
      buildFolder: path.join(ENV.pathes.backup.builds, this.nameFromIdAndRemote),
      buildLog: path.join(ENV.pathes.backup.builds, `build-${this.nameFromIdAndRemote}.txt`),
      buildErrorLog: path.join(ENV.pathes.backup.builds, `build-error-${this.nameFromIdAndRemote}.txt`),
      serveLog: path.join(ENV.pathes.backup.builds, `serve-${this.nameFromIdAndRemote}.txt`),
      serveErrorLog: path.join(ENV.pathes.backup.builds, `serve-error-${this.nameFromIdAndRemote}.txt`)
    }

  }



  init() {
    if (_.isString(this.staticFolder) && this.staticFolder !== '') {
      this.reinitFrom.folder()
    } else {
      this.reinitFrom.repository()
    }
  }

  private get reinitFrom() {
    const self = this;
    return {
      folder() {

        if (ENV.name !== 'local') {
          pullCurrentBranch(self.staticFolder);
        }

        const toCopy = path.join(self.staticFolder, self.gitFolder);
        const dest = path.join(self.localPath.repository, self.gitFolder)

        const options: fse.CopyOptionsSync = {
          overwrite: true,
          recursive: true,
          filter: (src) => {
            return !/.*node_modules.*/g.test(src) &&
              !/.*tmp.*/g.test(src) &&
              !/\.vscode.*/g.test(src) &&
              !/.*dist.*/g.test(src) &&
              !fs.lstatSync(src).isSymbolicLink();
          }
        };

        fse.copySync(toCopy, dest, options);

        run(`tnp claer`, { cwd: dest });
        self.linkRepoToBuild()
      },

      repository() {
        const p = path.join(ENV.pathes.repositories, self.nameFromIdAndRemote);
        if (fse.existsSync(p)) {
          pullCurrentBranch(this.localPath.repositoryFolder);
        } else {
          run(`git clone ${self.gitRemote} ${self.nameFromIdAndRemote}`, { cwd: ENV.pathes.repositories })
        }
        self.linkRepoToBuild()
      }


    }


  }

  private linkRepoToBuild() {
    if (fse.existsSync(this.localPath.buildFolder)) {
      fse.removeSync(this.localPath.buildFolder)
    }

    HelpersLinks.createLink(this.localPath.buildFolder, this.localPath.repositoryFolder);
  }


  //#endregion



  @PrimaryGeneratedColumn()
  id: number;

  fromRaw(obj: BUILD): BUILD {
    throw new Error("Method not implemented.");
  }

  get name() {
    return (this.gitFolder !== '/') ? _.startCase(this.gitFolder) : _.startCase(this.nameFromRemote);
  }


  get nameFromRemote() {
    return _.first(this.gitRemote.match(/([a-z-])+\.git/g)).replace('.git', '');
  }

  @Column('simple-json', { nullable: true }) progress: ProgressBarData;

  @Column({ nullable: true }) port: string;
  @Column() gitRemote: string;

  @Column({ nullable: true }) pidBuildProces: number;
  @Column({ nullable: true }) pidClearProces: number;
  @Column({ nullable: true }) pidServeProces: number;

  @Column({ nullable: true }) staticFolder: string;

  @Column({ default: BuildStatus.NONE }) status: BuildStatus;

  @Column({ nullable: true, default: '/' }) gitFolder: string;

  @Column({ nullable: true, default: 'friendlyName' }) friendlyName: string;



}


export default BUILD;
