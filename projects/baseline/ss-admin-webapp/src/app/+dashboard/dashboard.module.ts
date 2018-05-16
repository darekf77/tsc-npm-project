
import { NgModule } from '@angular/core';
import { StaticColumnsModule } from "static-columns";
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
//
import { MatCardModule } from "@angular/material/card";
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
// local
import { DashboardComponent } from './dashboard.component';
import { routes } from "./dashboard.routes";
import { CategoryController } from "ss-common-logic/browser/controllers/CategoryController";
import { TabsModule } from 'ngx-bootstrap/tabs';
import { LoginModule } from '../login/login.module';
import { LayoutMaterialModule } from "ss-common-ui/module/layouts";
import { MultimediaUploadModule } from '../shared/multimedia-upload/multimedia-upload.module';

const modules = [
  LayoutMaterialModule,
  MatMenuModule,
  MatIconModule,
  MultimediaUploadModule
]

@NgModule({
  imports: [
    StaticColumnsModule,
    RouterModule.forChild(routes),
    CommonModule,
    LoginModule,
    TabsModule.forRoot(),
    MatCardModule,
    ...modules
  ],
  exports: [
    ...modules
  ],
  declarations: [DashboardComponent],
  providers: [CategoryController],
})
export class DashboardModule { }
