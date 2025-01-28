import { Taon } from 'taon/src';
import { _ } from 'tnp-core/src';
import { BuildOptions } from '../../../options';

//#region port entity
@Taon.Entity({
  className: 'TaonBuild',
})
export class TaonBuild extends Taon.Base.AbstractEntity {
  static from(opt: Omit<TaonBuild, 'id' | 'version' | '_' | 'clone'>) {
    return _.merge(new TaonBuild(), opt);
  }

  //#region port entity / columns /  pid
  //#region @websql
  @Taon.Orm.Column.Number()
  //#endregion
  processInfoPort: number;
  //#endregion

  //#region port entity / columns /  serviceId
  //#region @websql
  @Taon.Orm.Column.Custom({
    type: 'varchar',
    length: 150,
    unique: true,
  })
  //#endregion
  projectLocation: string;
  //#endregion

  //#region port entity / columns /  type
  //#region @websql
  @Taon.Orm.Column.SimpleJson()
  //#endregion
  type: BuildOptions;
  //#endregion
}
//#endregion
