import { Subscription } from 'rxjs/Subscription';
import { OnDestroy, OnInit, Component, Input } from '@angular/core';
import { NavigationEnd, Router } from "@angular/router";


@Component({
  selector: 'app-base-component-meta'
})
export abstract class BaseComponent implements OnDestroy {

  @Input() model: any = {};

  handlers: Subscription[] = [];

  ngOnDestroy(): void {
    this.handlers.forEach(h => h.unsubscribe());
    this.handlers.length = 0;
  }


}


export abstract class BaseComponentForRouter extends BaseComponent {

  constructor(
    private __router: Router
  ) {
    super();
  }


  reloadNgOninitOnUrlChange() {
    this.handlers.push(this.__router.events.subscribe(event => {
      if (event instanceof NavigationEnd && this['ngOnInit']) {
        this['ngOnInit']();
      }
    }));
  }

}
