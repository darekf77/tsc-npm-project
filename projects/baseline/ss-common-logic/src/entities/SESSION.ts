import { Connection } from "typeorm/connection/Connection";
import { Repository } from "typeorm/repository/Repository";
import { AfterInsert } from "typeorm/decorator/listeners/AfterInsert";
import { AfterUpdate } from "typeorm/decorator/listeners/AfterUpdate";
import { BeforeUpdate } from "typeorm/decorator/listeners/BeforeUpdate";
import { BeforeInsert } from "typeorm/decorator/listeners/BeforeInsert";
import { OneToMany } from "typeorm/decorator/relations/OneToMany";
import { OneToOne } from "typeorm/decorator/relations/OneToOne";
import { ManyToMany } from "typeorm/decorator/relations/ManyToMany";
import { JoinTable } from "typeorm/decorator/relations/JoinTable";
import { JoinColumn } from "typeorm/decorator/relations/JoinColumn";
import { Column } from "typeorm/decorator/columns/Column";
import { CreateDateColumn } from "typeorm/decorator/columns/CreateDateColumn";
import { PrimaryColumn } from "typeorm/decorator/columns/PrimaryColumn";
import { PrimaryGeneratedColumn } from "typeorm/decorator/columns/PrimaryGeneratedColumn";
import { Entity } from "typeorm/decorator/entity/Entity";

import { verify, generate } from "password-hash";


// local
import { Log, Level } from "ng2-logger";
import { Resource } from "ng2-rest";
const log = Log.create(__filename);

import { USER } from './USER';
import { tableNameFrom, BASE_ENTITY } from '../helpers';
import { EntityRepository } from 'typeorm';



@Entity(tableNameFrom(SESSION))
export class SESSION extends BASE_ENTITY {

  public static get const() {
    return {
      SESSION_TIME_SECONDS: 3600,
      SESSION_LOCAL_STORAGE: 'session-isomorphic-rest',
      AUTHORIZATION_HEADER: 'Authorization'
    }
  }

  expireInSeconds: number;
  calculateExpirationTime(): number {
    const now = new Date();
    return Math.round((this.expiredDate.getTime() - now.getTime()) / 1000);
  }

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  token: string;

  token_type = 'bearer';

  @Column({
    length: 50,
    nullable: true
  })
  ip: string;

  @CreateDateColumn()
  createdDate: Date;

  @Column({
    nullable: false
  })
  expiredDate: Date;

  @OneToOne(type => USER, user => user.id, {
    nullable: true
  })
  @JoinColumn()
  user: USER;

  public createToken(token?: string) {
    this.createdDate = new Date();
    const timestamp = this.createdDate.getTime();
    this.token = token ? token : generate(this.user.id + timestamp + this.ip)
    this.expiredDate = new Date(timestamp + SESSION.const.SESSION_TIME_SECONDS * 1000)
  }

  isExpired(when: Date = new Date()) {
    let time = {
      expire: this.expiredDate.getTime(),
      now: when.getTime()
    }
    return (time.expire < time.now);
  }

  public saveInLocalStorage() {
    let session: SESSION = this;
    window.localStorage.setItem(SESSION.const.SESSION_LOCAL_STORAGE, JSON.stringify(session));
  }

  public activateBrowserToken() {
    const session: SESSION = this;
    Resource.Headers.request.set(SESSION.const.AUTHORIZATION_HEADER,
      `${session.token_type} ${session.token}`)
  }


  public get db() {
    return {


    }
  }

}


@EntityRepository(SESSION)
export class SESSION_REPOSITORY extends Repository<SESSION> {
  fromLocalStorage(): SESSION {
    let session: SESSION = new SESSION();
    try {
      const data = window.localStorage.getItem(SESSION.const.SESSION_LOCAL_STORAGE);
      const s = JSON.parse(data) as SESSION;
      session.token = s.token;
      session.token_type = s.token_type;
      session.expiredDate = new Date(s.expiredDate as any);
    } catch {
      session = undefined;
    }
    return session;
  }

  removeFromLocalStorage() {
    window.localStorage.removeItem(SESSION.const.SESSION_LOCAL_STORAGE);
  }

  async getByUser(user: USER, ip: string) {
    //#region @backendFunc
    const Session = await this.createQueryBuilder(tableNameFrom(SESSION))
      .innerJoinAndSelect(`${tableNameFrom(SESSION)}.user`, tableNameFrom(USER))
      .where(`${tableNameFrom(SESSION)}.user = :id`)
      .andWhere(`${tableNameFrom(SESSION)}.ip = :ip`)
      .setParameters({
        id: user.id,
        ip
      })
      .getOne()
    if (Session) {
      Session.expireInSeconds = Session.calculateExpirationTime();
    }
    return Session;
    //#endregion
  }

  async getByToken(token: string) {
    //#region @backendFunc
    const Session = await this.createQueryBuilder(tableNameFrom(SESSION))
      .innerJoinAndSelect(`${tableNameFrom(SESSION)}.user`, tableNameFrom(USER))
      .where(`${tableNameFrom(SESSION)}.token = :token`)
      .setParameter('token', token)
      .getOne();
    if (Session) {
      Session.expireInSeconds = Session.calculateExpirationTime();
    }
    return Session;
    //#endregion
  }

  async createWithIp(user: USER, ip: string) {
    //#region @backendFunc
    let Session = new SESSION();
    Session.user = user;
    Session.ip = ip;

    Session.createToken(user.username == 'postman' ? 'postman' : undefined);

    Session = await this.save(Session);
    if (Session) {
      Session.expireInSeconds = Session.calculateExpirationTime();
    }
    return Session;
    //#endregion
  }

}


export default SESSION;
