//#region @backend
import { Ora } from 'ora';
//#endregion
import { Models } from 'tnp-models';



declare global {
  namespace NodeJS {
    interface Global {
      /**
       * Check whether am running tnp from:
       *  - system command line
       *  - I am calling Tnp from require/imports in some ts files
       */
      globalSystemToolMode: boolean;
      premiumMode?: boolean;
      /**
       * Occasioonal mute of all messages
       */
      muteMessages: boolean;
      testMode: boolean;
      hideWarnings: boolean;
      hideInfos: boolean;
      /**
       * default true
       *
       * You can turn if of with "-verbose" paramter
       */
      hideLog: boolean;
      codePurposeBrowser: boolean;
      /**
       * This prevent circular dependency install in container
       * when showing deps in other projects
       */
      actionShowingDepsForContainer?: boolean;
      tnpShowProgress?: boolean;
      /**
       * Application will automaticly choose parameters
       * usefull for calling in global tool mode
       * when vscode plugin is running
       */
      tnpNonInteractive?: boolean;
      //#region @backend
      tnpNoColorsMode?: boolean;
      spinner: Ora;
      //#endregion

    }
  }
}
