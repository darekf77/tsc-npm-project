import * as path from 'path';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as _ from 'lodash';
import chalk from 'chalk';
import * as TerminalProgressBar from 'progress';

import { Project } from '../../abstract';
import { Models } from '../../../models';
import { Helpers } from '../../../helpers';
import { config } from '../../../config';
import { FeatureForProject } from '../../abstract';

export function dedupePackages(projectLocation: string, packages?: string[], countOnly = false) {
  const packagesNames = (_.isArray(packages) && packages.length > 0) ? packages :
    Project.Tnp.packageJson.data.tnp.core.dependencies.dedupe;
  // console.log('Project.Tnp.packageJson.data.tnp.core.dependencies.dedupe;',Project.Tnp.packageJson.data.tnp.core.dependencies.dedupe)
  // console.log('packages to dedupe', packagesNames)
  // process.exit(0)
  packagesNames.forEach(f => {
    let organizationProjectSeondPart = '';
    if (f.search('/') !== -1) {
      organizationProjectSeondPart = f.split('/')[1];
      f = _.first(f.split('/'));
    }
    let pathToCurrent = path.join(projectLocation, config.folder.node_modules, f, organizationProjectSeondPart);

    const current = Project.From(pathToCurrent);

    if (!current) {
      Helpers.warn(`Project with name ${f} not founded`);
      return
    }
    Helpers.log(`Scanning for duplicates of current ${current.name}@${current.version} ....\n`)
    const nodeMod = path.join(projectLocation, config.folder.node_modules);
    if (!fse.existsSync(nodeMod)) {
      Helpers.mkdirp(nodeMod);
    }
    const removeCommand = `find ${config.folder.node_modules}/ -name ${f.replace('@', '\\@')} `;
    // console.log(`removeCommand: ${removeCommand}`)
    const res = Helpers.run(removeCommand, { output: false, cwd: projectLocation }).sync().toString()
    const duplicates = res
      .split('\n')
      .map(l => l.replace(/\/\//g, '/'))
      .filter(l => !!l)
      .filter(l => !l.startsWith(`${config.folder.node_modules}/${f}`))
      .filter(l => !l.startsWith(`${config.folder.node_modules}/${config.folder._bin}`))
      .filter(l => path.basename(path.dirname(l)) === config.folder.node_modules)
    // console.log(duplicates);
    // process.exit(0)
    if (countOnly) {
      duplicates.forEach((duplicateRelativePath, i) => {
        let p = path.join(projectLocation, duplicateRelativePath, organizationProjectSeondPart);
        const nproj = Project.From(p);
        if (!nproj) {
          // Helpers.warn(`Not able to identyfy project in ${p}`)
        } else {
          p = p.replace(path.join(projectLocation, config.folder.node_modules), '');
          Helpers.log(`${i + 1}. Duplicate "${nproj.name}@${nproj.version}" in:\n\t ${chalk.bold(p)}\n`);
        }
      });
      if (duplicates.length === 0) {
        Helpers.log(`No dupicate of ${current.name} fouded.`);
      }
    } else {
      duplicates.forEach(duplicateRelativePath => {
        const p = path.join(projectLocation, duplicateRelativePath)
        Helpers.remove(p, true)
        Helpers.info(`Duplicate of ${current.name} removed from ${p.replace(projectLocation, '')}`)
      });
    }

  });
}

export function nodeModulesExists(project: Project) {
  if (project.isWorkspace || project.isStandaloneProject) {
    const p = path.join(project.location, config.folder.node_modules, '.bin');
    return fse.existsSync(p);
  }
  if (project.isWorkspaceChildProject) {
    if (project.parent.node_modules.exist) {
      project.parent.node_modules.linkToProject(project);
      return true;
    }
  }
  const p = path.join(project.location, config.folder.node_modules);
  return fse.existsSync(p);
}

export function addDependenceis(project: Project, context: string, allNamesBefore: string[] = []) {
  let newNames = []
  if (!allNamesBefore.includes(project.name)) {
    newNames.push(project.name)
  }

  Models.npm.ArrNpmDependencyType.forEach(depName => {
    newNames = newNames.concat(project.getDepsAsProject(depName, context)
      .filter(d => !allNamesBefore.includes(d.name))
      .map(d => d.name))
  });


  const uniq = {};
  newNames.forEach(name => uniq[name] = name)
  newNames = Object.keys(uniq)


  const projects = newNames
    .map(name => {
      return Project.From(path.join(context, config.folder.node_modules, name))
    })
    .filter(f => !!f);

  // console.log('projects', projects.length)
  allNamesBefore = allNamesBefore.concat(newNames);

  projects.forEach(dep => {
    allNamesBefore = addDependenceis(dep, context, allNamesBefore)
  });

  return allNamesBefore;
}
