import { Component, OnInit } from '@angular/core';
import { AuthController } from 'ss-common-logic/browser/controllers/core/AuthController';
import { Router } from '@angular/router';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {

  constructor(public auth: AuthController, public router: Router) {

  }

  ngOnInit() {
    this.auth.isLoggedIn.subscribe(login => {
      if (!login) {
        this.router.navigateByUrl('/')
      }
    })
  }

}
