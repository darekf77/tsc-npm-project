import * as _ from 'lodash';
import * as $ from 'jquery';
import { Morphi } from 'morphi';
import { database, host } from './config';
import { USER } from './USER';
import { UserController } from './UserController';
//#region @backend
import { DBWatcher } from './DBWatcher.backend';
//#endregion

const controllers: Morphi.Base.Controller<any>[] = [UserController as any];
const entities: Morphi.Base.Entity<any>[] = [USER as any];

const start = async () => {

  //#region @backend
  const config = {
    type: 'sqlite',
    database,
    synchronize: true,
    dropSchema: true,
    logging: false
  } as any;
  //#endregion

  const connection = await Morphi.init({
    host,
    controllers,
    entities,
    //#region @backend
    config
    //#endregion
  });

  // @LAST
  if (Morphi.IsBrowser) {
    document.body.innerHTML = `<div id="app" ></div>`;
    const appDiv: HTMLElement = document.getElementById('app');

    const updateView = (users: USER[]) => {
      appDiv.innerHTML = `
      <h1>TypeScript Starter</h1>

      <button id="subscribe"> subscribe </button>
      <button id="unsubsubscribe"> unsubsubscribe </button>
      <br>
      ${users ? JSON.stringify(users) : ' - '}
      `;
    }

    const usersFromDb = await USER.getUsers();
    const [first, second] = usersFromDb;
    first.subscribeRealtimeUpdates({
      callback: (r) => {
        console.log(`realtime update for first user ${first.id}, ${first.name}`, r);
        _.merge(first, r.body.json);
        updateView(usersFromDb)
      }
    });
    second.subscribeRealtimeUpdates({
      callback: (r) => {
        console.log(`realtime update for second user ${second.id}, ${second.name}`, r);
        _.merge(second, r.body.json);
        updateView(usersFromDb)
      }
    });
    updateView(usersFromDb);

    $('#subscribe').click(e => {
      console.log('sub')
    })
    $('#unsubsubscribe').click(e => {
      console.log('unsub')
    })
  }

  if (Morphi.IsNode) {
    //#region @backend
    const w = new DBWatcher(connection);
    await w.asyncAction()
    await w.startAndWatch();
    //#endregion
  }

}


if (Morphi.IsBrowser) {
  start();
}

export default function () {
  return start();
}

