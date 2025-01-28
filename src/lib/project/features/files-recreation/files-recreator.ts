//#region @backend
import { fse, crossPlatformPath, CoreModels, chalk } from 'tnp-core/src';
import { path } from 'tnp-core/src';
import * as JSON5 from 'json5';
import { glob } from 'tnp-core/src';
import { _ } from 'tnp-core/src';
// local
import { Project } from '../../abstract/project';
import { Models } from '../../../models';
import { Helpers } from 'tnp-helpers/src';
import { config } from 'tnp-config/src';
import { BaseFeatureForProject } from 'tnp-helpers/src';
import { InitOptions } from '../../../options';
import { Utils } from 'tnp-core/src';
import { frameworkBuildFolders } from '../../../constants';

// function getVscodeSettingsFrom(project: Project) {
//   let settings: CoreModels.VSCodeSettings;
//   const pathSettingsVScode = path.join(
//     project.location,
//     '.vscode',
//     'settings.json',
//   );
//   if (Helpers.exists(pathSettingsVScode)) {
//     settings = JSON5.parse(Helpers.readFile(pathSettingsVScode));
//   }
//   return settings;
// }

export type RecreateFile = { where: string; from: string; linked?: boolean };

export class FilesRecreator extends BaseFeatureForProject<Project> {
  public async recreateSimpleFiles(initOptions: InitOptions) {
    Helpers.log(`recreation init of ${chalk.bold(this.project.genericName)}`);
    if (this.project.typeIs('container')) {
      this.gitignore();
      this.handleProjectSpecyficFiles();
      if (this.project.__isSmartContainer) {
        Helpers.writeFile(
          [this.project.location, 'angular.json'],
          this.angularJsonContainer,
        );
      }
      return;
    }

    if (
      this.project.__frameworkVersionAtLeast('v3') &&
      this.project.typeIs('isomorphic-lib') &&
      !this.project?.parent?.__isSmartContainer
    ) {
      await this.project.__insideStructure.recrate(initOptions);
    }

    this.handleProjectSpecyficFiles();
    this.commonFiles();

    this.gitignore();
    this.npmignore();
    Helpers.log('recreation end');
  }

  initVscode() {
    this.vscode.settings.hideOrShowFilesInVscode(true);
  }

  /**
   * dummy angular.json file for scss generation
   */
  get angularJsonContainer() {
    return {
      $schema: './node_modules/@angular/cli/lib/config/schema.json',
      version: 1,
      newProjectRoot: 'projects',
      projects: {
        'sassy-project': {
          projectType: 'application',
          schematics: {
            '@schematics/angular:component': {
              style: 'scss',
            },
            '@schematics/angular:application': {
              strict: true,
            },
          },
          root: '',
          sourceRoot: 'src',
          prefix: 'app',
          architect: {
            build: {
              builder: '@angular-devkit/build-angular:browser',
              options: {
                outputPath: 'dist/sassy-project',
                index: 'src/index.html',
                main: 'src/main.ts',
                polyfills: 'src/polyfills.ts',
                tsConfig: 'tsconfig.app.json',
                inlineStyleLanguage: 'scss',
                assets: ['src/favicon.ico', 'src/assets'],
                styles: ['src/styles.scss'],
                scripts: [],
              },
              configurations: {
                production: {
                  budgets: [
                    {
                      type: 'initial',
                      maximumWarning: '500kb',
                      maximumError: '1mb',
                    },
                    {
                      type: 'anyComponentStyle',
                      maximumWarning: '2kb',
                      maximumError: '4kb',
                    },
                  ],
                  fileReplacements: [
                    {
                      replace: 'src/environments/environment.ts',
                      with: 'src/environments/environment.prod.ts',
                    },
                  ],
                  outputHashing: 'all',
                },
                development: {
                  buildOptimizer: false,
                  optimization: false,
                  vendorChunk: true,
                  extractLicenses: false,
                  sourceMap: true,
                  namedChunks: true,
                },
              },
              defaultConfiguration: 'production',
            },
            serve: {
              builder: '@angular-devkit/build-angular:dev-server',
              configurations: {
                production: {
                  browserTarget: 'sassy-project:build:production',
                },
                development: {
                  browserTarget: 'sassy-project:build:development',
                },
              },
              defaultConfiguration: 'development',
            },
            'extract-i18n': {
              builder: '@angular-devkit/build-angular:extract-i18n',
              options: {
                browserTarget: 'sassy-project:build',
              },
            },
            // "test": {
            //   "builder": "@angular-devkit/build-angular:karma",
            //   "options": {
            //     "main": "src/test.ts",
            //     "polyfills": "src/polyfills.ts",
            //     "tsConfig": "tsconfig.spec.json",
            //     "karmaConfig": "karma.conf.js",
            //     "inlineStyleLanguage": "scss",
            //     "assets": [
            //       "src/favicon.ico",
            //       "src/assets"
            //     ],
            //     "styles": [
            //       "src/styles.scss"
            //     ],
            //     "scripts": []
            //   }
            // }
          },
        },
      },
      defaultProject: 'sassy-project',
    };
  }

  get filesIgnoredBy() {
    const self = this;
    return {
      get vscodeSidebarFilesView() {
        // const siteFiles = ['src', 'components'];
        return self.filesIgnoredBy.gitignore
          .concat([
            '.gitignore',
            '.npmignore',
            '.babelrc',
            '.npmrc',
            ...Object.keys(self.project.lintFiles),
            config.file.devDependencies_json,
            ...// TODO or taon json
            (Helpers.exists(self.project.pathFor(config.file.taon_jsonc))
              ? [config.file.package_json]
              : []),
            // 'docs',
            'logo.svg',
            // ...(self.project.isWorkspace ? self.project.children.map(c => c.name) : [])
          ])
          .map(f => (f.startsWith('/') ? f.slice(1) : f))
          .map(f => `**/${f}`);
        // .filter(f => {
        //   // console.log('f',siteFiles)
        //   if (self.project.isSiteInStrictMode && siteFiles.includes(f)) {
        //     return false
        //   }
        //   return true;
        // })
      },
      get gitignore() {
        const gitignoreFiles = [
          // for sure ingored
          config.folder.node_modules,
          'tmp*',
          'dist*',
          'bundle*',
          'browser',
          'browser*',
          'websql',
          'websql*',
          'module*',
          'backup',
          'module',
          'www',
        ]
          .concat(
            [
              // common small files
              'Thumbs.db',
              '.DS_Store',
              '**/.DS_Store',
              'npm-debug.log*',
            ]
              .concat([
                // not sure if ignored/needed
                '.sass-cache',
                '.sourcemaps',
              ])
              .concat(
                self.project
                  .__filesTemplates()
                  .map(f => f.replace('.filetemplate', '')),
              )
              .concat(
                self.project.__linkedFolders
                  .map(l => l.to?.replace(/^\.\//, ''))
                  .filter(f => !!f),
              ),
          )
          .concat(
            // core files of projects types
            self.project.__isCoreProject
              ? []
              : self.project
                  .__projectSpecyficFiles()
                  .filter(relativeFilePath => {
                    return !self.project
                      .__recreateIfNotExists()
                      .includes(relativeFilePath);
                  }),
          )
          .concat(
            // core files of projects types
            !self.project.__isCoreProject
              ? []
              : [config.folder.src, config.folder.components].map(
                  f => `${f}-for-stanalone`,
                ),
          )
          .concat(
            !self.project.__isStandaloneProject && !self.project.__isCoreProject
              ? self.project.__projectSpecyficFiles()
              : [],
          )
          .concat(self.project.__isTnp ? ['projects/tmp*'] : [])
          .concat(['tsconfig.backend.dist.json']);
        // .concat(self.project.isContainer ? [
        //   ...(self.project.children.filter(c => c.git.isInsideGitRepo).map(c => c.name))
        // ] : []);

        // console.log('self.project:', self.project.name);
        // console.log(gitignoreFiles)
        return gitignoreFiles.map(f => `/${crossPlatformPath(f)}`);
      },
      get npmignore() {
        const allowedProject: CoreModels.LibType[] = ['isomorphic-lib'];
        // const canBeUseAsNpmPackage = self.project.typeIs(...allowedProject);
        const npmignoreFiles = [
          '.vscode',
          '/dist',
          '/src',
          '/app',
          '/source',
          '/docs',
          '/preview',
          '/tests',
          'tsconfig.json',
          'npm-debug.log*',
        ];

        return npmignoreFiles.map(f => crossPlatformPath(f));
      },
    };
  }

  public modifyVscode(
    modifyFN: (
      settings: CoreModels.VSCodeSettings,
      project?: Project,
    ) => CoreModels.VSCodeSettings,
  ) {
    const pathSettingsVScode = path.join(
      this.project.location,
      '.vscode',
      'settings.json',
    );

    Helpers.log('[modifyVscode] setting things...');
    if (Helpers.exists(pathSettingsVScode)) {
      try {
        Helpers.log('parsing 1 ...');
        let settings: CoreModels.VSCodeSettings = JSON5.parse(
          Helpers.readFile(pathSettingsVScode),
        );
        settings = modifyFN(settings, this.project);
        Helpers.writeFile(pathSettingsVScode, settings);
      } catch (e) {
        Helpers.log(e);
      }
    } else {
      try {
        Helpers.log('parsing 2...');
        const settingFromCore = path.join(
          Project.by(this.project.type).location,
          '.vscode',
          'settings.json',
        );
        Helpers.mkdirp(path.dirname(pathSettingsVScode));
        if (Helpers.exists(settingFromCore)) {
          var settings: CoreModels.VSCodeSettings = JSON5.parse(
            Helpers.readFile(settingFromCore),
          );
          settings = modifyFN(settings, this.project);
          Helpers.writeFile(pathSettingsVScode, settings);
        }
      } catch (e) {
        Helpers.log(e);
      }
    }
  }

  get vscode() {
    const self = this;
    return {
      get settings() {
        return {
          toogleHideOrShowDeps() {
            let action: 'hide' | 'show' | 'nothing';
            self.modifyVscode(settings => {
              settings['search.useIgnoreFiles'] = false;
              settings['search.include'] = ['**/src/**'];
              settings['search.exclude'] = {
                bin: true,
                local_release: true,
                node_modules: true,
                '.build': true,
                '.vscode': true,
                browser: true,
                dist: true,
                'package-lock.json': true,
              };

              frameworkBuildFolders.forEach(f => {
                settings['search.exclude'][f] = true;
              });

              Object.keys(settings['search.exclude']).forEach(k => {
                settings['search.exclude'][`**/${k}`] = true;
              });

              settings['search.exclude']['projects'] = true;

              if (!settings['files.exclude']) {
                settings['files.exclude'] = {};
              }
              if (Object.keys(settings['files.exclude']).length === 0) {
                action = 'show';
              } else {
                action = 'hide';
              }
              return settings;
            });
            if (action === 'hide') {
              Helpers.log(`Auto hiding while init`);
              self.vscode.settings.hideOrShowFilesInVscode(true);
            }
            if (action === 'show') {
              Helpers.log(`Auto showing while init`);
              self.vscode.settings.hideOrShowFilesInVscode(false);
            }
          },
          gitReset() {
            try {
              self.project
                .run('git checkout HEAD -- .vscode/settings.json')
                .sync();
            } catch (e) {}
          },
          changeColorTheme(white = true) {
            self.modifyVscode(settings => {
              settings['workbench.colorTheme'] = white
                ? 'Default Light+'
                : 'Kimbie Dark';
              return settings;
            });
          },
          hideOrShowFilesInVscode(hide: boolean = true) {
            self.modifyVscode(settings => {
              settings['files.exclude'] = {};

              const getSettingsFor = (project: Project, s = {}) => {
                s['files.exclude'] = {};

                s['files.exclude'][`**/*____ORIGINAL____.ts`] = true;
                s['files.exclude'][`_changelog`] = true;

                // s['files.exclude']['tsconfig.backend.dist.json'] = true;
                // s['files.exclude']['tsconfig.backend.dist.json.filetemplate'] =
                //   true;

                if (project.__isVscodeExtension) {
                  s['files.exclude']['out'] = true;
                  s['files.exclude']['update-proj.js'] = true;
                  s['files.exclude']['.vscodeignore'] = true;
                  s['files.exclude']['*.vsix'] = true;
                }
                if (project.__isTnp) {
                  project.__node_modules.fixesForNodeModulesPackages.forEach(
                    p => {
                      s['files.exclude'][p] = true;
                    },
                  );
                  // s['files.exclude']["*.js"] = true;
                  // s['files.exclude']["environment.js"] = false;
                  s['files.exclude']['*.sh'] = true;
                  s['files.exclude']['*.xlsx'] = true;
                  s['files.exclude']['scripts'] = true;
                  // s['files.exclude']["bin"] = true;
                }
                project.__projectLinkedFiles().forEach(({ relativePath }) => {
                  s['files.exclude'][relativePath] = true;
                }),
                  [...self.filesIgnoredBy.vscodeSidebarFilesView].map(f => {
                    s['files.exclude'][f] = true;
                  });
                if (!project.__isCoreProject) {
                  if (config.frameworkName !== 'tnp') {
                    for (const element of frameworkBuildFolders) {
                      s['files.exclude'][element] = true;
                    }
                  }
                  s['files.exclude']['**/*.filetemplate'] = true;
                  s['files.exclude']['**/tsconfig.*'] = true;
                  s['files.exclude']['**/tslint.*'] = true;
                  // s['files.exclude']['**/index.*'] = true;
                  s['files.exclude']['**/recent.json'] = true;
                  s['files.exclude']['**/angular.json'] = true;
                  s['files.exclude']['**/webpack*'] = true;
                  s['files.exclude']['**/run-*'] = true;
                  s['files.exclude']['**/run.*'] = true;
                  s['files.exclude']['**/package-lock.json'] = true;
                  s['files.exclude']['**/protractor.conf.js'] = true;
                  s['files.exclude']['**/karma.conf.js'] = true;
                  s['files.exclude']['**/.editorconfig'] = true;
                  s['files.exclude'][`**/${project.docs.docsConfigSchema}`] =
                    true;
                  Object.keys(project.lintFiles).forEach(f => {
                    s['files.exclude'][`**/${f}`] = true;
                  });
                  project.__vscodeFileTemplates.forEach(f => {
                    s['files.exclude'][f.replace('.filetemplate', '')] = false;
                  });


                  ['index.js', 'index.d.ts', 'index.js.map'].forEach(
                    indexFile => {
                      s['files.exclude'][`**/${indexFile}`] = true;
                    },
                  );
                }
                return s;
              };

              if (hide) {
                settings = getSettingsFor(self.project, settings) as any;
                if (self.project.__isContainer) {
                  settings['files.exclude'][`recent.json`] = true;
                  settings['files.exclude'][`angular.json`] = true;
                  // settings['files.exclude'][`src/lib`] = true;

                  // self.project.children.forEach(c => {
                  //   const childernSettings = getSettingsFor(c);
                  //   Object.keys(childernSettings['files.exclude']).forEach(
                  //     k => {
                  //       settings['files.exclude'][`${c.name}/${k}`] =
                  //         childernSettings['files.exclude'][k];
                  //     },
                  //   );
                  //   settings['files.exclude'][`${c.name}/tsconfig*`] = true;
                  //   settings['files.exclude'][`${c.name}/webpack*`] = true;
                  //   settings['files.exclude'][`${c.name}/index*`] = true;
                  //   settings['files.exclude'][`${c.name}/run.js`] = true;
                  //   settings['files.exclude'][`${c.name}/run-org.js`] = true;

                  //   settings['files.exclude'][`${c.name}/src/index.ts`] = true;
                  //   settings['files.exclude'][`${c.name}/.vscode`] = true;
                  //   // settings['files.exclude'][`${c.name}/${config.file.package_json__tnp_json5}`] = true;
                  //   settings['files.exclude'][
                  //     `${c.name}/${config.file.package_json}`
                  //   ] = true;
                  //   // settings['files.exclude'][`${c.name}/src/lib`] = true;
                  //   // settings['files.exclude'][`${c.name}/README.md`] = true;
                  //   settings['files.exclude'][`${c.name}/karma.conf.js*`] =
                  //     true;
                  //   settings['files.exclude'][`${c.name}/protractor.conf.js*`] =
                  //     true;
                  //   c.__filesTemplates().forEach(t => {
                  //     settings['files.exclude'][`${c.name}/${t}`] = true;
                  //     settings['files.exclude'][
                  //       `${c.name}/${t.replace('.filetemplate', '')}`
                  //     ] = true;
                  //   });
                  // });
                }
              }
              // settings['files.exclude'][config.folder.tmpTestsEnvironments] = false;

              // QUICK FIX FOR BROWSER
              delete settings['files.exclude']['**/browser*'];
              delete settings['files.exclude']['**/bundle*'];

              return settings;
            });
          },
        };
      },
    };
  }

  npmignore() {
    Helpers.writeFile(
      path.join(this.project.location, '.npmignore'),
      this.filesIgnoredBy.npmignore.join('\n').concat('\n'),
    );
  }

  gitignore() {
    const coreFiles = !this.project.__isCoreProject
      ? []
      : this.project
          .__projectLinkedFiles()
          .map(({ relativePath }) => {
            return `/${relativePath}`;
          })
          .join('\n');

    const ignoredByGit = this.filesIgnoredBy.gitignore
      .filter(f => !f.startsWith('/tsconfig'))
      .filter(f => {
        if (this.project.__isCoreProject && f.endsWith('.filetemplate')) {
          return false;
        }
        return true;
      })
      .join('\n')
      .concat('\n');
    // console.log(ignoredByGit)
    const linkeProjectPrefix =
      this.project.linkedProjects.getLinkedProjectsConfig().prefix;
    const patternsToIgnore =
      `# profiling files
chrome-profiler-events*.json
speed-measure-plugin*.json

# misc
/.sass-cache
/**/tmp-*
/connect.lock
/coverage
/libpeerconnection.log
npm-debug.log
yarn-error.log
testem.log
/typings
app.hosts.ts
${frameworkBuildFolders
  .filter(c => !!c)
  .map(c => `/${c}`)
  .join('\n')}
/${this.project.docs.docsConfigSchema}
/**/*._auto-generated_.ts
/**/BUILD-INFO.md
${this.project.__linkedRepos.git.ignored()}
${this.project.__isStandaloneProject ? `/${config.folder.testsEnvironments}` : ''}
/src/lib/lib-info.md
/src/migrations/migrations-info.md
/src/tests/mocha-tests-info.md
/src/assets/shared/shared_folder_info.txt

# System Files
.DS_Store
Thumbs.db
${this.project.__isVscodeExtension ? '/*.vsix' : ''}
${this.project.__isVscodeExtension ? '/out' : ''}
` +
      ignoredByGit +
      `
${this.project.__isTnp || this.project.__isVscodeExtension ? '!tsconfig*' : ''}
${this.project.__isTnp ? 'webpack.*' : ''}
${
  this.project.linkedProjects.linkedProjects.length > 0 ||
  !!this.project.linkedProjects.linkedProjectsPrefix
    ? `
# container/workspace git projects
# PREFIX
${linkeProjectPrefix ? `/${linkeProjectPrefix}*` : ''}
# LINKED PROJECTS
${
  this.project.isMonorepo
    ? []
    : this.project.linkedProjects.linkedProjects
        .map(f => f.relativeClonePath)
        .map(c => `/${crossPlatformPath(c)}`)
        .join('\n')
}
`
    : []
}
# =====================
!taon.jsonc
${this.project.__isCoreProject ? '!*.filetemplate' : '*.filetemplate'}
${this.project.__isDocker ? '!Dockerfile.filetemplate' : ''}
${this.project.__isSmartContainer ? '/angular.json' : ''}
${this.project.__isVscodeExtension ? '' : coreFiles}
${this.project.__isCoreProject ? '' : '/.vscode/launch.json'}
/*.sqlite
/*.rest

  `.trim() +
      '\n';

    Helpers.writeFile(
      path.join(this.project.location, '.gitignore'),
      patternsToIgnore,
    );
    // console.log({ patternsToIgnore })
    // Helpers.logInfo(`Updated .gitignore file for ${this.project.genericName}`);
  }

  handleProjectSpecyficFiles() {
    const linkedFolder = this.project.__linkedFolders;
    linkedFolder.forEach(c => {
      const from = crossPlatformPath(
        path.resolve(path.join(this.project.location, c.from)),
      );
      const to = crossPlatformPath(
        path.resolve(path.join(this.project.location, c.to)),
      );
      if (Helpers.exists(from) && to.search(this.project.location) !== -1) {
        Helpers.removeIfExists(to);
        Helpers.createSymLink(from, to);
        Helpers.info(
          `Linked folder ${path.basename(from)} to ./${to.replace(this.project.location, '')}`,
        );
      } else {
        Helpers.warn(`Not able to link folders:
        from: ${from}
        to: ${to}

        `);
      }
    });

    let defaultProjectProptotype: Project;

    defaultProjectProptotype = Project.by(
      this.project.type,
      this.project.__frameworkVersion,
    ) as Project;

    const files: RecreateFile[] = [];

    if (
      crossPlatformPath(this.project.location) ===
      crossPlatformPath(defaultProjectProptotype?.location)
    ) {
      Helpers.info(
        `LINKING CORE PROJECT ${this.project.name} ${this.project.type} ${this.project.__frameworkVersion}`,
      );
      if (
        this.project.__frameworkVersionAtLeast('v3') &&
        this.project.typeIsNot('isomorphic-lib')
      ) {
        // nothing
      } else {
        const toLink = defaultProjectProptotype.__projectLinkedFiles();
        toLink.forEach(c => {
          Helpers.info(
            `[LINKING] ${c.relativePath} from ${c.sourceProject.location}  `,
          );
          Helpers.createSymLink(
            path.join(c.sourceProject.location, c.relativePath),
            path.join(this.project.location, c.relativePath),
          );
        });
      }
    } else if (defaultProjectProptotype) {
      const projectSpecyficFilesLinked =
        this.project.__projectSpecyficFilesLinked();
      const projectSpecyficFiles = this.project.__projectSpecyficFiles();
      // console.log({
      //   projectSpecyficFiles,
      //   project: this.project.genericName
      // })
      projectSpecyficFiles.forEach(relativeFilePath => {
        relativeFilePath = crossPlatformPath(relativeFilePath);
        let from = crossPlatformPath(
          path.join(defaultProjectProptotype.location, relativeFilePath),
        );

        if (!Helpers.exists(from)) {
          const linked = defaultProjectProptotype
            .__projectLinkedFiles()
            .find(a => a.relativePath === relativeFilePath);
          if (linked) {
            Helpers.warn(`[taon] FIXING LINKED projects`);
            Helpers.createSymLink(
              path.join(linked.sourceProject.location, linked.relativePath),
              path.join(defaultProjectProptotype.location, relativeFilePath),
            );
          } else if (defaultProjectProptotype.__frameworkVersionAtLeast('v2')) {
            const core = Project.by(
              defaultProjectProptotype.type,
              defaultProjectProptotype.__frameworkVersionMinusOne,
            );
            from = crossPlatformPath(
              path.join(core.location, relativeFilePath),
            );
          }
        }

        const where = crossPlatformPath(
          path.join(this.project.location, relativeFilePath),
        );

        if (
          this.project.__recreateIfNotExists().includes(relativeFilePath) &&
          Helpers.exists(where)
        ) {
          return;
        }

        files.push({
          linked: projectSpecyficFilesLinked.includes(relativeFilePath),
          from,
          where,
        });
      });
      files.forEach(file => {
        if (file.linked) {
          Helpers.info(`Linking: ${file.from}`);
          Helpers.removeFileIfExists(file.where);
          Helpers.createSymLink(file.from, file.where, {
            continueWhenExistedFolderDoesntExists: true,
          });
        } else {
          Helpers.copyFile(file.from, file.where);
        }
      });
    }
  }

  commonFiles() {
    const wokrspace = Project.by('container', this.project.__frameworkVersion);

    const files = [];
    files
      .map(file => {
        return {
          from: path.join(wokrspace.location, file),
          where: path.join(this.project.location, file),
        };
      })
      .forEach(file => {
        Helpers.copyFile(file.from, file.where);
      });
  }
}

//#endregion
