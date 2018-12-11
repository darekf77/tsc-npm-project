
import { Morphi } from 'morphi';
import * as _ from 'lodash';

export { Handler } from 'express';
import { UploadedFile } from "express-fileupload";
import { Helpers } from 'morphi';
//#endregion


import * as entities from '../../entities';
import * as controllers from '../../controllers';

import { MULTIMEDIA, MultimediaType } from '../../entities/core/MULTIMEDIA';


@Morphi.Controller({
  className: 'MultimediaController',
  //#region @backend
  auth: () => {
    return Morphi.Auth('bearer', { session: false });
  }
  //#endregion
})
export class MultimediaController extends Morphi.Base.Controller<entities.MULTIMEDIA> {

  @Morphi.Base.InjectCRUDEntity(entities.MULTIMEDIA) entity: entities.MULTIMEDIA;

  constructor() {
    super()
    entities.MULTIMEDIA.recreateFolder()
  }

  @Morphi.Http.POST('/upload')
  upload(): Morphi.Response<boolean> {
    //#region @backendFunc
    return async (req) => {
      const file: UploadedFile = _.get(req, 'files.file');


      if (!file) {
        throw 'No files were uploaded.';
      }
      if (entities.MULTIMEDIA.mimetype.picture.includes(file.mimetype)) {
        let m = new entities.MULTIMEDIA()
        m.name = file.name;
        m.type = 'picture';
        m = await this.db.MULTIMEDIA.save(m)
        await file.mv(m.path, undefined) as any;
        console.log('uploaded file', file)
      }

      return true;
    }
    //#endregion
  }


  //#region @backend

  @Morphi.Orm.InjectConnection connection: Morphi.Orm.Connection;

  get db() {
    // @ts-ignore
    return entities.entities(this.connection as any);
  }

  // @ts-ignore
  get ctrl() {
    return controllers.controllers()
  }




  private discover(folderName, type: MultimediaType) {
    const res: MULTIMEDIA[] = []
    const files: string[] = Helpers.getRecrusiveFilesFrom(folderName);
    files.forEach(name => {
      let m = this.db.MULTIMEDIA.create({
        name,
        type
      });
      res.push(m)
    })

    return res.map(r => {
      r.name = r.name.replace(folderName, '')
      return r;
    }).filter(r => {
      // console.log(`r.name ${r.name}`)
      return r.name && r.name.trim() !== '' && !r.name.startsWith('/.')
    })
  }

  async initExampleDbData() {

    const assets = [
      ...this.discover(ENV.pathes.backup.picture, 'picture'),
      ...this.discover(ENV.pathes.backup.audio, 'audio'),
      ...this.discover(ENV.pathes.backup.video, 'video')
    ].map(m => {
      return this.db.MULTIMEDIA.save(m);
    });

    await Promise.all(assets);

  }
  //#endregion


}
