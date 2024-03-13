import { path } from 'tnp-core/src'
import { fse } from 'tnp-core/src'
import { _ } from 'tnp-core/src';
import { CLI } from 'tnp-cli/src';
import { glob } from 'tnp-core/src';

import { Project } from '../../abstract/project/project';
import { Models } from 'tnp-models/src';
import { Helpers } from 'tnp-helpers/src';
import { config } from 'tnp-config/src';

//#region dedupe packages
export function dedupePackages(projectLocation: string, packagesNames?: string[], countOnly = false, warnings = true) {
  Helpers.taskStarted(`${countOnly ? 'Counting' : 'Fixing/removing'} duplicates ${path.basename(projectLocation)}/node_modules`)
  // console.log('(Project.Tnp).packageJson.data.tnp.core.dependencies.dedupe;',(Project.Tnp).packageJson.data.tnp.core.dependencies.dedupe)
  // console.log('packages to dedupe', packagesNames)
  // process.exit(0)

  const rules: { [key: string]: { ommitParents: string[]; onlyFor: string[]; } } = {};

  packagesNames = packagesNames.reduce((a, current, i, arr) => {
    return a.concat([
      ...(Array.isArray(current) ? ((depsArr: string[]) => {
        const first: string = _.first(depsArr);
        depsArr = depsArr.slice(1);
        rules[first] = {
          ommitParents: depsArr
            .filter(f => f.startsWith('\!'))
            .map(f => f.replace(/^\!/, '')),
          onlyFor: depsArr
            .filter(f => !f.startsWith('\!'))
        };
        if (rules[first].onlyFor.length === 0) {
          delete rules[first].onlyFor;
        }
        if (rules[first].ommitParents.length === 0) {
          delete rules[first].ommitParents;
        }

        return [first];
      })(current) : [current])
    ]);
  }, []);

  packagesNames.forEach(f => {
    let organizationProjectSeondPart = '';
    if (f.search('/') !== -1) {
      organizationProjectSeondPart = f.split('/')[1];
      f = _.first(f.split('/'));
    }
    let pathToCurrent = path.join(projectLocation, config.folder.node_modules, f, organizationProjectSeondPart);

    const current = Project.From<Project>(pathToCurrent);

    if (!current) {
      warnings && Helpers.log(`Project with name ${f} not founded`);
      return
    }
    Helpers.logInfo(`Scanning for duplicates of current ${current.name}@${current.version} ....\n`)
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
        const nproj = Project.From<Project>(p);
        if (!nproj) {
          // Helpers.warn(`Not able to identyfy project in ${p}`)
        } else {
          p = p.replace(path.join(projectLocation, config.folder.node_modules), '');
          Helpers.info(`${i + 1}. Duplicate "${nproj.name}@${nproj.version}" in:\n\t ${CLI.chalk.bold(p)}\n`);
        }
      });
      if (duplicates.length === 0) {
        Helpers.logInfo(`No dupicate of ${current.name} fouded.`);
      }
    } else {
      duplicates.forEach(duplicateRelativePath => {
        const p = path.join(projectLocation, duplicateRelativePath);
        const projRem = Project.From<Project>(p);
        const versionRem = projRem && projRem.version;

        let parentName = path.basename(
          path.dirname(p)
            .replace(new RegExp(`${Helpers.escapeStringForRegEx(config.folder.node_modules)}\/?$`), '')
            .replace(/\/$/, '')
        );

        const org = path.basename(path.dirname(path.dirname(path.dirname(p))));
        if (org.startsWith('\@') || org.startsWith('@')) {
          parentName = `${org}/${parentName}`
        }

        const parentLabel = parentName ? `${parentName}/` : ''; // TODO not working !

        if (rules[current.name]) {
          const r = rules[current.name];
          if (_.isArray(r.ommitParents) && (r.ommitParents.includes(parentName)
            || _.isObject(r.ommitParents.find(o => o.startsWith(parentName.replace('*', '')))))) {
            Helpers.logWarn(`[excluded] Ommiting duplicate of `
              + `${parentLabel}${current.name}@${versionRem} inside ${CLI.chalk.bold(parentName)}`)
            return
          }
          if (_.isArray(r.onlyFor) && !r.onlyFor.includes(parentName)) {
            Helpers.logWarn(`[not included] Ommiting duplicate of `
              + `${parentLabel}${current.name}@${versionRem} inside ${CLI.chalk.bold(parentName)}`)
            return
          }
        }

        Helpers.remove(p, true)
        Helpers.logWarn(`Duplicate of ${parentLabel}${current.name}@${versionRem}`
          + ` removed from ${CLI.chalk.bold(parentName)}`)
      });
    }

  });

  Helpers.taskDone(`${countOnly ? 'Counting' : 'Fixing/removing'} duplicates from npm container`)
}
//#endregion

//#region node module exists

function nodeMOdulesOK(pathToFolder: string | string[], moreThan = 1) {
  if (_.isArray(pathToFolder)) {
    pathToFolder = path.join(...pathToFolder) as string;
  }
  let res = false;
  Helpers.log(`[node-modules] checking if exists in: ${pathToFolder}`, 1)
  if (Helpers.exists(pathToFolder)) {
    const count = {
      unknowFilesOrUnexitedLInks: 0,
      folders: 0,
      links: 0
    };
    res = !_.isUndefined(fse.readdirSync(pathToFolder)
      .map(f => path.join(pathToFolder as string, f))
      .find(f => {
        if (count.unknowFilesOrUnexitedLInks > moreThan) {
          return true;
        }
        if (count.folders > moreThan) {
          return true;
        }
        if (count.links > moreThan) {
          return true;
        }
        if (Helpers.isExistedSymlink(f)) {
          count.links++;
        } else if (Helpers.isFolder(f)) {
          count.folders++;
        } else {
          count.unknowFilesOrUnexitedLInks++;
        }
        return false;
      })
    );
  }
  Helpers.log(`[node-modules] checking done: ${res}`)
  return res;
}

export function nodeModulesExists(project: Project) {
  if (project.isStandaloneProject) {

    const nodeModulesPath = path.join(project.location, config.folder.node_modules);

    const pathBin = path.join(nodeModulesPath, config.folder._bin);
    const dummyPackages = config.quickFixes.missingLibs.length + 1;
    const fullOfPackages = nodeMOdulesOK(nodeModulesPath, dummyPackages);
    const res = Helpers.exists(pathBin) && fullOfPackages;
    return res;
  }
  const p = path.join(project.location, config.folder.node_modules);
  return fse.existsSync(p);
}

export function nodeModulesHasOnlyLinks(project: Project) {
  const links = Helpers.linksToFolderFrom(project.node_modules.path);
  return links.length > 500; // TODO QUICK_FIX
}

//#endregion

//#region add dependencies
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
      return Project.From<Project>(path.join(context, config.folder.node_modules, name))
    })
    .filter(f => !!f);

  // console.log('projects', projects.length)
  allNamesBefore = allNamesBefore.concat(newNames);

  projects.forEach(dep => {
    allNamesBefore = addDependenceis(dep, context, allNamesBefore)
  });

  return allNamesBefore;
}
//#endregion

//#region stuberize frontend package for backedn
const regexForClassFunctinoInLine = new RegExp(`[a-zA-Z]+\\(`)
const regexForClassStaticFunctinoInLine = new RegExp(`static\ +[a-zA-Z]+\\(`)
const regexForFunctinoInLine = new RegExp(`function [a-zA-Z]+\\(`)
const regexForGenericFunctinoInLine = new RegExp(`function [a-zA-Z]+\\<`)
const regexIsExportedConst = new RegExp(`export\\ +const `)
const specialFunctionEnd = `//<replace>`;
const notAllowedFolderToCopy = [
  'browser',
  'dists',
  'esm5',
  'esm2015',
  'fesm2022',
  'fesm5',
  'fesm2015',
  'fesm2022',
  'dist'
];

function fixPackageJson(pathToPacakgeJson: string, project: Project) {
  const file = Helpers.readJson(pathToPacakgeJson) as Models.npm.IPackageJSON;
  const newFile = _.pick(file, [
    'name',
    'version',
    'tnp',
    'dependencies',
    'devDependencies',
    'license',
    'bin',
  ] as (keyof Models.npm.IPackageJSON)[]);
  newFile.tnp = {
    version: project._frameworkVersion,
    type: 'angular-lib',
  } as any;
  Helpers.writeFile(pathToPacakgeJson, newFile);
}



function createSubVersion(proj: Project, symlinkFolderFromSrcToRcreate: string[]) {
  const projLocation = (proj.location);
  const newStuberizedName = `${path.basename(projLocation)}${config.SUBERIZED_PREFIX}`;
  const newProjStubLocaiton = path.join(
    path.dirname(projLocation),
    newStuberizedName
  );
  const filesAndFolderToCopy = fse
    .readdirSync(projLocation)
    .filter(f => ![
      config.folder.browser,
      config.folder._browser,
    ].includes(f))

  Helpers.removeFolderIfExists(newProjStubLocaiton);
  filesAndFolderToCopy.forEach(fileOrFolderName => {
    const source = path.join(projLocation, fileOrFolderName);
    const dest = path.join(newProjStubLocaiton, fileOrFolderName);
    if (Helpers.isFolder(source)) {
      Helpers.copy(source, dest);
    } else {
      Helpers.copyFile(source, dest);
    }
  });

  symlinkFolderFromSrcToRcreate.forEach(folderLinkName => {
    const source = path.join(newProjStubLocaiton, config.folder.dist, folderLinkName);
    const dest = path.join(newProjStubLocaiton, folderLinkName);
    Helpers.createSymLink(source, dest);
  })

  Helpers.removeExcept(projLocation, [
    config.folder._browser,
    config.folder.browser,
  ]);

  fse.readdirSync(path.join(projLocation, config.folder.browser))
    .forEach(fileOrFolderName => {
      const source = path.join(path.join(projLocation, config.folder.browser, fileOrFolderName));
      const dest = path.join(path.join(projLocation, fileOrFolderName));
      Helpers.removeIfExists(dest);
      if (Helpers.isFolder(source)) {
        Helpers.copy(source, dest);
      } else {
        Helpers.copyFile(source, dest);
      }
    });
  Helpers.removeFolderIfExists(path.join(projLocation, config.folder.browser));
}

//#endregion
