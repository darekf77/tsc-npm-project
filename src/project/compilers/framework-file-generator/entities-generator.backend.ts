import * as fse from 'fs-extra';
import * as path from 'path';
import * as JSON5 from 'json5';
import * as glob from 'glob';
import * as rimraf from 'rimraf';

import { Helpers } from '../../../index';
import { Project, FeatureCompilerForProject } from '../../abstract';
import { IncCompiler } from 'incremental-compiler';
import { config } from '../../../config';
import { optionsFrameworkFileGen } from './framework-files-generator.backend';


export class EntitesGenerator extends FeatureCompilerForProject {
  constructor(public project: Project) {
    super(project, optionsFrameworkFileGen(project));
  }

  private entityRepo(srcPath, entity, entityRelativePath, hideDot = false) {
    let repo = `${entityRelativePath.replace('entities', 'repositories')}_REPOSITORY.ts`
    return fse.existsSync(path.join(srcPath, repo)) ? ` ${hideDot ? '' : ','} ${entity}_REPOSITORY` : '';
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

  protected generateEntityTs() {
    const isSite = false;
    const cwd = isSite ? path.join(this.project.location, config.folder.custom, config.folder.src)
      : path.join(this.project.location, config.folder.src);

    if (!fse.existsSync(cwd)) {
      Helpers.log(`Entites not geenrated, folder doesnt exists: ${cwd}`);
      return;
    }

    let entitesFiles = Helpers.morphi.getEntites(cwd);

    if (isSite) {
      entitesFiles = entitesFiles.filter(f => {
        const baselineFile = path.join(this.project.baseline.location, config.folder.src, f);
        return !fse.existsSync(baselineFile)
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
    const currentFile = Helpers.readFile(entitesFilePath)

    if (currentFile !== newEntitesFile) {
      Helpers.writeFile(entitesFilePath, newEntitesFile)
    }
  }


  private repositoriesTemplateExportImport(srcPath, entityRelativePath) {
    let entity = path.basename(entityRelativePath).toUpperCase()
    let repository = `${entityRelativePath.replace('entities', 'repositories')}_REPOSITORY`
    let repoExist = this.entityRepo(srcPath, entity, entityRelativePath, true);
    return fse.existsSync(path.join(srcPath, `${repository}.ts`)) ? `
    import { ${repoExist} } from '${repository}';
    export { ${repoExist} } from '${repository}';` : ''
  }


  private entitesTemplateDB(srcPath, entityRelativePath) {
    let entity = path.basename(entityRelativePath).toUpperCase()
    let repoExist = this.entityRepo(srcPath, entity, entityRelativePath);
    return `
    ${entity}: Morphi.Orm.RepositoryFrom<${entity}${repoExist}>(connection as any, ${entity}${repoExist}),`
  }

}
