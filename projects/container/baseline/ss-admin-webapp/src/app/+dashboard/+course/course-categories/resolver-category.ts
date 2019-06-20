import { Injectable } from '@angular/core';
import {
  Routes, RouterModule, ActivatedRouteSnapshot, RouterStateSnapshot, Resolve
} from '@angular/router';

import { McBreadcrumbsResolver, IBreadcrumb } from 'ngx-breadcrumbs';
import { CATEGORY } from 'ss-common-logic/browser-for-ss-admin-webapp/apps/category/CATEGORY';
import {CategoryController} from 'ss-common-logic/browser-for-ss-admin-webapp/apps/category/CategoryController';
import { AuthController } from 'ss-common-logic/browser-for-ss-admin-webapp/apps/auth/AuthController';
import { SESSION } from 'ss-common-logic/browser-for-ss-admin-webapp/apps/auth/SESSION';

@Injectable()
export class CategoryResolver implements Resolve<CATEGORY> {

  constructor(
    private categoryCRUD: CategoryController,
    private auth: AuthController

  ) {

  }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return new Promise<CATEGORY>(async (resolve, reject) => {
      this.auth.browser.init(false)
      const id = Number(route.paramMap.get('id'))
      const cat = await this.categoryCRUD.getBy(id).received;
      resolve(cat.body.json)
    });
  }
}
