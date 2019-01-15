//#region @backend
import * as _ from 'lodash';
import { Project } from '../project/base-project';
import { SystemService } from './system-service';
import { Range } from '../helpers';

export type PortIdType = number | number[] | Range;

export class PortsSet {

  private ports: PortInstance[];
  constructor(ports: PortInstance[], private saveCallback: (ports: PortInstance[]) => void) {
    this.ports = _.cloneDeep(ports).map(c => _.merge(new PortInstance(), c));
  }


  private join(instace1: PortInstance, instace2: PortInstance) {

  }

  firstFreeAndSave(howManyPorts = 1): PortInstance[] {

    return []
  }


  addAndSave(port: PortInstance): PortInstance[] {
    return []
  }

}

export class PortInstance {

  constructor(
    public id?: PortIdType,
    public reservedFor?: Project | SystemService) {

  }

  get isFree() {
    return !this.reservedFor;
  }



  /**
   * [1] => 1
   * [1,2,3,4,5] => 0..5
   * [1..1] => 1
   */
  refactor() {

  }

  includes(anotherInstance: PortInstance) {
    const anotherId = anotherInstance.id;

    // simple types
    if (_.isNumber(this.id) && _.isNumber(anotherId)) {
      return this.id === anotherId;
    }

    if (_.isArray(this.id) && _.isArray(anotherId)) {
      return anotherId.filter(another => {
        return (this.id as number[]).includes(another);
      }).length > 0;
    }

    if (_.isObject(this.id) && !_.isArray(this.id) &&
      _.isObject(anotherId) && !_.isArray(anotherId)) {
      const idRange = this.id as Range;
      const anotherIdRange = anotherId as Range;
      return idRange.contains(anotherIdRange);
    }

    // mixed types
    if (_.isNumber(this.id) && _.isArray(anotherId)) {
      return anotherId.includes(this.id);
    }

    if (_.isNumber(this.id) && _.isObject(anotherId)) {
      return (anotherId as Range).contains(this.id);
    }

    if (_.isArray(this.id) && _.isNumber(anotherId)) {
      return this.id.includes(anotherId)
    }

    if (_.isArray(this.id) && _.isObject(anotherId) && !_.isArray(anotherId)) {
      return this.id.filter(num => (anotherId as Range).contains(num))
        .length === this.id.length;
    }

    if (_.isObject(this.id) && !_.isArray(this.id) && _.isNumber(anotherId)) {
      return (this.id as Range).contains(anotherId)
    }

    if (_.isObject(this.id) && !_.isArray(this.id) && _.isArray(anotherId)) {
      return (anotherId as number[]).filter(num => (this.id as Range).contains(num))
        .length === (anotherId as number[]).length;
    }
    // console.warn('Port instacne unknow types')
    return false;
  }


}
//#endregion
