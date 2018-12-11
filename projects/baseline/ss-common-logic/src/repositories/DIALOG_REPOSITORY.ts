//#region @backend
import { Morphi} from 'morphi';
import { DIALOG } from '../entities/DIALOG';

export interface DIALOG_ALIASES {

  dialog: string;
  dialogs: string;

}

@Morphi.Repository()
export class DIALOG_REPOSITORY extends Morphi.Base.Repository<DIALOG, DIALOG_ALIASES> {


  globalAliases: (keyof DIALOG_ALIASES)[] = ['dialog', 'dialogs'];


}

//#endregion
