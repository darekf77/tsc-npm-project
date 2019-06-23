//#region @backend
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as path from 'path';
import * as JSON5 from 'json5';
import * as glob from 'glob';
import * as rimraf from 'rimraf';

import { Project } from '../abstract';
import { config } from '../../config';
import { getEntites, getControllers, log } from '../../helpers';
import { FeatureCompilerForProject } from '../abstract';


export class FrameworkFilesGenerator extends FeatureCompilerForProject {
  syncAction(): void {
    if (this.project.type === 'isomorphic-lib' && !this.project.isStandaloneProject) {
      this.generateEntityTs()
      this.generateControllersTs()
    }
  }
  preAsyncAction(): void {
    // throw new Error("Method not implemented.");
  }
  asyncAction(filePath: string) {
    // console.log('async action framework file gen ', filePath)
    this.syncAction()
    // console.log('asynlog action ended for generator')
  }

  constructor(public project: Project) {
    super(`(src|components)/**/*.ts`, '', project && project.location, project);
  }


  private generateEntityTs() {
    const isSite = this.project.isSite;
    const cwd = isSite ? path.join(this.project.location, config.folder.custom, config.folder.src)
      : path.join(this.project.location, config.folder.src);

    if (!fse.existsSync(cwd)) {
      log(`Entites not geenrated, folder doesnt exists: ${cwd}`);
      return;
    }

    let entitesFiles = getEntites(cwd);

    if (isSite) {
      entitesFiles = entitesFiles.filter(f => {
        const baselineFile = path.join(this.project.baseline.location, config.folder.src, f);
        return !fs.existsSync(baselineFile)
      })
    }
    entitesFiles = entitesFiles.map(f => `./${f.replace(/\.ts$/, '')}`)


    let newEntitesFile = `
    //// FILE GENERATED BY TNP /////
    import { Morphi } from 'morphi';
    ${isSite ? `
    import { Entities as BaselineEntities }  from '${this.project.parent.baseline.name}/${this.project.baseline.name}/src/entities';
    import * as baslineEntites from '${this.project.parent.baseline.name}/${this.project.baseline.name}/src/entities';
    export * from '${this.project.parent.baseline.name}/${this.project.baseline.name}/src/entities';
    `: ''}

    ${entitesFiles
        .map(f => this.entitesTemplateExportImport(cwd, f))
        .join('\n')}

      export const Entities: Morphi.Base.Entity<any>[] = [
          ${entitesFiles
        .map(f => this.entitesArray(cwd, f))
        .join(',\n')}
        ]${isSite ? '.concat(BaselineEntities as any)' : ''} as any;

      //#${'region'} @backend

      ${entitesFiles
        .map(f => this.repositoriesTemplateExportImport(cwd, f))
        .join('\n')}

      import { Repository } from 'typeorm';
      export { Repository } from 'typeorm';
      import * as _ from 'lodash'

      export function entities<ADDITIONAL={}>(connection?: Morphi.Orm.Connection, decoratorsEntities?: ADDITIONAL) {
        return _.merge(${isSite ? 'baslineEntites.entities(connection),' : ''}{
          ${entitesFiles
        .map(f => this.entitesTemplateDB(cwd, f))
        .join('\n')}
      } ${isSite ? '' : ', decoratorsEntities'} );
      }
      //#end${'region'}
      `.split('\n')
      .map(l => l.trim())
      .join('\n');
    ;


    const entitesFilePath = path.join(cwd, 'entities.ts');
    const currentFile = fse.existsSync(entitesFilePath) ?
      fse.readFileSync(entitesFilePath, 'utf8').toString() : ''

    if (currentFile !== newEntitesFile) {
      fse.writeFileSync(entitesFilePath, newEntitesFile, 'utf8')
    }
  }

  private generateControllersTs() {
    const isSite = this.project.isSite;
    const cwd = isSite ? path.join(this.project.location, config.folder.custom, config.folder.src)
      : path.join(this.project.location, config.folder.src);

    if (!fse.existsSync(cwd)) {
      log(`Controllers not geenrated, folder doesnt exists: ${cwd}`);
      return;
    }

    let controllersFiles = getControllers(cwd);

    if (isSite) {
      controllersFiles = controllersFiles.filter(f => {
        const baselineFile = path.join(this.project.baseline.location, config.folder.src, f);
        return !fs.existsSync(baselineFile)
      })
    }

    // controllersFiles = controllersFiles.filter(f => {
    //   const fileAbsolutePatg = path.join(this.project.location, config.folder.src, f);
    //   return !fs.existsSync(baselineFile)
    // })

    controllersFiles = controllersFiles.map(f => `./${f.replace(/\.ts$/, '')}`)


    let newControllerFile = `
    //// FILE GENERATED BY TNP /////
    import { Morphi } from 'morphi';
    ${isSite ? `
    import { Controllers as BaselineControllers }  from '${this.project.parent.baseline.name}/${this.project.baseline.name}/src/controllers';
    import * as controllersBaseline from '${this.project.parent.baseline.name}/${this.project.baseline.name}/src/controllers';
    export * from '${this.project.parent.baseline.name}/${this.project.baseline.name}/src/controllers';
    `: ''}

    ${controllersFiles
        .map(f => this.controllersTemplateExportImport(cwd, f))
        .join('\n')}

      export const Controllers: Morphi.Base.Controller<any>[] = [
        ${controllersFiles
        .map(f => this.controllersArray(cwd, f))
        .join(',\n')}
      ]${isSite ? '.concat(BaselineControllers as any)' : ''} as any;

      //#${'region'} @backend

      import { Helpers } from 'morphi';
      import * as _ from 'lodash'

      export function controllers<ADDITIONAL={}>(decoratorsControllers?: ADDITIONAL) {
        return _.merge(${isSite ? 'controllersBaseline.controllers(),' : ''} {
          ${controllersFiles
        .map(f => this.controllersTemplateSingleton(cwd, f))
        .join('\n')}
      } ${isSite ? '' : ', decoratorsControllers'} );
      }
      //#end${'region'}
      `.split('\n')
      .map(l => l.trim())
      .join('\n');
    ;

    const controllerFilePath = path.join(cwd, 'controllers.ts');
    const currentFile = fse.existsSync(controllerFilePath) ?
      fse.readFileSync(controllerFilePath, 'utf8').toString() : ''

    if (currentFile !== newControllerFile) {
      fse.writeFileSync(controllerFilePath, newControllerFile, 'utf8')
    }
  }

  private entityRepo(srcPath, entity, entityRelativePath, hideDot = false) {
    let repo = `${entityRelativePath.replace('entities', 'repositories')}_REPOSITORY.ts`
    return fs.existsSync(path.join(srcPath, repo)) ? ` ${hideDot ? '' : ','} ${entity}_REPOSITORY` : '';
  }

  private entitesTemplateExportImport(srcPath, entityRelativePath) {
    let entity = path.basename(entityRelativePath).toUpperCase()
    return `
    import { ${entity}, I${entity} } from '${entityRelativePath}';
    export { ${entity}, I${entity} } from '${entityRelativePath}';`
  }

  private entitesArray(srcPath, entityRelativePath) {
    let entity = path.basename(entityRelativePath);
    return entity
  }

  private repositoriesTemplateExportImport(srcPath, entityRelativePath) {
    let entity = path.basename(entityRelativePath).toUpperCase()
    let repository = `${entityRelativePath.replace('entities', 'repositories')}_REPOSITORY`
    let repoExist = this.entityRepo(srcPath, entity, entityRelativePath, true);
    return fs.existsSync(path.join(srcPath, `${repository}.ts`)) ? `
    import { ${repoExist} } from '${repository}';
    export { ${repoExist} } from '${repository}';` : ''
  }

  private controllersTemplateExportImport(srcPath, controllerRelativePath) {
    let controller = path.basename(controllerRelativePath);
    return `
    import { ${controller} } from '${controllerRelativePath}';
    export { ${controller} } from '${controllerRelativePath}';`
  }

  private controllersArray(srcPath, controllerRelativePath) {
    let controller = path.basename(controllerRelativePath);
    return controller
  }



  private entitesTemplateDB(srcPath, entityRelativePath) {
    let entity = path.basename(entityRelativePath).toUpperCase()
    let repoExist = this.entityRepo(srcPath, entity, entityRelativePath);
    return `
    ${entity}: Morphi.Orm.RepositoryFrom<${entity}${repoExist}>(connection, ${entity}${repoExist}),`
  }

  private controllersTemplateSingleton(srcPath, controllerRelativePath) {
    let controller = path.basename(controllerRelativePath);
    return `
    ${controller}: Helpers.getSingleton<${controller}>(${controller}),`
  }

}


//#endregion

