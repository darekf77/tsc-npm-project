//#region @backend
import { Morphi } from 'morphi';
import { EMAIL_TYPE } from '../../entities/core/EMAIL_TYPE';
import { EMAIL_TYPE_NAME } from '../../entities/core/EMAIL_TYPE';

export interface EMAIL_TYPE_ALIASES {

  type: string;
  types: string;


}



@Morphi.Repository()
export class EMAIL_TYPE_REPOSITORY extends Morphi.Base.Repository<EMAIL_TYPE, EMAIL_TYPE_ALIASES> {


  globalAliases: (keyof EMAIL_TYPE_ALIASES)[] = ['type', 'types']


  async getBy(name: EMAIL_TYPE_NAME) {

    const etype = await this.findOne({
      where: {
        name
      }
    })
    return etype;

  }
  async init() {

    const types = [
      await this.save(this.createFrom('facebook')),
      await this.save(this.createFrom('normal_auth')),
      await this.save(this.createFrom('twitter')),
      await this.save(this.createFrom('google_plus'))
    ];
    return types;

  }

  createFrom(name: EMAIL_TYPE_NAME): EMAIL_TYPE {

    let t = new EMAIL_TYPE();
    t.name = name;
    return t;

  }
}
//#endregion
