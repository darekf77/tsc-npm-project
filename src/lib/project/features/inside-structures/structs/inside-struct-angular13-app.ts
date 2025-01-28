//#region imports
import { crossPlatformPath, path, _, CoreModels } from 'tnp-core/src';
import { Helpers } from 'tnp-helpers/src';
import { Project } from '../../../abstract/project';
import { InsideStruct } from '../inside-struct';
import { BaseInsideStruct } from './base-inside-struct';
import { resolvePathToAsset as transformConfigLoaderPathToAssets } from './inside-struct-helpers';
import { config } from 'tnp-config/src';
import { getLoader } from './loaders/loaders';
import { imageLoader as getImageLoaderHtml } from './loaders/image-loader';
import { Models } from '../../../../models';
import { InitOptions } from '../../../../options';
//#endregion

export class InsideStructAngular13App extends BaseInsideStruct {
  constructor(project: Project, initOptions: InitOptions) {
    super(project, initOptions);
    //#region @backend
    if (
      !project.__frameworkVersionAtLeast('v4') ||
      project.typeIsNot('isomorphic-lib')
    ) {
      return;
    }
    const tmpProjectsStandalone = `tmp-apps-for-${config.folder.dist}${this.websql ? '-websql' : ''}/${project.name}`;

    const result = InsideStruct.from({
      relateivePathesFromContainer: [
        //#region releative pathes from core project
        'app/src/app/app.component.html',
        'app/src/app/app.component.scss',
        // 'app/src/app/app.component.spec.ts', -> something better needed
        'app/src/app/app.component.ts',
        // 'app/src/app/app.module.ts',
        'app/src/environments/environment.prod.ts',
        'app/src/environments/environment.ts',
        'app/src/app',
        'app/src/environments',
        'app/src/favicon.ico',
        'app/src/index.html',
        'app/src/main.ts',
        'app/src/polyfills.ts',
        'app/src/styles.scss',
        'app/src/jestGlobalMocks.ts',
        'app/src/setupJest.ts',
        // 'app/src/test.ts',  // node needed for jest test - (but the don' work wit symlinks)
        'app/src/manifest.webmanifest',
        'app/ngsw-config.json',
        'app/.browserslistrc',
        'app/.editorconfig',
        'app/.gitignore',
        // 'app/README.md',
        'app/angular.json',
        'app/jest.config.js',
        'app/electron-builder.json',
        'app/angular.webpack.js',
        'app/electron/main.js',
        'app/electron/package.json',
        'app/karma.conf.js',
        'app/package-lock.json',
        'app/package.json',
        'app/tsconfig.app.json',
        'app/tsconfig.json',
        'app/tsconfig.spec.json',
        //#endregion
      ],
      projectType: project.type,
      frameworkVersion: project.__frameworkVersion,
      pathReplacements: [
        [
          'app/',
          () => {
            return `${tmpProjectsStandalone}/`;
          },
        ],
      ],
      linkNodeModulesTo: ['app/'],
      linksFuncs: [
        //#region what and where needs to linked
        [
          opt => {
            const standalonePath = `tmp-src-app-${config.folder.dist}${this.websql ? '-websql' : ''}`;
            if (this.project.__isSmartContainerTarget) {
              const targetProj =
                this.project.__smartContainerTargetParentContainer
                  .__smartContainerBuildTarget;
              if (targetProj.name !== this.project.name) {
                return `../${targetProj.name}/${standalonePath}/-/${this.project.name}`;
              }
            }
            return standalonePath;
          },
          opt => {
            const standalonePath = `app/src/app/${this.project.name}`;
            if (this.project.__isSmartContainerTarget) {
              const targetProj =
                this.project.__smartContainerTargetParentContainer
                  .__smartContainerBuildTarget;
              if (targetProj.name !== this.project.name) {
                return `${standalonePath}/app`;
              }
            }
            return standalonePath;
          },
        ],
        //#endregion

        //#region link not containter target clients
        [
          opt => {
            const standalonePath = `tmp-src-${config.folder.dist}${this.websql ? '-websql' : ''}`;
            if (this.project.__isSmartContainerTarget) {
              const targetProj =
                this.project.__smartContainerTargetParentContainer
                  .__smartContainerBuildTarget;
              if (targetProj.name !== this.project.name) {
                // console.log(`assets  ${targetProj.name} vs ${client?.name}`)
                return `../${targetProj.name}/${standalonePath}/assets`;
              }
            }
            return '';
          },
          opt => {
            if (this.project.__isSmartContainerTarget) {
              const targetProj =
                this.project.__smartContainerTargetParentContainer
                  .__smartContainerBuildTarget;
              if (targetProj.name !== this.project.name) {
                return `app/src/assets`;
              }
            }
            return '';
          },
        ],
        //#endregion

        //#region link not containter target clients - whole dist
        [
          opt => {
            if (this.project.__isSmartContainerTarget) {
              const targetProj =
                this.project.__smartContainerTargetParentContainer
                  .__smartContainerBuildTarget;
              if (targetProj.name !== this.project.name) {
                return `../${targetProj.name}/${config.folder.dist}`;
              }
            }
            return '';
          },
          opt => {
            if (this.project.__isSmartContainerTarget) {
              const targetProj =
                this.project.__smartContainerTargetParentContainer
                  .__smartContainerBuildTarget;
              if (targetProj.name !== this.project.name) {
                return `${config.folder.dist}/compiled`;
              }
            }
            return '';
          },
        ],
        //#endregion
      ],
      endAction: async ({ replacement }) => {
        //#region action after recreating/updating inside strcut

        //#region replace app.module.ts
        (() => {
          const appModuleFilePath = path.join(
            project.location,
            replacement(tmpProjectsStandalone),
            `/src/app/app.module.ts`,
          );

          let appModuleFile = Helpers.readFile(appModuleFilePath);

          const moduleName = _.upperFirst(_.camelCase(project.name)) + 'Module';
          appModuleFile = `
import { ${moduleName} } from './${this.project.name}/app';
${appModuleFile}
`;
          appModuleFile = appModuleFile.replace(
            '//<<<TO_REPLACE_MODULE>>>',
            `${moduleName},`,
          );

          const enableServiceWorker =
            this.project.isInCiReleaseProject &&
            !initOptions.disableServiceWorker;

          if (enableServiceWorker) {
            // TODO it will colide with ng serve ?
            appModuleFile = appModuleFile.replace(
              new RegExp(
                Helpers.escapeStringForRegEx('//distReleaseOnly'),
                'g',
              ),
              '',
            );
          }

          Helpers.writeFile(appModuleFilePath, appModuleFile);
        })();
        //#endregion

        //#region replace app.component.ts
        (() => {
          const appComponentFilePath = path.join(
            project.location,
            replacement(tmpProjectsStandalone),
            `/src/app/app.component.ts`,
          );

          let appComponentFile = Helpers.readFile(appComponentFilePath);

          appComponentFile = appComponentFile.replace(
            `import { Taon } from 'taon/src';`,
            `import { Taon } from 'taon/${this.websql ? config.folder.websql : config.folder.browser}/src';`,
          );

          appComponentFile = appComponentFile.replace(
            `from 'taon/src';`,
            `from 'taon/${this.websql ? config.folder.websql : config.folder.browser}/src';`,
          );

          appComponentFile = appComponentFile.replace(
            `import start from './---projectname---/app';`,
            `import start from './${this.project.name}/app';`,
          );

          const componentName =
            _.upperFirst(_.camelCase(project.name)) + 'Component';
          appComponentFile = `
import { ${componentName} } from './${this.project.name}/app';
${appComponentFile}
`;

          appComponentFile = appComponentFile.replace(
            `'<<<TO_REPLACE_COMPONENT>>>'`,
            `${componentName}`,
          );

          Helpers.writeFile(appComponentFilePath, appComponentFile);
        })();
        //#endregion

        //#region replace app.module.ts
        (() => {
          const appComponentFilePath = path.join(
            project.location,
            replacement(tmpProjectsStandalone),
            `/src/app/app.module.ts`,
          );

          let appModuleFile = Helpers.readFile(appComponentFilePath);

          appModuleFile = appModuleFile.replace(
            `import { TaonAdminModeConfigurationModule } from 'taon/src';`,
            `import { TaonAdminModeConfigurationModule } from 'taon/${this.websql ? config.folder.websql : config.folder.browser}/src';`,
          );

          Helpers.writeFile(appComponentFilePath, appModuleFile);
        })();
        //#endregion

        //#region replace main.ts websql things
        (() => {
          const appMainFilePath = path.join(
            project.location,
            replacement(tmpProjectsStandalone),
            `/src/main.ts`,
          );

          let appMainFile = Helpers.readFile(appMainFilePath);

          if (!this.websql) {
            appMainFile = appMainFile.replace(
              `require('sql.js');`,
              `(arg: any) => {
                console.error('This should not be available in non-sql mode');
                return void 0;
              };`,
            );
          }

          appMainFile = appMainFile.replace(
            `import { Helpers } from 'tnp-core/src';`,
            `import { Helpers } from 'tnp-core/${this.websql ? config.folder.websql : config.folder.browser}/src';`,
          );

          appMainFile = appMainFile.replace(
            `import { TaonAdmin } from 'taon/src';`,
            `import { TaonAdmin } from 'taon/${this.websql ? config.folder.websql : config.folder.browser}/src';`,
          );

          appMainFile = appMainFile.replace(
            `import { Stor } from 'taon-storage/src';`,
            `import { Stor } from 'taon-storage/${this.websql ? config.folder.websql : config.folder.browser}/src';`,
          );

          Helpers.writeFile(appMainFilePath, appMainFile);
        })();
        //#endregion

        //#region LOADERS & BACKGROUNDS REPLACEMENT
        (() => {
          const frontendBaseHref =
            this.project.angularFeBasenameManager.getBaseHref(this.initOptions);

          //#region LOADERS & BACKGROUNDS REPLACEMENT / replace app.component.html loader
          (() => {
            const appModuleHtmlPath = path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/src/app/app.component.html`,
            );

            let appHtmlFile = Helpers.readFile(appModuleHtmlPath);

            const loaderData =
              this.project.__env.config?.loading?.afterAngularBootstrap?.loader;
            const loaderIsImage = _.isString(loaderData);

            if (loaderIsImage) {
              const pathToAsset =
                frontendBaseHref +
                transformConfigLoaderPathToAssets(this.project, loaderData);

              appHtmlFile = appHtmlFile.replace(
                '<!-- <<<TO_REPLACE_LOADER>>> -->',
                getImageLoaderHtml(pathToAsset, false),
              );
            } else {
              const loaderToReplace = getLoader(
                loaderData?.name as any,
                loaderData?.color,
                false,
              );
              appHtmlFile = appHtmlFile.replace(
                '<!-- <<<TO_REPLACE_LOADER>>> -->',
                loaderToReplace,
              );
            }

            Helpers.writeFile(appModuleHtmlPath, appHtmlFile);
          })();
          //#endregion

          //#region LOADERS & BACKGROUNDS REPLACEMENT / replace app.component.ts body  background color
          (() => {
            const appModuleFilePath = path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/src/app/app.component.ts`,
            );

            let appScssFile = Helpers.readFile(appModuleFilePath);

            const bgColor =
              this.project.__env.config?.loading?.afterAngularBootstrap
                ?.background;
            if (bgColor) {
              appScssFile = appScssFile.replace(
                'TAON_TO_REPLACE_COLOR',
                bgColor,
              );
            }
            Helpers.writeFile(appModuleFilePath, appScssFile);
          })();
          //#endregion

          //#region LOADERS & BACKGROUNDS REPLACEMENT / replace index.html body background color & loader
          (() => {
            const appModuleFilePath = path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/src/index.html`,
            );

            let indexHtmlFile = Helpers.readFile(appModuleFilePath);

            const loaderData =
              this.project.__env.config?.loading?.preAngularBootstrap?.loader;
            const loaderIsImage = _.isString(loaderData);

            if (loaderIsImage) {
              const pathToAsset =
                frontendBaseHref +
                transformConfigLoaderPathToAssets(this.project, loaderData);

              indexHtmlFile = indexHtmlFile.replace(
                '<!-- <<<TO_REPLACE_LOADER>>> -->',
                getImageLoaderHtml(pathToAsset, true),
              );
            } else {
              const loaderToReplace = getLoader(
                loaderData?.name as any,
                loaderData?.color,
                true,
              );
              indexHtmlFile = indexHtmlFile.replace(
                '<!-- <<<TO_REPLACE_LOADER>>> -->',
                loaderToReplace,
              );
            }

            const bgColor =
              this.project.__env.config?.loading?.preAngularBootstrap
                ?.background;
            const bgColorStyle = bgColor
              ? `style="background-color: ${bgColor};"`
              : '';
            indexHtmlFile = indexHtmlFile.replace(
              'TAON_TO_REPLACE_COLOR',
              bgColorStyle,
            );

            Helpers.writeFile(appModuleFilePath, indexHtmlFile);
          })();
          //#endregion
        })();
        //#endregion

        //#region replace app.component.html
        (() => {
          const indexHtmlFilePath = path.join(
            project.location,
            replacement(tmpProjectsStandalone),
            `/src/index.html`,
          );

          let indexHtmlFile = Helpers.readFile(indexHtmlFilePath);

          const title = this.project.__env.config?.title;
          const titleToReplace = title ? title : _.startCase(this.project.name);
          // console.log({
          //   titleToReplace
          // })
          indexHtmlFile = indexHtmlFile.replace(
            '<title>App</title>',
            `<title>${titleToReplace}</title>`,
          );
          Helpers.writeFile(indexHtmlFilePath, indexHtmlFile);
        })();
        //#endregion

        //#region replace main.ts
        (() => {
          const mainFilePath = path.join(
            project.location,
            replacement(tmpProjectsStandalone),
            `/src/main.ts`,
          );
          this.project.angularFeBasenameManager.replaceBaseHrefInFile(
            mainFilePath,
            this.initOptions,
          );
        })();
        //#endregion

        //#region replace style.scss
        (() => {
          const stylesFilePath = path.join(
            project.location,
            replacement(tmpProjectsStandalone),
            `/src/styles.scss`,
          );
          this.project.angularFeBasenameManager.replaceBaseHrefInFile(
            stylesFilePath,
            this.initOptions,
          );
        })();
        //#endregion

        //#region replace favicon.ico
        (() => {
          const faviconPathDest = crossPlatformPath([
            project.location,
            replacement(tmpProjectsStandalone),
            `/src/favicon.ico`,
          ]);

          const source = crossPlatformPath([
            project.location,
            `/src/assets/favicon.ico`,
          ]);

          if (Helpers.exists(source)) {
            Helpers.copyFile(source, faviconPathDest);
          }
        })();
        //#endregion

        //#region link assets
        (() => {
          if (this.project.__isSmartContainerTarget) {
            const targetProj =
              this.project.__smartContainerTargetParentContainer
                .__smartContainerBuildTarget;
            if (targetProj.name !== this.project.name) {
              return;
            }
          }

          const assetsSource = crossPlatformPath(
            path.join(
              project.location,
              replacement(`tmp-src-${config.folder.dist}`),
              config.folder.assets,
            ),
          );

          if (!Helpers.exists(assetsSource)) {
            Helpers.mkdirp(assetsSource);
          }

          const assetsDest = crossPlatformPath(
            path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/src/assets`,
            ),
          );
          Helpers.remove(assetsDest);
          Helpers.createSymLink(assetsSource, assetsDest);
        })();
        //#endregion

        //#region electron
        (() => {
          if (this.project.__isSmartContainerTarget) {
            return;
          }

          const electronBackend = crossPlatformPath(
            path.join(project.location, replacement(config.folder.dist)),
          );

          if (!Helpers.exists(electronBackend)) {
            Helpers.mkdirp(electronBackend);
          }

          const compileTs = crossPlatformPath(
            path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/electron/compiled`,
            ),
          );
          Helpers.remove(compileTs);
          Helpers.createSymLink(electronBackend, compileTs);

          const electronConfigPath = crossPlatformPath(
            path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/electron-builder.json`,
            ),
          );

          const electronConfig = Helpers.readJson(electronConfigPath);
          electronConfig.directories.output = `../../${this.project.__getElectronAppRelativePath({ websql: this.websql })}/`;
          Helpers.writeJson(electronConfigPath, electronConfig);

          Helpers.setValueToJSON(
            crossPlatformPath(
              path.join(
                project.location,
                replacement(tmpProjectsStandalone),
                `/${config.file.package_json}`,
              ),
            ),
            'name',
            this.project.name,
          );

          if (this.project.isInCiReleaseProject) {
            Helpers.setValueToJSON(
              crossPlatformPath(
                path.join(
                  project.location,
                  replacement(tmpProjectsStandalone),
                  `/${config.file.package_json}`,
                ),
              ),
              'main',
              'electron/index.js',
            );
          }

          Helpers.setValueToJSON(
            crossPlatformPath(
              path.join(
                project.location,
                replacement(tmpProjectsStandalone),
                `/${config.file.package_json}`,
              ),
            ),
            'version',
            this.project.version,
          );
        })();
        //#endregion

        //#region rebuild manifest + index.html
        await (async () => {
          const manifestJsonPath = crossPlatformPath(
            path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/src/manifest.webmanifest`,
            ),
          );

          const indexHtmlPath = crossPlatformPath(
            path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/src/index.html`,
            ),
          );

          const manifestJson: CoreModels.PwaManifest = Helpers.readJson(
            manifestJsonPath,
            {},
            true,
          );
          let indexHtml = Helpers.readFile(indexHtmlPath);

          manifestJson.name = this.project.__env.config?.pwa?.name
            ? this.project.__env.config.pwa.name
            : _.startCase(project.name);

          manifestJson.short_name = this.project.__env.config?.pwa?.short_name
            ? this.project.__env.config.pwa.short_name
            : project.name;

          const assetsPath = crossPlatformPath(
            path.join(
              project.location,
              config.folder.src,
              config.folder.assets,
            ),
          );

          if (this.project.__branding.exist) {
            //#region apply pwa generated icons
            manifestJson.icons = this.project.__branding.iconsToAdd;
            //#endregion
            indexHtml = indexHtml.replace(
              `<link rel="icon" type="image/x-icon" href="favicon.ico">`,
              '',
            );
            indexHtml = indexHtml.replace(
              this.project.__branding.htmlIndexRepaceTag,
              this.project.__branding.htmlLinesToAdd.join('\n'),
            );
            indexHtml = indexHtml.replace(
              `<link rel="icon" type="image/x-icon" href="/`,
              `<link rel="icon" type="image/x-icon" href="`,
            );
          } else {
            //#region apply default icons
            const iconsPath = crossPlatformPath(path.join(assetsPath, 'icons'));

            const iconsFilesPathes = Helpers.filesFrom(iconsPath).filter(f => {
              return CoreModels.ImageFileExtensionArr.includes(
                path.extname(f as any).replace('.', '') as any,
              );
            }); // glob.sync(`${iconsPath}/**/*.(png|jpeg|svg)`);

            manifestJson.icons = iconsFilesPathes.map(f => {
              return {
                src: f.replace(`${path.dirname(assetsPath)}/`, ''),
                sizes: _.last(
                  path.basename(f).replace(path.extname(f), '').split('-'),
                ),
                type: `image/${path.extname(f).replace('.', '')}`,
                purpose: 'maskable any',
              };
            });
            //#endregion
          }

          manifestJson.icons = manifestJson.icons.map(c => {
            c.src = c.src.replace(/^\//, '');
            return c;
          });

          if (this.project.__env.config?.pwa?.start_url) {
            manifestJson.start_url = (
              this.project.__env.config as any
            ).pwa.start_url;
          } else if (this.project.__env.config?.useDomain) {
            manifestJson.start_url = `https://${this.project.__env.config.domain}/`;
          } else {
            const smartContainerOrStandalone = this.project
              .__isSmartContainerTarget
              ? this.project.__smartContainerTargetParentContainer
              : this.project;
            manifestJson.start_url = `/${smartContainerOrStandalone.name}/`; // perfect for github.io OR when subdomain myproject.com/docs/
          }

          Helpers.writeJson(manifestJsonPath, manifestJson);
          Helpers.writeFile(indexHtmlPath, indexHtml);
        })();
        //#endregion

        //#region replace base href

        (() => {
          const angularJsonPath = crossPlatformPath(
            path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/angular.json`,
            ),
          );
          Helpers.setValueToJSON(
            angularJsonPath,
            'projects.app.architect.build.options.baseHref',
            this.project.angularFeBasenameManager.getBaseHref(this.initOptions),
          );
        })();
        //#endregion

        //#region inject environment => done throught reading json
        (() => {
          // const indexHtml = crossPlatformPath(path.join(
          //   project.location
          //   ,
          //   (project.isStandaloneProject ? tmpProjectsStandalone : tmpProjects)
          //   ,
          //   `/src/index.html`
          // ));
          // const $ = cheerio.load(Helpers.readFile(indexHtml));
          // $('body').append(`
          // <script>
          // if (global === undefined) {
          //   var global = window;
          // }
          // var ENV = ${JSON.stringify(project.env.config)};
          // window.ENV = ENV;
          // global.ENV = ENV;
          // </script>
          // `);
          // Helpers.writeFile(indexHtml, $.html())
        })();
        //#endregion

        //#region add proper pathes to tsconfig
        (() => {
          const tsconfigJSONpath = crossPlatformPath(
            path.join(
              project.location,
              replacement(tmpProjectsStandalone),
              `/tsconfig.json`,
            ),
          );

          const libsPathes = crossPlatformPath(
            path.join(project.location, `src/libs`),
          );

          const content = Helpers.readJson(tsconfigJSONpath, void 0, true);

          let libs = Helpers.linksToFoldersFrom(libsPathes);
          const parentPath = crossPlatformPath(
            path.resolve(path.join(project.location, '../../..')),
          );

          const parent = Project.ins.From(parentPath) as Project;
          if (
            parent &&
            parent.__isSmartContainer &&
            libs.length > 0 &&
            content.compilerOptions
          ) {
            // console.log('tsconfigJSON', tsconfigJSONpath, content)
            // console.log('libsPathes', libsPathes)
            // console.log(`libs`, libs)
            // console.log(`PARENT PATH: ${parentPath}  `)

            content.compilerOptions.paths = libs.reduce((a, b) => {
              const pathRelative = b
                .replace(parent.location, '')
                .split('/')
                .slice(4)
                .join('/')
                .replace('src/', `src/app/${project.name}/`);
              return _.merge(a, {
                [`@${parent.name}/${path.basename(b)}/${this.websql ? config.folder.websql : config.folder.browser}`]:
                  [`./${pathRelative}`],
                [`@${parent.name}/${path.basename(b)}/${this.websql ? config.folder.websql : config.folder.browser}/*`]:
                  [`./${pathRelative}/*`],
              });
            }, {});
            Helpers.writeJson(tsconfigJSONpath, content);
          }

          // console.info(JSON.stringify(content.compilerOptions, null, 4))
        })();
        //#endregion

        //#endregion
      },
    });

    this.struct = result;
    //#endregion
  }
}
