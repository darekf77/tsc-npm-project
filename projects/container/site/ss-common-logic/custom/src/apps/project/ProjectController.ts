import { Morphi } from 'morphi';
import * as _ from 'lodash';

import * as entities from '../../entities';
import * as controllers from '../../controllers';
import { PROJECT } from './PROJECT';
import { ProjectIsomorphicLib, Project } from 'tnp-bundle';
import { PROCESS } from 'baseline/ss-common-logic/src/apps/process/PROCESS';
//#region @backend
import { TnpDB, ProjectFrom } from 'tnp-bundle';
//#endregion

export interface IProjectController extends ProjectController {

}

@Morphi.Controller({
  className: 'ProjectController',
  entity: entities.PROJECT,
  additionalEntities: [ProjectIsomorphicLib, Project]
})
export class ProjectController extends Morphi.Base.Controller<entities.PROJECT> {


  @Morphi.Http.GET()
  getAll(
    @Morphi.Http.Param.Query('config') config?: Morphi.CRUD.ModelDataConfig,
    @Morphi.Http.Param.Query('slice') slice: number = 1)
    : Morphi.Response<PROJECT[]> {
    //#region @backendFunc
    return async () => {
      const db = await TnpDB.Instance;
      const projects = db.getProjects();
      const mapped = projects.map(p => {
        let res = p.project;
        res.modelDataConfig = config;
        return res as any;
      });
      for (let index = 0; index < mapped.length; index++) {
        const p = mapped[index];
        await this.addProcessesToModel(p as any);
      }
      return mapped;
    }
    //#endregion
  }


  getByLocation(
    location: string,
    config?: Morphi.CRUD.ModelDataConfig) {
    return this._getByLocation(location, config);
  }


  @Morphi.Http.GET('/location/:location')
  private _getByLocation(
    @Morphi.Http.Param.Path('location') location: string,
    @Morphi.Http.Param.Query('config') config?: Morphi.CRUD.ModelDataConfig)
    : Morphi.Response<PROJECT> {
    //#region @backendFunc
    return async () => {
      let res = ProjectFrom(decodeURIComponent(location));
      res.modelDataConfig = config;
      await this.addProcessesToModel(res as any);
      return res as any;
    }
    //#endregion
  }

  //#region @backend

  private async addProcessesToModel(p: PROJECT) {
    const db = await TnpDB.Instance;


    p.procStaticBuild = new PROCESS({
      cmd: 'tnp build:dist',
      cwd: p.location,
      async: true,
      name: `Static Build of project ${p.name}`
    })

    this.assignProc(p, db, 'procStaticBuild', {
      cmd: 'tnp build:dist',
      cwd: p.location,
      async: true,
      name: `Static Build of project ${p.name}`
    })

    this.assignProc(p, db, 'procWatchBuild', {
      cmd: 'tnp build:dist:watch',
      cwd: p.location,
      async: true,
      name: `Watch build of project ${p.name}`
    });

    this.assignProc(p, db, 'procServeStatic', {
      cmd: 'tnp start',
      cwd: p.location,
      async: true,
      name: `Server staticlyu project ${p.name}`
    })

    this.assignProc(p, db, 'procInitEnv', {
      cmd: 'tnp init --env=%s',
      cwd: p.location,
      async: false,
      name: `Init environment of project ${p.name}`
    });

    this.assignProc(p, db, 'procClear', {
      cmd: 'tnp clear:%s',
      cwd: p.location,
      async: false,
      name: `Clear project ${p.name}`
    });

  }

  private async assignProc(p: PROJECT, db: TnpDB,
    property: (keyof PROJECT), processOptions: { name: string; cmd: string; cwd?: string; async?: boolean }) {
    p[property as any] = new PROCESS(processOptions);

    const pid = (p && p[property]) ? (p[property] as PROCESS).pid : void 0;
    let ins = await db.transaction.setProcessAndGetExisted({
      className: 'PROJECT',
      entityId: p.location,
      entityProperty: property,
      pid
    });
    (p[property] as PROCESS).pid = ins.pid;
  }

  get db() {
    return entities.entities(this.connection as any)
  }

  get ctrl() {
    return controllers.controllers()
  }

  async initExampleDbData() {
    // console.log('Don not init this! OK ')

  }
  //#endregion


}
