import * as _ from 'lodash';
import * as fse from 'fs-extra';
import * as rimraf from 'rimraf';
import * as path from 'path';
import { IPackageJSON } from '../models';
import config from '../config';

const PATHES = {
  BASE_FOLDER_TEST: path.join(__dirname, '..', '..', 'tmp-tests-context')
}


function RemoveTestCatalogs() {
  return function (target) {

    rimraf.sync(PATHES.BASE_FOLDER_TEST);
    fse.mkdirpSync(PATHES.BASE_FOLDER_TEST);

  }
}

type FuncTest = (locationContext: string, testName: string, options?: {
  packageJSON?: (relativePath: string, callback: (packageJSON: IPackageJSON) => void) => void;
}) => any



@RemoveTestCatalogs()
export class SpecWrap {

  static create() {
    return new SpecWrap()
  }
  private testsDescribtion: string;
  describe(testsDescribtion: string): string {
    this.testsDescribtion = testsDescribtion;
    return testsDescribtion;
  }

  private kamelCaseTestName: string;
  private testName: string;
  async it(testName: string, callback: FuncTest) {
    // await SpecHelper.wrapper_it(, callback);
    this.testName = testName;
    this.kamelCaseTestName = (`${_.kebabCase(this.testsDescribtion)}---${_.kebabCase(testName)}`)
    try {
      await this.run(callback)
    } catch (error) {

    }

  }

  private packageJSON(location: string) {
    return (relativePath: string, callback) => {
      const fullPath = path.join(location, relativePath, config.file.package_json);
      if (!fse.existsSync(fullPath)) {
        throw `Package json doesn't exist in ${fullPath}`
      }
      const c = fse.readJSONSync(fullPath, {
        encoding: 'utf8'
      });
      if (_.isFunction(callback)) {
        callback(c);
      }
      fse.writeJSONSync(fullPath, c, {
        encoding: 'utf8',
        spaces: 2
      })
    }
  }

  async run(test: FuncTest) {

    const location = path.join(path.join(PATHES.BASE_FOLDER_TEST, this.kamelCaseTestName));
    rimraf.sync(location);
    fse.mkdirpSync(location);
    global.muteMessages = true;
    const oldCwd = process.cwd()
    process.chdir(location);

    await this.runSyncOrAsync(() => {
      return test(location, this.testName, {
        packageJSON: this.packageJSON(location)
      })
    })
    global.muteMessages = false;
    process.chdir(oldCwd);


  }

  async runSyncOrAsync(fn: Function) {
    if (_.isUndefined(fn)) {
      return;
    }
    // let wasPromise = false;
    let promisOrValue = fn()
    if (promisOrValue instanceof Promise) {
      // wasPromise = true;
      promisOrValue = Promise.resolve(promisOrValue)
    }
    // console.log('was promis ', wasPromise)
    return promisOrValue;
  }


}
