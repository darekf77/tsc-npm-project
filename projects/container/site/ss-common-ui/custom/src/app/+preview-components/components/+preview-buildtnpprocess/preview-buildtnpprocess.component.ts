import { Component, OnInit } from '@angular/core';

import { Observable } from 'rxjs/Observable';
import { Log } from 'ng2-logger/browser';

const log = Log.create('privew build tnp ');
import { PROJECT } from 'ss-common-logic/browser-for-ss-common-ui/apps/project/PROJECT';
import { ProjectController } from 'ss-common-logic/browser-for-ss-common-ui/apps/project/ProjectController';

@Component({
  selector: 'app-preview-buildtnpprocess',
  templateUrl: './preview-buildtnpprocess.component.html',
  styleUrls: ['./preview-buildtnpprocess.component.scss']
})
export class PreviewBuildtnpprocessComponent implements OnInit {


  constructor(
    private ProjectController: ProjectController,

  ) { }

  models = [];

  async ngOnInit() {



    const projects = await PROJECT.getAll();

    this.models = projects.filter(p => p.name === 'container');
    log.i('projects', projects);

  }

}
