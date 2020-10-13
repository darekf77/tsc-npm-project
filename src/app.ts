import 'core-js/proposals/reflect-metadata';
import 'core-js/es';
//#region isomorphic imports
import { Morphi } from 'morphi';
import { DraggablePopupComponent, DraggablePopupModule } from 'tnp-ui';
import { Log, Logger } from 'ng2-logger';
const log = Log.create(`app`);
//#endregion

//#region browser imports

if (Morphi.isBrowser) {
  require('zone.js/dist/zone');
  require('@angular/material/prebuilt-themes/indigo-pink.css');
}
//#endregion

//#region angular
import { Component, NgModule, ApplicationRef } from '@angular/core';
import { enableProdMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { MatCardModule } from '@angular/material/card';
// import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
//#endregion

//#region local imports
import { PROCESS, ProcessModule, ProcessController } from './apps/process';
import { PROJECT, ProjectModule, ProjectController } from './apps/project';
//#endregion


const controllers = [
  ProjectController,
  ProcessController
];

const host = 'http://localhost:3333';

@Component({
  selector: 'my-app', // <my-app></my-app>
  template: `
  <h1> Hello from component! </h1>
  <mat-card>Simple card</mat-card>
  <mat-card>
  <mat-card-title>
  Processes
  </mat-card-title>
  <mat-card-subtitle  *ngIf="!processes">
    ...loading
  </mat-card-subtitle>
  <mat-card-content>

  <ng-template #popupContent>
  Hello content
  </ng-template>

  <app-draggable-popup [title]="'awesome'" id="test" [popupContent]="popupContent" ></app-draggable-popup>
  processes preview
  <div *ngFor="let p of processes" >
    <app-process-logger [model]="p"></app-process-logger>
  </div>

  </mat-card-content>

  </mat-card>
  `,
})
export class AppComponent {


  processes: PROCESS[];
  async ngOnInit() {
    console.log('hell on init');
    const processes = await PROCESS.getAll();
    console.log(processes);
    this.processes = processes;
  }
}

//#region angular module
@NgModule({
  imports: [
    BrowserModule,
    HttpModule,
    BrowserAnimationsModule,
    FormsModule,
    ...[
      MatCardModule,
    ],
    ProjectModule,
    ProcessModule,
    DraggablePopupModule,
  ],
  declarations: [
    AppComponent,
  ],
  providers: [
    ...controllers
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }

// depending on the env mode, enable prod mode or add debugging modules
// if (ENV.isBUild === 'build') {
//   enableProdMode();
// }

export function main() {
  return platformBrowserDynamic().bootstrapModule(AppModule);
}

//#endregion


async function start() {
  console.log('hello')

  //#region @backend
  const config = {
    type: "sqlite",
    database: 'tmp-db.sqlite',
    synchronize: true,
    dropSchema: true,
    logging: false
  };
  //#endregion

  const context = await Morphi.init({
    host,
    controllers,
    entities: [
      PROJECT, PROCESS
    ],
    //#region @backend
    config: config as any
    //#endregion
  });
  console.log(context);

  if (Morphi.isBrowser) {

    const head: HTMLElement = document.getElementsByTagName('head')[0];
    head.innerHTML = head.innerHTML +
      `<link href="https://fonts.googleapis.com/icon?family=Material+Icons&display=block" rel="stylesheet">`
    const body: HTMLElement = document.getElementsByTagName('body')[0];
    body.innerHTML = `
    <style>

    [mat-dialog-title] {
      margin: -24px -24px 0px -24px !important;
      padding: 10px 24px;
      background: #369;
      color: #fff;
      cursor: move;
    }

    </style>
    <my-app>Loading...</my-app>`;
    if (document.readyState === 'complete') {
      main();
    } else {
      document.addEventListener('DOMContentLoaded', main);
    }
  }
}

if (Morphi.isBrowser) {
  start();
}

export default start;
