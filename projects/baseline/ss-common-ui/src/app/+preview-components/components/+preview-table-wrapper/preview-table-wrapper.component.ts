import { Component, OnInit } from '@angular/core';
import { ExamplesPaginationController } from 'ss-common-logic/browser-for-ss-common-ui/controllers/ExamplesPaginationController';
import { EXAMPLE_PAGINATION } from 'ss-common-logic/browser-for-ss-common-ui/entities/EXAMPLE_PAGINATION';

@Component({
  selector: 'app-preview-table-wrapper',
  templateUrl: './preview-table-wrapper.component.html',
  styleUrls: ['./preview-table-wrapper.component.scss']
})
export class PreviewTableWrapperComponent implements OnInit {

  constructor(public exampleService: ExamplesPaginationController) {

  }

  ngOnInit() {

  }

}
