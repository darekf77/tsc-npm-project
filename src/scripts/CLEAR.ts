
import * as _ from 'lodash';
import { LibType, BuildDir } from '../models';
import { clearFiles } from "../helpers";
import { Project } from '../project';
import { clearConsole } from '../process';

export function clear(all = false) {
    clearConsole()
    Project.Current.clear(all)
    process.exit(0)
}

export default {
    $CLEAN: (args) => clear(),
    $CLEAR: (args) => clear(),
    $CLEAN_ALL: (args) => clear(true),
    $CLEAR_ALL: (args) => clear(true)
}
