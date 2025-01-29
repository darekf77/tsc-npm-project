//#region imports
import {
  IncrementalWatcherOptions,
  incrementalWatcher,
} from 'incremental-compiler/src';
import { Project } from '../abstract/project';
import type { TaonProjectResolve } from '../abstract/project';
import { config } from 'tnp-config/src';
import {
  chokidar,
  dateformat,
  requiredForDev,
  UtilsProcess,
  UtilsString,
} from 'tnp-core/src';
import {
  crossPlatformPath,
  path,
  _,
  PROGRESS_DATA,
  chalk,
  glob,
  os,
  fse,
  CoreModels,
  Utils,
} from 'tnp-core/src';
import {
  TAGS,
  backendNodejsOnlyFiles,
  extAllowedToExportAndReplaceTSJSCodeFiles,
  frontendFiles,
  notNeededForExportFiles,
} from 'tnp-config/src';
import {
  Helpers,
  BaseGlobalCommandLine,
  UtilsNpm,
  recognizeImportsFromFile,
} from 'tnp-helpers/src';
import { PackagesRecognition } from '../features/package-recognition/packages-recognition';
import { BrowserCodeCut } from '../compilers/build-isomorphic-lib/code-cut/browser-code-cut.backend';
import { CLI } from 'tnp-core/src';
import { Models } from '../../models';
import * as psList from 'ps-list';
import { MagicRenamer } from 'magic-renamer/src';
import * as semver from 'semver';
import { walk } from 'lodash-walk-object/src';
import { createGenerator, SchemaGenerator } from 'ts-json-schema-generator';
import { UtilsTerminal } from 'tnp-core/src';
import { BuildOptions } from '../../options';

declare const ENV: any;
//#endregion

export class $Global extends BaseGlobalCommandLine<{}, Project> {
  readonly ins: TaonProjectResolve;
  public _() {
    Helpers.error('Please select proper command.', false, true);
    this._exit();
  }

  //#region kill process on port
  async killonport() {
    const port = parseInt(this.firstArg);
    await Helpers.killProcessByPort(port);
    this._exit();
  }
  //#endregion

  //#region kill all node processes
  killAllNode() {
    Helpers.killAllNode();
    this._exit();
  }
  //#endregion

  //#region kill vscode processes
  killAllCode() {
    if (process.platform === 'win32') {
      Helpers.run(`taskkill /f /im code.exe`).sync();
      this._exit();
    } else {
      Helpers.run(`fkill -f code`).sync();
    }
    this._exit();
  }
  //#endregion

  //#region fork
  async fork() {
    const argv = this.args;
    const githubUrl = _.first(argv);
    let projectName = _.last(githubUrl.replace('.git', '').split('/'));
    if (argv.length > 1) {
      projectName = argv[1];
    }
    Helpers.info(`Forking ${githubUrl} with name ${projectName}`);
    await this.project.git.clone(githubUrl, projectName);
    let newProj = Project.ins.From(
      path.join(this.project.location, projectName),
    ) as Project;
    Helpers.setValueToJSON(
      path.join(newProj.location, config.file.package_json),
      'name',
      projectName,
    );
    Helpers.setValueToJSON(
      path.join(newProj.location, config.file.package_json),
      'version',
      '0.0.0',
    );
    if (newProj.containsFile('angular.json')) {
      Helpers.setValueToJSON(
        path.join(newProj.location, config.file.package_json),
        'tnp.type',
        'angular-lib',
      );
      Helpers.setValueToJSON(
        path.join(newProj.location, config.file.package_json),
        'tnp.version',
        'v2',
      );
      Helpers.setValueToJSON(
        path.join(newProj.location, config.file.package_json),
        'scripts',
        {},
      );
      // const dependencies = Helpers.readValueFromJson(path.join(newProj.location, config.file.package_json), 'dependencies') as Object;
      await newProj.init('forking project');
      newProj = Project.ins.From(
        path.join(this.project.location, projectName),
      ) as Project;
      newProj.removeFile('.browserslistrc');
    }
    Helpers.writeFile(
      path.join(newProj.location, config.file.README_MD),
      `
  # ${projectName}

  based on ${githubUrl}

    `,
    );
    Helpers.run(`code ${newProj.location}`).sync();
    Helpers.info(`Done`);
    this._exit();
  }
  //#endregion

  //#region watcher linux
  watchersfix() {
    Helpers.run(
      `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`,
    ).sync();
    this._exit();
  }
  watchers() {
    Helpers.run(
      `find /proc/*/fd -user "$USER" -lname anon_inode:inotify -printf '%hinfo/%f\n' 2>/dev/null | xargs cat | grep -c '^inotify'`,
    ).sync();
    this._exit();
  }
  //#endregion

  //#region code instal ext
  code() {
    this.project.run(`code --install-extension ${this.args.join(' ')}`).sync();
    this._exit();
  }
  //#endregion

  //#region proper watcher test
  async PROPERWATCHERTEST(engine: string) {
    const proj = this.project as Project;
    const watchLocation = crossPlatformPath([proj.location, config.folder.src]);
    const symlinkCatalog = crossPlatformPath([proj.location, 'symlinkCatalog']);
    const symlinkCatalogInWatch = crossPlatformPath([watchLocation, 'symlink']);
    const symlinkCatalogFile = crossPlatformPath([
      proj.location,
      'symlinkCatalog',
      'aaa.txt',
    ]);
    const options: IncrementalWatcherOptions = {
      name: `[taon]  properwatchtest (testing only)`,
      ignoreInitial: true,
    };

    Helpers.remove(symlinkCatalog);
    Helpers.writeFile(symlinkCatalogFile, 'hello aaa');
    Helpers.writeFile(
      crossPlatformPath([proj.location, config.folder.src, 'a1', 'aa']),
      'asdasdasdhello aaa',
    );
    Helpers.writeFile(
      crossPlatformPath([proj.location, config.folder.src, 'a2', 'ccc']),
      'heasdasdllo asdasd',
    );
    Helpers.createSymLink(symlinkCatalog, symlinkCatalogInWatch);

    (await incrementalWatcher(watchLocation, options)).on('all', (a, b) => {
      console.log('FIRSTA', a, b);
    });

    (await incrementalWatcher(watchLocation, options)).on('all', (a, b) => {
      console.log('SECOND', a, b);
    });

    (await incrementalWatcher(symlinkCatalog, options)).on('all', (a, b) => {
      console.log('THIRD', a, b);
    });

    console.log('await done');
  }
  //#endregion

  //#region add import src
  /**
   * @deprecated
   */
  ADD_IMPORT_SRC() {
    const project = this.project as Project;

    const regexEnd = /from\s+(\'|\").+(\'|\")/g;
    const singleLineImporrt = /import\((\'|\"|\`).+(\'|\"|\`)\)/g;
    const singleLineRequire = /require\((\'|\"|\`).+(\'|\"|\`)\)/g;
    const srcEnd = /\/src(\'|\"|\`)/;
    const betweenApos = /(\'|\"|\`).+(\'|\"|\`)/g;

    const commentMultilieStart = /^\/\*/;
    const commentSingleLineStart = /^\/\//;

    const processAddSrcAtEnd = (
      regexEnd: RegExp,
      line: string,
      packages: string[],
      matchType: 'from_import_export' | 'imports' | 'require',
    ): string => {
      const matches = line.match(regexEnd);
      const firstMatch = _.first(matches) as string;
      const importMatch = (
        _.first(firstMatch.match(betweenApos)) as string
      ).replace(/(\'|\"|\`)/g, '');
      const isOrg = importMatch.startsWith('@');
      const packageName = importMatch
        .split('/')
        .slice(0, isOrg ? 2 : 1)
        .join('/');
      if (packages.includes(packageName) && !srcEnd.test(firstMatch)) {
        let clean: string;
        if (matchType === 'require' || matchType === 'imports') {
          const endCharacters = firstMatch.slice(-2);
          clean =
            firstMatch.slice(0, firstMatch.length - 2) + '/src' + endCharacters;
        } else {
          let endCharacters = firstMatch.slice(-1);
          clean =
            firstMatch.slice(0, firstMatch.length - 1) + '/src' + endCharacters;
        }

        return line.replace(firstMatch, clean);
      }
      return line;
    };

    const changeImport = (content: string, packages: string[]) => {
      return (
        content
          .split(/\r?\n/)
          .map((line, index) => {
            const trimedLine = line.trimStart();
            if (
              commentMultilieStart.test(trimedLine) ||
              commentSingleLineStart.test(trimedLine)
            ) {
              return line;
            }
            if (regexEnd.test(line)) {
              return processAddSrcAtEnd(
                regexEnd,
                line,
                packages,
                'from_import_export',
              );
            }
            if (singleLineImporrt.test(line)) {
              return processAddSrcAtEnd(
                singleLineImporrt,
                line,
                packages,
                'imports',
              );
            }
            if (singleLineRequire.test(line)) {
              return processAddSrcAtEnd(
                singleLineRequire,
                line,
                packages,
                'require',
              );
            }
            return line;
          })
          .join('\n') + '\n'
      );
    };

    const addImportSrc = (proj: Project) => {
      const pacakges = [
        ...proj.allIsomorphicPackagesFromMemory,
        ...(proj.__isSmartContainerChild
          ? proj.parent.children.map(c => `@${proj.parent.name}/${c.name}`)
          : []),
      ];
      // console.log(pacakges)

      const files = Helpers.filesFrom(proj.pathFor('src'), true).filter(f =>
        f.endsWith('.ts'),
      );

      for (const file of files) {
        const originalContent = Helpers.readFile(file);
        const changed = changeImport(originalContent, pacakges);
        if (
          originalContent &&
          changed &&
          originalContent?.trim().replace(/\s/g, '') !==
            changed?.trim().replace(/\s/g, '')
        ) {
          Helpers.writeFile(file, changed);
        }
      }
    };

    if (project.__isStandaloneProject) {
      addImportSrc(project);
    } else if (project.__isContainer) {
      for (const child of project.children) {
        addImportSrc(child);
      }
    }

    this._exit();
  }
  //#endregion

  //#region move js to ts
  $MOVE_JS_TO_TS(args) {
    Helpers.filesFrom(crossPlatformPath([this.cwd, args]), true).forEach(f => {
      if (path.extname(f) === '.js') {
        Helpers.move(
          f,
          crossPlatformPath([
            path.dirname(f),
            path.basename(f).replace('.js', '.ts'),
          ]),
        );
      }
    });
    Helpers.info('DONE');
    this._exit();
  }
  //#endregion

  //#region show messages
  ASYNC_PROC = async args => {
    global.tnpShowProgress = true;
    let p = Helpers.run(`${config.frameworkName} show:loop ${args}`, {
      output: false,
      cwd: this.cwd,
    }).async();
    p.stdout.on('data', chunk => {
      console.log('prod:' + chunk);
    });
    p.on('exit', c => {
      console.log('process exited with code: ' + c);
      this._exit();
    });
  };

  SYNC_PROC = async args => {
    global.tnpShowProgress = true;
    try {
      let p = Helpers.run(`${config.frameworkName} show:loop ${args}`, {
        output: false,
        cwd: this.cwd,
      }).sync();
      this._exit();
    } catch (err) {
      console.log('Erroroejk');
      this._exit(1);
    }
  };

  SHOW_RANDOM_HAMSTERS() {
    while (true) {
      const arr = ['Pluszla', 'Łapczuch', 'Misia', 'Chrupka'];
      console.log(arr[Helpers.numbers.randomInteger(0, arr.length - 1)]);
      Helpers.sleep(1);
    }
  }

  SHOW_RANDOM_HAMSTERS_TYPES() {
    while (true) {
      const arr = [
        'djungarian',
        'syrian golden',
        'syrian teddy bear',
        'dwarf roborowski',
        'dwarf russian',
        'dwarf winter white',
        'chinese hamster',
      ];
      console.log(arr[Helpers.numbers.randomInteger(0, arr.length - 1)]);
      Helpers.sleep(1);
    }
  }

  SHOW_LOOP_MESSAGES(args) {
    console.log(`

    platform: ${process.platform}
    terminal: ${UtilsProcess.getBashOrShellName()}

    `);
    global.tnpShowProgress = true;
    console.log('process pid', process.pid);
    console.log('process ppid', process.ppid);
    // process.on('SIGTERM', () => {
    //   this._exit()
    // })
    this._SHOW_LOOP_MESSAGES();
  }

  async newTermMessages() {
    UtilsProcess.startInNewTerminalWindow(`tnp showloopmessages 10`);
    this._exit();
  }

  _SHOW_LOOP(c = 0 as any, maximum = Infinity, errExit = false) {
    if (_.isString(c)) {
      var { max = Infinity, err = false } = require('minimist')(c.split(' '));
      maximum = max;
      errExit = err;
      // console.log('max',max)
      // console.log('err',err)
      c = 0;
    }
    if (c === maximum) {
      this._exit(errExit ? 1 : 0);
    }
    console.log(`counter: ${c}`);
    setTimeout(() => {
      this._SHOW_LOOP(++c, maximum, errExit);
    }, 1000);
  }

  _SHOW_LOOP_MESSAGES(
    c = 0 as any,
    maximum = Infinity,
    errExit = false,
    throwErr = false,
  ) {
    if (_.isString(c)) {
      const obj = require('minimist')(c.split(' '));
      var { max = Infinity, err = false } = obj;
      maximum = _.isNumber(max) ? max : Infinity;
      errExit = err;
      throwErr = obj.throw;
      // console.log('max',max)
      // console.log('err',err)
      c = 0;
    }
    if (c === maximum) {
      if (throwErr) {
        throw new Error('Custom error!');
      }
      if (errExit) {
        this._exit(1);
      }
      this._exit();
    }
    console.log(`counter: ${c}`);
    PROGRESS_DATA.log({ msg: `counter: ${c}`, value: c * 7 });
    setTimeout(() => {
      this._SHOW_LOOP_MESSAGES(++c, maximum, errExit, throwErr);
    }, 2000);
  }
  //#endregion

  //#region ln
  LN() {
    const [source, dest] = this.args;
    Helpers.createSymLink(source, dest);
    this._exit();
  }
  //#endregion

  //#region link
  LINK() {
    let project = this.project;

    if (project.__isStandaloneProject) {
      // if (process.platform !== 'win32') {
      //   await Helpers.isElevated();
      // }
      //#region linking to global/local bin
      let glboalBinFolderPath = path.dirname(
        Helpers.run(`which ${config.frameworkName}`, { output: false })
          .sync()
          .toString(),
      );
      if (process.platform === 'win32') {
        glboalBinFolderPath = crossPlatformPath(glboalBinFolderPath);
        if (/^\/[a-z]\//.test(glboalBinFolderPath)) {
          glboalBinFolderPath = glboalBinFolderPath.replace(
            /^\/[a-z]\//,
            `${glboalBinFolderPath.charAt(1).toUpperCase()}:/`,
          );
        }
      }
      const globalNodeModules = crossPlatformPath(
        path.join(
          glboalBinFolderPath,
          process.platform === 'win32'
            ? config.folder.node_modules
            : `../lib/${config.folder.node_modules}`,
        ),
      );
      const packageInGlobalNodeModules = crossPlatformPath(
        path.resolve(path.join(globalNodeModules, project.name)),
      );
      // packageInGlobalNodeModules
      Helpers.removeIfExists(packageInGlobalNodeModules);
      project.linkTo(packageInGlobalNodeModules);

      if (!Helpers.exists(project.pathFor(config.folder.bin))) {
        Helpers.mkdirp(project.pathFor(config.folder.bin));
      }

      const pattern = `${project.pathFor(config.folder.bin)}/*`;
      const countLinkInPackageJsonBin = glob
        .sync(pattern)
        .map(f => crossPlatformPath(f))
        .filter(f => {
          return (Helpers.readFile(f) || '').startsWith('#!/usr/bin/env');
        });

      if (countLinkInPackageJsonBin.length === 0) {
        const pathNormalLink = Helpers.path.create(
          project.location,
          config.folder.bin,
          `${project.name}`,
        );
        Helpers.writeFile(pathNormalLink, this._templateBin());
        countLinkInPackageJsonBin.push(pathNormalLink);

        const pathDebugLink = Helpers.path.create(
          project.location,
          config.folder.bin,
          `${project.name}-debug`,
        );
        Helpers.writeFile(pathDebugLink, this._templateBin(true));
        countLinkInPackageJsonBin.push(pathDebugLink);

        const startBackendFile = Helpers.path.create(
          project.location,
          config.folder.src,
          config.file.start_backend_ts,
        );
        if (!Helpers.exists(startBackendFile)) {
          Helpers.writeFile(startBackendFile, this._templateStartBackedn());
        }
      }

      project.__packageJson.data.bin = {};
      countLinkInPackageJsonBin.forEach(p => {
        project.__packageJson.data.bin[path.basename(p)] = `bin/${path.basename(
          p,
        )}`;
      });
      project.__packageJson.save(`update bin data`);

      if (_.isObject(project.__packageJson.data.bin)) {
        Object.keys(project.__packageJson.data.bin).forEach(globalName => {
          const localPath = path.join(
            project.location,
            project.__packageJson.data.bin[globalName],
          );
          const destinationGlobalLink = path.join(
            glboalBinFolderPath,
            globalName,
          );
          Helpers.removeIfExists(destinationGlobalLink);

          const inspect =
            globalName.endsWith('debug') || globalName.endsWith('inspect');
          const inspectBrk =
            globalName.endsWith('debug-brk') ||
            globalName.endsWith('inspect-brk');
          const attachDebugParam = inspect
            ? '--inspect'
            : inspectBrk
              ? '--inspect-brk'
              : '';

          if (process.platform === 'win32') {
            try {
              Helpers.writeFile(
                destinationGlobalLink,
                `
  #!/bin/sh
  basedir=$(dirname "$(echo "$0" | sed -e 's,\\\\,/,g')")

  case \`uname\` in
      *CYGWIN*|*MINGW*|*MSYS*) basedir=\`cygpath -w "$basedir"\`;;
  esac

  if [ -x "$basedir/node" ]; then
    "$basedir/node" ${attachDebugParam} "$basedir/node_modules/${path.basename(
      project.location,
    )}/bin/${globalName}" "$@"
    ret=$?
  else
    node ${attachDebugParam} "$basedir/node_modules/${path.basename(
      project.location,
    )}/bin/${globalName}" "$@"
    ret=$?
  fi
  exit $ret
            `.trim() + '\n',
              );

              const destinationGlobalLinkPS1File = path.join(
                glboalBinFolderPath,
                `${globalName}.ps1`,
              );
              Helpers.writeFile(
                destinationGlobalLinkPS1File,
                `
  #!/usr/bin/env pwsh
  $basedir=Split-Path $MyInvocation.MyCommand.Definition -Parent

  $exe=""
  if ($PSVersionTable.PSVersion -lt "6.0" -or $IsWindows) {
    # Fix case when both the Windows and Linux builds of Node
    # are installed in the same directory
    $exe=".exe"
  }
  $ret=0
  if (Test-Path "$basedir/node$exe") {
    & "$basedir/node$exe"  "$basedir/node_modules/${path.basename(
      project.location,
    )}/bin/${globalName}" $args
    $ret=$LASTEXITCODE
  } else {
    & "node$exe"  "$basedir/node_modules/${path.basename(
      project.location,
    )}/bin/${globalName}" $args
    $ret=$LASTEXITCODE
  }
  exit $ret
            `.trim() + '\n',
              );
              const destinationGlobalLinkCmdFile = path.join(
                glboalBinFolderPath,
                `${globalName}.cmd`,
              );
              Helpers.writeFile(
                destinationGlobalLinkCmdFile,
                `
  @ECHO off
  SETLOCAL
  CALL :find_dp0

  IF EXIST "%dp0%\\node.exe" (
    SET "_prog=%dp0%\\node.exe"
  ) ELSE (
    SET "_prog=node"
    SET PATHEXT=%PATHEXT:;.JS;=;%
  )

  "%_prog%"  "%dp0%\\node_modules\\${path.basename(
    project.location,
  )}\\bin\\${globalName}" %*
  ENDLOCAL
  EXIT /b %errorlevel%
  :find_dp0
  SET dp0=%~dp0
  EXIT /b

            `.trim() + '\n',
              );
            } catch (error) {
              Helpers.error(
                `Check if you cli is not active in another terminal and try again`,
                false,
                true,
              );
            }
          } else {
            Helpers.createSymLink(localPath, destinationGlobalLink);
            const command = `chmod +x ${destinationGlobalLink}`;
            Helpers.log(`Trying to make file exacutable global command "${chalk.bold(
              globalName,
            )}".

            command: ${command}
            `);
            Helpers.run(command).sync();
          }

          Helpers.info(`Global link created for: ${chalk.bold(globalName)}`);
        });
      }

      this._exit();
      //#endregion
    }
    Helpers.info(`Linking DONE!`);
    this._exit();
  }

  _templateBin(debug = false) {
    return `#!/usr/bin/env node ${debug ? '--inspect' : ''}
  var { fse, crossPlatformPath, path } = require('tnp-core/src');
  var path = {
    dist: path.join(crossPlatformPath(__dirname), '../dist/index.js'),
    npm: path.join(crossPlatformPath(__dirname), '../index.js')
  }
  var p = fse.existsSync(path.dist) ? path.dist : path.npm;
  global.globalSystemToolMode = true;
  var run = require(p).run;
  run(process.argv.slice(2));
    `;
  }

  _templateStartBackedn() {
    return `import { Helpers } from 'tnp-helpers/src';

  export async function run([]) {
    console.log('Hello from', require('path').basename(process.argv[1]))
    const command = args.shift() as any;
    if (command === 'test') {
      Helpers.clearConsole();
      console.log('waiting for nothing...')
      process.stdin.resume();
    }
    this._exit();
    }`;
  }
  //#endregion

  //#region dedupe
  DEDUPE() {
    this.project.__node_modules.dedupe(
      this.args.join(' ').trim() === '' ? void 0 : this.args,
    );
    this._exit();
  }

  DEDUPE_COUNT() {
    this.project.__node_modules.dedupeCount(this.args);
    this._exit();
  }
  //#endregion

  //#region deps

  DEPS_SHOW() {
    this.project.__packageJson.showDeps('deps show');
    this._exit();
  }

  DEPS_HIDE() {
    if (this.project.__isCoreProject) {
      this.project.__packageJson.showDeps('deps show');
    } else {
      this.project.__packageJson.hideDeps('deps hide');
    }
    this._exit();
  }

  /**
   * generate deps json
   */
  DEPS_JSON() {
    const node_moduels = path.join(this.cwd, config.folder.node_modules);
    const result = {};
    Helpers.foldersFrom(node_moduels)
      .filter(f => path.basename(f) !== '.bin')
      .forEach(f => {
        const packageName = path.basename(f);
        if (packageName.startsWith('@')) {
          const orgPackageRootName = packageName;
          Helpers.foldersFrom(f).forEach(f2 => {
            try {
              result[`${orgPackageRootName}/${path.basename(f2)}`] =
                Helpers.readValueFromJson(
                  path.join(f2, config.file.package_json),
                  'version',
                  '',
                );
            } catch (error) {}
          });
        } else {
          try {
            result[packageName] = Helpers.readValueFromJson(
              path.join(f, config.file.package_json),
              'version',
              '',
            );
          } catch (error) {}
        }
      });
    Helpers.writeJson(
      path.join(this.cwd, config.file.result_packages_json),
      result,
    );
    this._exit();
  }
  //#endregion

  //#region reinstall
  async reinstallCore() {
    await this.project.coreContainer?.__npmPackages.installFromArgs('');
    this._exit();
  }

  async REINSTALL(): Promise<void> {
    // await Helpers.killAllNodeExceptCurrentProcess();
    const proj = this.project;

    if (proj.__isContainer) {
      if (proj.__isContainerCoreProject) {
        Helpers.taskStarted(
          `Removing old node_modules for core container ${proj.__frameworkVersion}`,
        );
        proj.__node_modules.remove();
        Helpers.taskDone(
          `Removed old node_modules for core container ${proj.__frameworkVersion}`,
        );
        await proj.__npmPackages.installFromArgs('');
        Helpers.info(`Reinstal done for core container`);
      } else {
        // smart container or normal container
        const children = proj.children.filter(
          c =>
            c.__frameworkVersionAtLeast('v3') &&
            c.typeIs('isomorphic-lib') &&
            c.__npmPackages.useLinkAsNodeModules,
        );
        for (let index = 0; index < children.length; index++) {
          const c = children[index];
          Helpers.info(`Recreating node_module for ${c.genericName}`);
          c.__node_modules.remove();
          await c.init('initing after reinstall');
        }
      }
    } else if (proj.__isStandaloneProject) {
      proj.__node_modules.remove();
      await proj.__npmPackages.installFromArgs('');
      // Helpers.info(`Reinstal done for core standalone project`);
    } else {
      Helpers.error(
        `[${config.frameworkName}] This project does not support reinsall.
    location: ${proj?.location}
    `,
        false,
        false,
      );
    }

    this._exit();
  }
  //#endregion

  //#region file info
  FILEINFO = args => {
    console.log(Helpers.getMostRecentFilesNames(crossPlatformPath(this.cwd)));

    this._exit();
  };
  //#endregion

  //#region versions
  VERSIONS() {
    const children = this.project.children;

    for (let index = 0; index < children.length; index++) {
      const child = children[index] as Project;
      Helpers.info(
        `v${child.__packageJson.data.version}\t - ${child.genericName}`,
      );
    }

    this._exit();
  }
  //#endregion

  //#region path
  PATH = () => {
    console.log(Project.ins.Tnp.location);
    this._exit();
  };
  //#endregion

  //#region env
  ENV_CHECK(args) {
    Helpers.checkEnvironment();
    this._exit();
  }

  ENV_INSTALL() {
    CLI.installEnvironment(requiredForDev);
    this._exit();
  }
  //#endregion

  //#region throw error
  THROW_ERR() {
    Helpers.error(`Erororoororo here`, false, true);
  }
  //#endregion

  //#region brew
  BREW(args) {
    const isM1MacOS = os.cpus()[0].model.includes('Apple M1');
    if (process.platform === 'darwin') {
      if (isM1MacOS) {
        Helpers.run(`arch -x86_64 brew ${args}`).sync();
      } else {
        Helpers.run(`brew ${args}`).sync();
      }
    }
    this._exit();
  }
  //#endregion

  //#region version

  async version() {
    // Helpers.log(`Framework name: '${config.frameworkName}'`);
    //#region @notForNpm
    if (ENV.notForNpm) {
      Helpers.success(`I am secret project!!!`);
    }
    //#endregion
    // global.spinner?.start();
    // Helpers.sleep(1);
    // Helpers.info(`${config.frameworkName} location: ${Project.ins.Tnp.location}`)
    // Helpers.sleep(1);
    // Helpers.info(`${config.frameworkName} location: ${Project.ins.Tnp.location}`)
    // Helpers.sleep(1);
    // Helpers.info(`${config.frameworkName} location: ${Project.ins.Tnp.location}`)
    // Helpers.sleep(1);
    // Helpers.info(`${config.frameworkName} location: ${Project.ins.Tnp.location}`)
    // Helpers.sleep(1);
    // Helpers.info(`${config.frameworkName} location: ${Project.ins.Tnp.location}`)
    // Helpers.info('waiting...');

    // global.spinner?.start();
    // Helpers.info('waiting next time!!. ..');
    // Helpers.sleep(5);
    // global.spinner?.stop();
    // log.data('Hellleoeoeo')
    const tnpProj = Project.ins.Tnp;
    const taonProj = Project.ins.From([
      fse.realpathSync(path.dirname(tnpProj.location)),
      config.frameworkNames.productionFrameworkName,
    ]);
    Helpers.success(`

  Taon: ${taonProj?.version ? `v${taonProj.version}` : '-'}
  Tnp: ${tnpProj?.version ? `v${tnpProj.version}` : '-'}

    `);
    this._exit();
  }
  //#endregion

  //#region run
  run() {
    Helpers.run(`node run.js`, {
      output: true,
      silence: false,
    }).sync();
    this._exit(0);
  }
  //#endregion

  //#region ps info
  async PSINFO(args: string) {
    const pid = Number(args);

    let ps: Models.PsListInfo[] = await psList();

    let psinfo = ps.find(p => p.pid == pid);
    if (!psinfo) {
      Helpers.error(`No process found with pid: ${args}`, false, true);
    }
    console.log(psinfo);
    this._exit();
  }
  //#endregion

  //#region init core porjects
  async INIT_CORE() {
    Helpers.taskStarted(`${config.frameworkName} initing core projects`);
    let allCoreProject: (Project & {
      projectLinkedFiles: any; // TODO QUICKFIX,
      filesStructure: any;
    })[] = [];

    (config.coreProjectVersions as CoreModels.FrameworkVersion[]).forEach(v => {
      let corePorjectsTypes: CoreModels.LibType[] = ['isomorphic-lib'];
      const projects = corePorjectsTypes.map(t => Project.by(t, v));
      allCoreProject = [...projects, ...allCoreProject] as any;
    });

    for (let index = 0; index < allCoreProject.length; index++) {
      const projectToInit = allCoreProject[index] as Project;
      Helpers.log(`${projectToInit.genericName} ${projectToInit.location}`);
      const linkedFiles = projectToInit.__projectLinkedFiles();
      for (let index2 = 0; index2 < linkedFiles.length; index2++) {
        const l = linkedFiles[index2];
        const source = path.join(l.sourceProject.location, l.relativePath);
        const dest = path.join(projectToInit.location, l.relativePath);
        if (!Helpers.exists(source)) {
          Helpers.error(
            `[${config.frameworkName}] Core source do not exists: ${source}`,
            false,
            true,
          );
        }
        Helpers.log(`${config.frameworkName} link from: ${source} to ${dest}`);

        Helpers.createSymLink(source, dest, {
          continueWhenExistedFolderDoesntExists: true,
        });
      }
      await projectToInit.struct();
    }
    Helpers.taskDone('DONE');
    this._exit();
  }
  //#endregion

  //#region sync core repositories
  async SYNC() {
    Project.sync({ syncFromCommand: true });
    this._exit();
  }
  //#endregion

  //#region copy and rename (vscode option)
  async $COPY_AND_RENAME(args: string) {
    // console.log(`>> ${args} <<`)
    const ins = MagicRenamer.Instance(this.cwd);
    await ins.start(args, true);
    this._exit();
  }
  //#endregion

  //#region generate
  GENERATE(args: string) {
    const argsv = args.split(' ');
    let [absPath, moduleName, entityName] = argsv;
    if (!Helpers.exists(absPath)) {
      Helpers.mkdirp(absPath);
    }
    const absFilePath = crossPlatformPath(absPath);
    if (!Helpers.isFolder(absPath)) {
      absPath = crossPlatformPath(path.dirname(absPath));
    }
    entityName = decodeURIComponent(entityName);
    const nearestProj = Project.ins.nearestTo(this.cwd) as Project;
    // console.log({
    //   nearestProj: nearestProj?.location
    // })
    let container = Project.by(
      'container',
      nearestProj.__frameworkVersion,
    ) as Project;
    if (container.__frameworkVersionLessThan('v3')) {
      container = Project.by(
        'container',
        config.defaultFrameworkVersion,
      ) as Project;
    }

    const myEntity = 'my-entity';

    const flags = {
      flat: '_flat',
      custom: '_custom',
    };

    const isFlat = moduleName.includes(flags.flat);
    moduleName = moduleName.replace(flags.flat, '');

    const isCustom = moduleName.includes(flags.custom);
    moduleName = moduleName.replace(flags.custom, '');

    const exampleLocation = crossPlatformPath([
      container.location,
      `gen-examples-${container.__frameworkVersion}`,
      moduleName,
      myEntity,
    ]);

    const newEntityName = UtilsString.kebabCaseNoSplitNumbers(entityName);
    const generatedCodeAbsLoc = crossPlatformPath([
      container.location,
      `gen-examples-${container.__frameworkVersion}`,
      moduleName,
      newEntityName,
    ]);
    Helpers.remove(generatedCodeAbsLoc, true);
    let destination = crossPlatformPath([absPath, newEntityName]);
    if (isFlat) {
      destination = crossPlatformPath(path.dirname(destination));
    }

    if (isCustom) {
      //#region handle custom cases
      if (moduleName === 'generated-index-exports') {
        const folders = [
          ...Helpers.foldersFrom(absPath).map(f => path.basename(f)),
          ...Helpers.filesFrom(absPath, false).map(f => path.basename(f)),
        ]
          .filter(f => !['index.ts'].includes(f))
          .filter(f => !f.startsWith('.'))
          .filter(f => !f.startsWith('_'))
          .filter(f =>
            _.isUndefined(notNeededForExportFiles.find(e => f.endsWith(e))),
          )
          .filter(
            f =>
              path.extname(f) === '' ||
              !_.isUndefined(
                extAllowedToExportAndReplaceTSJSCodeFiles.find(a =>
                  f.endsWith(a),
                ),
              ),
          );
        Helpers.writeFile(
          crossPlatformPath([absPath, config.file.index_ts]),
          folders
            .map(f => {
              if (
                !_.isUndefined(frontendFiles.find(bigExt => f.endsWith(bigExt)))
              ) {
                `${TAGS.COMMENT_REGION} ${TAGS.BROWSER}\n` +
                  `export * from './${f.replace(path.extname(f), '')}';` +
                  +`\n${TAGS.COMMENT_END_REGION}\n`;
              }
              if (
                !_.isUndefined(
                  backendNodejsOnlyFiles.find(bigExt => f.endsWith(bigExt)),
                )
              ) {
                return (
                  `${TAGS.COMMENT_REGION} ${TAGS.BACKEND}\n` +
                  `export * from './${f.replace(path.extname(f), '')}';` +
                  +`\n${TAGS.COMMENT_END_REGION}\n`
                );
              }
              return `export * from './${f.replace(path.extname(f), '')}';`;
            })
            .join('\n') + '\n',
        );
      }
      if (moduleName === 'wrap-with-browser-regions') {
        if (!Helpers.isFolder(absFilePath)) {
          const content = Helpers.readFile(absFilePath);
          Helpers.writeFile(
            absFilePath,
            `${TAGS.COMMENT_REGION} ${TAGS.BROWSER}\n` +
              content +
              `\n${TAGS.COMMENT_END_REGION}\n`,
          );
        }
      }
      //#endregion
    } else {
      const ins = MagicRenamer.Instance(exampleLocation);
      ins.start(`${myEntity} -> ${newEntityName}`, true);
      if (isFlat) {
        const files = Helpers.filesFrom(generatedCodeAbsLoc, true);
        for (let index = 0; index < files.length; index++) {
          const fileAbsPath = crossPlatformPath(files[index]);
          const relative = fileAbsPath.replace(generatedCodeAbsLoc + '/', '');
          const destFileAbsPath = crossPlatformPath([destination, relative]);
          Helpers.copyFile(fileAbsPath, destFileAbsPath);
        }
        Helpers.remove(generatedCodeAbsLoc, true);
      } else {
        Helpers.move(generatedCodeAbsLoc, destination);
      }
    }
    console.info('GENERATION DONE');
    this._exit(0);
  }
  //#endregion

  //#region clear
  async CLEAN() {
    await this.project.clear();
    this._exit();
  }

  CLEAR() {
    this.CLEAN();
  }

  CL() {
    this.CLEAN();
  }
  //#endregion

  //#region show git in progress
  inprogress() {
    Helpers.info(`
    In progress
${this.project.children
  .filter(f =>
    f.git
      .lastCommitMessage()
      .startsWith(Helpers.git.ACTION_MSG_RESET_GIT_HARD_COMMIT),
  )
  .map((c, index) => `${index + 1}. ${c.genericName}`)}

    `);
    this._exit();
  }
  //#endregion

  //#region prettier
  async prettier() {
    Helpers.info(`Initing before prettier...`);
    await this.project.init('initing before prettier');
    Helpers.info(`Running prettier...`);
    this.project.formatAllFiles();
    Helpers.info(`Prettier done`);
    this._exit();
  }

  //#endregion

  //#region update deps for core container
  async updatedeps(): Promise<void> {
    if (!this.project || !this.project.__isCoreProject) {
      Helpers.error(`This command is only for core projects`, false, true);
    }
    const allDeps = this.project.npmHelpers.allDependencies;
    // const overrideAndUpdateAllToLatest = false;
    // await Helpers.questionYesNo(
    //   'update all to latest ?',
    // );

    //#region helpers

    //#region helpers / getLatestVersionFromNpm
    const getLatestVersionFromNpm = async (
      packageName: string,
    ): Promise<string> => {
      const res = await fetch(
        `https://registry.npmjs.org/${packageName}/latest`,
      );
      const json = await res.json();
      return json.version;
    };
    //#endregion

    //#region helpers / checkIfPackageVersionAvailable
    const checkIfPackageVersionAvailable = async (
      pkgName: string,
      pkgVersion: string,
    ): Promise<boolean> => {
      const res = await fetch(
        `https://registry.npmjs.org/${pkgName}/${pkgVersion}`,
      );
      return res.status === 200;
    };
    //#endregion

    //#region helpers / getLastMajorVersions
    const getLastMajorVersions = async (pkgName: string): Promise<string[]> => {
      try {
        const res = await fetch(`https://registry.npmjs.org/${pkgName}`);
        const json = await res.json();
        return Object.keys(json.versions).filter(v =>
          v.startsWith(json['dist-tags'].latest.split('.')[0]),
        );
      } catch (error) {
        return [];
      }
    };
    //#endregion

    //#region helpers / getLastMinorVersionsForMajor
    const getLastMinorVersionsForMajor = async (
      majorVer: number,
      pkgName: string,
    ): Promise<string[]> => {
      try {
        const res = await fetch(`https://registry.npmjs.org/${pkgName}`);
        const json = await res.json();
        return Object.keys(json.versions).filter(v =>
          v.startsWith(`${majorVer}.`),
        );
      } catch (error) {
        return [];
      }
    };
    //#endregion

    //#region helpers / getVerObj
    const getVerObj = (
      version: string,
    ): {
      major: number;
      minor: number;
      patch: number;
    } => {
      return version
        .replace('^', '')
        .replace('~', '')
        .split('.')
        .map(Number)
        .reduce((acc, c, i) => {
          if (i === 0) {
            return { ...acc, ['major']: c };
          } else if (i === 1) {
            return { ...acc, ['minor']: c };
          } else {
            return { ...acc, ['patch']: c };
          }
        }, {}) as any;
    };
    //#endregion

    //#endregion

    const allDepsKeys = Object.keys(allDeps);
    for (let index = 0; index < allDepsKeys.length; index++) {
      Helpers.clearConsole();

      //#region resolve variables
      const packageName = allDepsKeys[index];
      const currentPackageVersion = allDeps[packageName];
      const currentVerObj = getVerObj(currentPackageVersion);
      const taonJsonContent = this.project.readFile(config.file.taon_jsonc);
      const tags = Utils.json.getAtrributies(packageName, taonJsonContent);
      Helpers.info(
        `(${index + 1} / ${allDepsKeys.length}) ` +
          `Downloading info about "${packageName}" (current ver: ${currentPackageVersion})`,
      );
      const getLastVersions = async (pkgName: string): Promise<string[]> => {
        let someLastVersion = Helpers.uniqArray([
          ...(await getLastMajorVersions(pkgName)),
          ...(await getLastMinorVersionsForMajor(
            latestVerObj.major - 1,
            pkgName,
          )),
          ...(await getLastMinorVersionsForMajor(
            latestVerObj.major - 2,
            pkgName,
          )),
          ...(await getLastMinorVersionsForMajor(currentVerObj.major, pkgName)),
          ...(await getLastMinorVersionsForMajor(
            currentVerObj.major - 1,
            pkgName,
          )),
          ...(await getLastMinorVersionsForMajor(
            currentVerObj.major - 2,
            pkgName,
          )),
        ])
          .sort((a, b) => {
            const aVerObj = getVerObj(a);
            const bVerObj = getVerObj(b);
            if (aVerObj.major === bVerObj.major) {
              if (aVerObj.minor === bVerObj.minor) {
                return aVerObj.patch - bVerObj.patch;
              }
              return aVerObj.minor - bVerObj.minor;
            }
            return aVerObj.major - bVerObj.major;
          })
          .reverse();
        return someLastVersion;
      };

      let latestToUpdate = await getLatestVersionFromNpm(packageName);

      const latestVerObj = getVerObj(latestToUpdate);
      const isTheSameVersion =
        latestVerObj.major === currentVerObj.major &&
        latestVerObj.minor === currentVerObj.minor &&
        latestVerObj.patch === currentVerObj.patch;

      const isOnlyMajorpdate = latestVerObj.major >= currentVerObj.major;

      const isOnlyMinorUpdate =
        latestVerObj.major === currentVerObj.major &&
        latestVerObj.minor > currentVerObj.minor;

      const isOnlyPatchUpdate =
        latestVerObj.major === currentVerObj.major &&
        latestVerObj.minor === currentVerObj.minor &&
        latestVerObj.patch > currentVerObj.patch;

      const trustedMajor = !!tags.find(
        c => c.name === '@trusted' && c.value === 'major',
      );

      const trustedMinor = !!tags.find(
        c => c.name === '@trusted' && c.value === 'minor',
      );

      const trustedPath = !!tags.find(
        c => c.name === '@trusted' && c.value === 'patch',
      );

      const notTrusted = !tags.find(c => c.name === '@trusted');
      if (notTrusted) {
        console.log(`Package "${packageName}" is not trusted. Skipping.`);
        continue;
      }

      let automaticallyUpdate =
        (isOnlyMajorpdate && trustedMajor) ||
        (isOnlyMinorUpdate && (trustedMajor || trustedMinor)) ||
        (isOnlyPatchUpdate && (trustedMajor || trustedMinor || trustedPath));
      //#endregion

      if (currentPackageVersion === 'latest') {
        console.log(`Package "${packageName}" is set to latest. Skipping.`);
        continue;
      }

      if (isTheSameVersion) {
        // await Helpers.questionYesNo('package is the same, continue ?');
        this.project.npmHelpers.updateDependency({
          packageName,
          version: currentPackageVersion,
          updateTaonJsonFirst: true,
        });
        continue;
      }

      if (!automaticallyUpdate) {
        //#region display last versions
        const someLastVersion = await getLastVersions(packageName);
        if (trustedMinor) {
          // if (someLastVersion.some(a => a.startsWith(currentPackageVersion))) {
          //   console.log(
          //     `Package "${packageName}" on the highest minor version. Skipping.`,
          //   );
          //   continue;
          // }
          const trustedMinorVersion = someLastVersion.find(
            v => getVerObj(v).minor > currentVerObj.minor,
          );
          if (trustedMinorVersion) {
            latestToUpdate = trustedMinorVersion;
            automaticallyUpdate = true;
          }
        }
        if (trustedPath) {
          // if (someLastVersion.some(a => a.startsWith(currentPackageVersion))) {
          //   console.log(
          //     `Package "${packageName}" on the highest patch version. Skipping.`,
          //   );
          //   continue;
          // }
          const trustedPatchVersion = someLastVersion.find(
            v => getVerObj(v).patch > currentVerObj.patch,
          );
          if (trustedPatchVersion) {
            latestToUpdate = trustedPatchVersion;
            automaticallyUpdate = true;
          }
        }
        if (!automaticallyUpdate) {
          console.log(
            `Can't update automatically. Latest versions for ${packageName}:\n\n` +
              someLastVersion.map(v => `- ${v}`).join('\n') +
              '\n',
          );
        }
        //#endregion
      }

      const questionsForUpdate = {
        //#region question for update options
        update: {
          name:
            `Update to latest version "${currentPackageVersion}=>` +
            `${chalk.bold.underline(latestToUpdate)}" ` +
            `${
              tags.length > 0
                ? '(' +
                  tags
                    .map(c => c.name + (c.value ? '=' + c.value : ''))
                    .join(',') +
                  ')'
                : ''
            }`,
        },
        skip: {
          name: 'Skip this package ?',
        },
        skipTo: {
          name: 'Skip and got to package with index ?',
        },
        delete: {
          name: 'Delete this package ?',
        },
        manual: {
          name: 'Set version manually ?',
        },
        //#endregion
      };

      const whatToDo = automaticallyUpdate
        ? 'update'
        : await Helpers.selectChoicesAsk<keyof typeof questionsForUpdate>(
            `(${index + 1} / ${allDepsKeys.length}) ` +
              `${chalk.gray('What to do with package ')}` +
              ` "${chalk.bold(packageName)} ${currentPackageVersion}" ?`,
            questionsForUpdate,
          );

      // Helpers.pressKeyAndContinue('Press any key to continue');
      if (whatToDo === 'update') {
        const prefixOpt = {
          //#region prefix options
          '~': {
            name: `tilde (~) => ${chalk.bold(`~${latestToUpdate}`)}`,
          },
          '^': {
            name: `caret (^)  => ${chalk.bold(`^${latestToUpdate}`)}`,
          },
          '': {
            name: `no prefix => ${chalk.bold(`${latestToUpdate}`)}`,
          },
          back: {
            name: `-- go back -- => ${chalk.bold(`${latestToUpdate}`)}`,
          },
          //#endregion
        };
        const prefix = automaticallyUpdate
          ? '~'
          : await Helpers.selectChoicesAsk<keyof typeof prefixOpt>(
              'Select prefix',
              prefixOpt,
            );

        if (prefix === 'back') {
          index--;
          continue;
        }
        await this.project.npmHelpers.updateDep({
          packageName,
          version: `${prefix}${latestToUpdate}`,
          updateTaonJsonFirst: true,
        });
      } else if (whatToDo === 'delete') {
        await this.project.npmHelpers.updateDep({
          packageName,
          version: null,
          updateTaonJsonFirst: true,
        });
      } else if (whatToDo === 'manual') {
        while (true) {
          const version = await Helpers.input({
            question: `Enter version for ${packageName}`,
            defaultValue: allDeps[packageName],
          });
          console.log('Checking version...');
          const isAvailable = await checkIfPackageVersionAvailable(
            packageName,
            version,
          );
          if (isAvailable) {
            await this.project.npmHelpers.updateDep({
              packageName,
              version,
              updateTaonJsonFirst: true,
            });
            break;
          } else {
            Helpers.error(`Version ${version} not available on npm...`);
          }
        }
      } else if (whatToDo === 'skipTo') {
        while (true) {
          const indexToSkip = await Helpers.input({
            question: `Enter index to skip to`,
            defaultValue: `${index}`,
          });
          index = Number(indexToSkip) - 1;
          if (index >= 0 && index < allDepsKeys.length) {
            break;
          }
        }
      } else {
        Helpers.info(`Skipping ${packageName}`);
      }
    }

    this._exit();
  }
  //#endregion

  //#region compare containers
  compareContainers() {
    Helpers.clearConsole();
    const [c1ver, c2ver] = this.args;
    const c1 = Project.by('container', `v${c1ver.replace('v', '')}` as any);
    const c2 = Project.by('container', `v${c2ver.replace('v', '')}` as any);
    const c1Deps = c1.npmHelpers.allDependencies;
    const c2Deps = c2.npmHelpers.allDependencies;
    const displayCompare = (
      depName: string,
      c1depVer: string,
      c2depVer: string,
    ) => {
      // console.log(`Comparing ${depName} ${c1depVer} => ${c2depVer}`);
      c1depVer = UtilsNpm.fixMajorVerNumber(c1depVer);
      c2depVer = UtilsNpm.fixMajorVerNumber(c2depVer);

      if ([c1depVer, c2depVer].includes('latest')) {
        console.log(`${chalk.gray(depName)}@(${c1depVer} => ${c2depVer})\t`);
      } else if (c2depVer && c1depVer) {
        if (semver.lt(c2depVer, c1depVer)) {
          console.log(`${chalk.red(depName)}@(${c1depVer} => ${c2depVer})\t`);
        } else if (semver.gte(c2depVer, c1depVer)) {
          console.log(`${chalk.gray(depName)}@(${c1depVer} => ${c2depVer})\t`);
        }
      } else {
        console.log(`${chalk.bold(depName)}@(${c1depVer} => ${c2depVer})\t`);
      }
    };
    const allDepsKeys = Object.keys(c1Deps).concat(Object.keys(c2Deps));
    for (const packageName of allDepsKeys) {
      displayCompare(
        packageName,
        UtilsNpm.clearVersion(c1Deps[packageName], { removePrefixes: true }),
        UtilsNpm.clearVersion(c2Deps[packageName], { removePrefixes: true }),
      );
    }
    this._exit();
  }
  //#endregion

  //#region not for npm / mp3
  /**
   *  npm install --global bin-version-check-cli
   *  npm i -g yt-dlp
   *  choco install ffmpeg
   */
  MP3(args) {
    const downloadPath = crossPlatformPath([
      os.userInfo().homedir,
      'Downloads',
      'mp3-from-websites',
    ]);
    if (!Helpers.exists(downloadPath)) {
      Helpers.mkdirp(downloadPath);
    }

    Helpers.run(
      `cd ${downloadPath} && yt-dlp --verbose --extract-audio --audio-format mp3 ` +
        args,
      {
        output: true,
        cwd: downloadPath,
      },
    ).sync();
    this._exit();
  }
  //#endregion

  //#region not for npm / mp4
  MP4(args) {
    const downloadPath = crossPlatformPath([
      os.userInfo().homedir,
      'Downloads',
      'mp4-from-websites',
    ]);
    // yt-dlp --print filename -o "%(uploader)s-%(upload_date)s-%(title)s.%(ext)s"
    Helpers.run(
      'yt-dlp --verbose  -S "res:1080,fps" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best" ' +
        args,
      {
        output: true,
        cwd: downloadPath,
      },
    ).sync();
    this._exit();
  }
  //#endregion

  killZs() {
    this.killZscaller();
  }

  killZscaller() {
    Helpers.run('sudo killall -9 Zscaler ZscalerTunnel ZscalerAppServices', {
      // stdio that will let me pass password in child process
      stdio: 'inherit',
    }).sync();
    this._exit();
  }

  //#region not for npm / get trusted
  //#region @notForNpm
  getJsonCAttrs() {
    console.log(`Scannign for args in jsonc files...`);
    const jsoncContent = this.project.readFile(config.file.taon_jsonc);
    walk.Object(Helpers.parse(jsoncContent, true), (value, jsonPath) => {
      if (!this.firstArg || jsonPath.includes(this.firstArg)) {
        // console.log('PATH: ' + jsonPath);
        const attrs = Utils.json.getAtrributies(jsonPath, jsoncContent);

        console.log(
          `${attrs.length > 0 ? chalk.bold('DETECTED') : 'DETECTED'} ` +
            `(${attrs.length} tags): ${attrs.length > 0 ? chalk.bold(jsonPath) : jsonPath}`,
          attrs
            .map(c =>
              chalk.red.underline(
                c.name + (c.value ? '=' + chalk.bold(c.value) : ''),
              ),
            )
            .join(', '),
        );
      }
    });
    this._exit();
  }
  //#endregion
  //#endregion

  //#region not for npm / get trusted
  //#region @notForNpm
  trusted() {
    console.log(this.project.__trusted);
    this._exit();
  }
  //#endregion
  //#endregion

  //#region not for npm / tnp fix taon json
  //#region @notForNpm
  async tnpFixTaonJson() {
    this._exit();
  }
  //#endregion
  //#endregion

  //#region list active core container
  listActiveCoreContainer() {
    config.activeFramewrokVersions.forEach(v => {
      console.log(`- ${v} = `, Project.by('container', v).location);
    });
    this._exit();
  }
  //#endregion

  //#region start taon projects worker
  async startCliServiceTaonProjectsWorker() {
    await this.ins.taonProjectsWorker.cliStartProcedure(this.params);
  }
  //#endregion

  //#region json schema docs watcher
  async jsonSchemaDocsWatch() {
    await this.project.init('initing before json schema docs watch');
    const fileToWatchRelative = 'src/lib/models.ts';
    const fileToWatch = this.project.pathFor(fileToWatchRelative);

    const recreate = async () => {
      const schema = await this._createJsonSchemaFrom({
        nameOfTypeOrInterface: 'Models.DocsConfig',
        project: this.project,
        relativePathToTsFile: fileToWatch,
      });
      Helpers.writeFile(this.project.docs.docsConfigSchemaPath, schema);
      Helpers.info(
        `DocsConfig schema updated ${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}`,
      );
    };

    const debouceRecreate = _.debounce(recreate, 100);
    Helpers.taskStarted('Recreating... src/lib/models.ts');
    await recreate();
    Helpers.taskDone('Recreation done src/lib/models.ts');
    Helpers.taskStarted('Watching for changes in src/lib/models.ts');
    chokidar.watch(fileToWatch).on('change', () => {
      debouceRecreate();
    });
  }

  jsonSchema() {
    return this.schemaJson();
  }
  async _createJsonSchemaFrom(options: Models.CreateJsonSchemaOptions) {
    const { project, relativePathToTsFile, nameOfTypeOrInterface } = options;

    // Create the config for ts-json-schema-generator
    const config = {
      path: relativePathToTsFile, // Path to the TypeScript file
      tsconfig: project.pathFor('tsconfig.json'), // Path to the tsconfig.json file
      type: nameOfTypeOrInterface, // Type or interface name
      skipTypeCheck: false, // Optional: Skip type checking
    };

    // Create the schema generator using the config
    const generator: SchemaGenerator = createGenerator(config);

    // Generate the schema
    const schema = generator.createSchema(config.type);

    // Convert the schema object to JSON string
    const schemaJson = JSON.stringify(schema, null, 2);

    return schemaJson;
  }

  schemaJson() {
    console.log(
      this._createJsonSchemaFrom({
        project: this.project,
        relativePathToTsFile: this.firstArg,
        nameOfTypeOrInterface: this.lastArg,
      }),
    );
    this._exit();
  }
  //#endregion

  //#region ts testing functions
  public async ts() {
    Helpers.clearConsole();
    await UtilsTerminal.selectActionAndExecute({
      recognizeImportExportRequire: {
        name: 'Recognize import/export/require',
        action: async () => {
          const files = Helpers.filesFrom([this.cwd, config.folder.src], true);
          const selectedFileAbsPath = await UtilsTerminal.select({
            question: 'Select file to recognize imports/exports/requires',
            choices: files.map(f => {
              return {
                name: f,
                value: f,
              };
            }),
          });

          const importsExports = recognizeImportsFromFile(
            Helpers.readFile(selectedFileAbsPath),
          ).map(i => {
            return `(${i.type}) ${chalk.bold(i.cleanEmbeddedPathToFile)}`;
          });
          console.log(importsExports.join('\n '));
        },
      },
    });
    this._exit();
  }
  //#endregion

  //#region electron build
  public async electronBuild() {
    await this.project.tryKillAllElectronInstances();
    await this.project.build(
      BuildOptions.from({
        ...this.params,
        buildType: 'app',
        targetApp: 'electron',
        buildForRelease: true,
        finishCallback: () => this._exit(),
      }),
    );
    this._exit();
  }

  async electronWatchBuild() {
    await this.project.tryKillAllElectronInstances();
    await this.project.build(
      BuildOptions.from({
        ...this.params,
        buildType: 'app',
        targetApp: 'electron',
        watch: true,
      }),
    );
  }
  //#endregion
}

export default {
  // registerd as empty
  $Global: Helpers.CLIWRAP($Global, ''),
};
