//#region @backend
import { CoreModels, _, crossPlatformPath, os, path } from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';
import { BaseCommandLineFeature } from 'tnp-helpers/src';
import { Project } from '../abstract/project';
import { BuildOptions, InitOptions } from '../../options';
import { MESSAGES, TEMP_DOCS } from '../../constants';
import { Models } from '../../models';
import { config } from 'tnp-config/src';

export class $Test extends BaseCommandLineFeature<{}, Project> {
  async _() {
    await this._testSelectors(false, false, this.argsWithParams);
  }

  WATCH = async (args: string) => {
    await this._testSelectors(true, false, args);
  };

  WATCH_DEBUG = async (args: string) => {
    await this._testSelectors(true, true, args);
  };

  TEST_DEBUG = async (args: string) => {
    await this._testSelectors(false, true, args);
  };

  MOCHA_WATCH = async (args: string) => {
    await this._mochaTests(true, false, args);
  };

  MOCHA_WATCH_DEBUG = async (args: string) => {
    await this._mochaTests(true, true, args);
  };

  MOCHA = async (args: string) => {
    await this._mochaTests(false, false, args);
  };

  MOCHA_DEBUG = async (args: string) => {
    await this._mochaTests(false, true, args);
  };

  JEST_WATCH = async (args: string) => {
    await this._jestTests(true, false, args);
  };

  JEST_WATCH_DEBUG = async (args: string) => {
    await this._jestTests(true, true, args);
  };

  JEST = async (args: string) => {
    await this._jestTests(false, false, args);
  };

  JEST_DEBUG = async (args: string) => {
    await this._jestTests(false, true, args);
  };

  async _testSelectors(watch: boolean, debug: boolean, args: string) {
    const proj = Project.ins.Current as Project;
    if (!proj.__isStandaloneProject || proj.typeIsNot('isomorphic-lib')) {
      Helpers.error(
        `[${config.frameworkName}] tests for organization in progress `,
        false,
        true,
      );
    }

    const [possibleTest] = args.split(' ');
    const testType = Models.TestTypeTaonArr.includes(possibleTest as any)
      ? possibleTest
      : void 0;
    const res = testType
      ? testType // @ts-ignore
      : await Helpers.consoleGui.select<Models.TestTypeTaon>(
          `What do you want to test ? ${
            !watch ? '(single run ' : '(watch mode '
          } ${debug ? '- with debugger connected' : '- without debugger'})`,
          [
            {
              name: 'Mocha (backend tests from /src/tests/**/*.test.ts)',
              value: 'mocha',
            },
            {
              name: 'Jest (angular unit/integration tests from /src/**/*.spec.ts )   ',
              value: 'jest',
            },
            {
              name: 'Cypress (e2e tests from /src/app//**/*.e2e.ts )',
              value: 'cypress',
            },
          ],
        );
    if (testType) {
      args = args.split(' ').slice(1).join(' ');
    }

    if (res === 'mocha') {
      await this._mochaTests(watch, debug, args);
    } else if (res === 'jest') {
      await this._jestTests(watch, debug, args);
    } else if (res === 'cypress') {
      await this._cypressTests(watch, debug, args);
    } else {
      this._exit();
    }
  }

  async _cypressTests(watch: boolean, debug: boolean, args: string) {
    const proj = Project.ins.Current;
    await proj.init('initing before cypress tests');
    if (watch) {
      await proj.__testsCypress.startAndWatch(args.trim().split(' '), debug);
    } else {
      await proj.__testsCypress.start(args.trim().split(' '), debug);
    }
    if (!watch) {
      this._exit();
    }
  }

  async _mochaTests(watch: boolean, debug: boolean, args: string) {
    const proj = Project.ins.Current;
    await proj.init('initing before mocha tests');
    if (watch) {
      await Project.ins.Current.__tests.startAndWatch(
        args.trim().split(' '),
        debug,
      );
    } else {
      await Project.ins.Current.__tests.start(args.trim().split(' '), debug);
    }
    if (!watch) {
      this._exit();
    }
  }

  async _jestTests(watch: boolean, debug: boolean, args: string) {
    const proj = Project.ins.Current;
    await proj.init('initing before jest tests');
    if (watch) {
      await proj.__testsJest.startAndWatch(debug, args.trim());
    } else {
      await proj.__testsJest.start(debug, args.trim());
    }
    if (!watch) {
      this._exit();
    }
  }
}

export default {
  $Test: Helpers.CLIWRAP($Test, '$Test'),
};
