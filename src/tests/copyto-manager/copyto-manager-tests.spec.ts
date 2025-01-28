// //#region imports
// import { describe } from 'mocha';
// import { expect, use } from 'chai';
// import { fse } from 'tnp-core/src';
// import { path } from 'tnp-core/src';
// import { _ } from 'tnp-core/src';
// import { it } from 'mocha';
// import { SpecWrap } from '../_helpers.spec';
// import { config } from 'tnp-config/src';
// import { Project } from '../../lib/project/abstract/project';
// import { Helpers } from 'tnp-helpers/src';
// import { ProjectIsomorphicLib } from '../../lib/project/abstract/project';
// import { ProjectContainer } from '../../lib/project/abstract/project';
// import { BuildOptions } from '../../lib/options';
// import { PackageJSON } from '../../lib/project/features/package-json/package-json';
// import { dummyfiles } from './copyto-manager-dummy-files';
// import { ProjectUnknowNpm } from '../../lib/project/abstract/project';

// //#endregion

// const wrap = SpecWrap.create();

// describe(
//   wrap.describe(`${config.frameworkName} / copyto manager`),
//   async () => {
//     // THIS IS REQUIRE BECAUSE OF CIRCURAL DEPS ISSUES
//     ({
//       Project,
//       ProjectIsomorphicLib,
//       ProjectContainer,
//       PackageJSON,
//       ProjectUnknowNpm,
//     });

//     //#region test / it should copy files to another project at first run
//     await wrap.it(
//       `should copy files to another project ${config.folder.node_modules}`,
//       async (location, testName) => {
//         it(`${testName} - first copyto`, async () => {
//           const dummyLibProjName = 'my-test-lib';
//           Helpers.remove([location, dummyLibProjName]);
//           const dummy1 = createDummyProj(location, dummyLibProjName);
//           dummy1.writeFile('src/lib/index.ts', dummyfiles.file_src_index_ts());

//           dummy1.writeFile(
//             'dist/lib/index.js',
//             dummyfiles.file_dist_lib_index_js(),
//           );
//           dummy1.writeFile(
//             'dist/lib/index.js.map',
//             dummyfiles.file_dist_lib_index_js_map(),
//           );
//           dummy1.writeFile(
//             'dist/lib/index.d.ts',
//             dummyfiles.file_dist_lib_index_d_ts(),
//           );

//           expect(dummy1).to.be.not.be.undefined;

//           // await dummy1.filesStructure.struct('');

//           const mainProjName = 'my-test-project';
//           Helpers.remove([location, mainProjName]);
//           const mainProject = createDummyProj(location, mainProjName);
//           expect(mainProject).to.be.not.be.undefined;

//           // dummy1.run(`${config.frameworkName} bd --copyto ../${mainProjName}`).sync();
//           // dummy1.run(`${config.frameworkName} bd`).sync();

//           const outDir = 'dist';

//           dummy1.__copyManager.init(
//             BuildOptions.fromJson({
//               copyto: [mainProject],
//               args: '',
//               watch: false,
//               outDir,
//             } as any),
//           );

//           // const localCopyToProjPath = dummy1.__copyManager.localTempProjPath(outDir)
//           // await dummy1.__copyManager.syncAction([]);

//           // expect(Helpers.exists(localCopyToProjPath)).to.be.true;

//           // const copiedProjPath = mainProject.__node_modules.pathFor(dummyLibProjName)

//           // dummy1.copyManager.generateSourceCopyIn(copiedProjPath);
//           expect(Helpers.exists(copiedProjPath)).to.be.true;
//         });
//       },
//     );
//     //#endregion

//     //#region test / it should copy single files to another project node_modules in async action
//     await wrap.it(
//       `should copy single file to another project ${config.folder.node_modules} in async`,
//       async (location, testName) => {
//         it(`${testName} - first copyto`, async () => {
//           const outDir = 'dist';
//           const dummyLibProjName = 'my-test-lib';
//           const relativeFileForChange = `${outDir}/lib/index.js`;

//           Helpers.remove([location, dummyLibProjName]);
//           const dummy1 = createDummyProj(location, dummyLibProjName);
//           dummy1.writeFile('src/lib/index.ts', dummyfiles.file_src_index_ts());

//           dummy1.writeFile(
//             relativeFileForChange,
//             dummyfiles.file_dist_lib_index_js(),
//           );
//           dummy1.writeFile(
//             'dist/lib/index.js.map',
//             dummyfiles.file_dist_lib_index_js_map(),
//           );
//           dummy1.writeFile(
//             'dist/lib/index.d.ts',
//             dummyfiles.file_dist_lib_index_d_ts(),
//           );

//           expect(dummy1).to.be.not.be.undefined;

//           // await dummy1.filesStructure.struct('');

//           const mainProjName = 'my-test-project';
//           Helpers.remove([location, mainProjName]);
//           const mainProject = createDummyProj(location, mainProjName);
//           expect(mainProject).to.be.not.be.undefined;

//           // dummy1.run(`${config.frameworkName} bd --copyto ../${mainProjName}`).sync();
//           // dummy1.run(`${config.frameworkName} bd`).sync();

//           dummy1.__copyManager.init(
//             BuildOptions.fromJson({
//               copyto: [mainProject],
//               args: '',
//               watch: true,
//               outDir,
//             } as any),
//           );

//           await dummy1.__copyManager.syncAction();

//           dummy1.writeFile(
//             relativeFileForChange,
//             dummyfiles.file_dist_lib_index_js_async_change(),
//           );

//           await dummy1.__copyManager.asyncAction({
//             fileAbsolutePath: dummy1.pathFor(relativeFileForChange),
//           } as any);

//           const copiedProjPath =
//             mainProject.__node_modules.pathFor(dummyLibProjName);

//           // dummy1.copyManager.generateSourceCopyIn(copiedProjPath);
//           expect(Helpers.exists(copiedProjPath)).to.be.true;

//           const asyncChangeFilePath = path.join(
//             copiedProjPath,
//             relativeFileForChange.split('/').slice(1).join('/'),
//           );

//           expect(Helpers.exists(asyncChangeFilePath)).to.be.true;

//           expect(Helpers.readFile(asyncChangeFilePath).trim()).to.eq(
//             dummyfiles.file_dist_lib_index_js_async_change().trim(),
//           );
//         });
//       },
//     );
//     //#endregion

//     //#region test / container it should copy files to another project at first run
//     await wrap.it(
//       `should container build copy files to another project ${config.folder.node_modules}`,
//       async (location, testName) => {
//         it(`${testName} - first copyto`, async () => {
//           const dummyContainerName = 'my-dummy-container';
//           Helpers.remove([location, dummyContainerName]);
//           const dummyContainer = createDummyContainer(
//             location,
//             dummyContainerName,
//           );

//           const containerFirstLibProjName = 'my-test-container-lib';
//           const firstContainerLib = createDummyProj(
//             dummyContainer.location,
//             containerFirstLibProjName,
//           );
//           firstContainerLib.writeFile(
//             'src/lib/index.ts',
//             dummyfiles.file_src_index_ts(),
//           );
//           firstContainerLib.writeFile(
//             'dist/lib/index.js',
//             dummyfiles.file_dist_lib_index_js(),
//           );
//           firstContainerLib.writeFile(
//             'dist/lib/index.js.map',
//             dummyfiles.file_dist_lib_index_js_map(),
//           );
//           firstContainerLib.writeFile(
//             'dist/lib/index.d.ts',
//             dummyfiles.file_dist_lib_index_d_ts(),
//           );

//           const dummySecondLibProjName = 'my-second-test-container-lib';
//           const secondContainerLib = createDummyProj(
//             dummyContainer.location,
//             dummySecondLibProjName,
//           );
//           secondContainerLib.writeFile(
//             'src/lib/index.ts',
//             dummyfiles.file_src_index_ts(2),
//           );
//           secondContainerLib.writeFile(
//             'dist/lib/index.js',
//             dummyfiles.file_dist_lib_index_js(2),
//           );
//           secondContainerLib.writeFile(
//             'dist/lib/index.js.map',
//             dummyfiles.file_dist_lib_index_js_map(2),
//           );
//           secondContainerLib.writeFile(
//             'dist/lib/index.d.ts',
//             dummyfiles.file_dist_lib_index_d_ts(2),
//           );

//           // await dummy1.filesStructure.struct('');

//           const mainProjName = 'my-test-project';
//           Helpers.remove([location, mainProjName]);
//           const mainProject = createDummyProj(location, mainProjName);
//           expect(mainProject).to.be.not.be.undefined;

//           // TODO mock this
//           await dummyContainer.execute(
//             `${config.frameworkName} bd ${containerFirstLibProjName}`,
//             {
//               hideOutput: {
//                 stdout: true,
//               },
//             },
//           );
//           // dummy1.run(`${config.frameworkName} bd`).sync();

//           const outDir = 'dist';

//           dummyContainer.__copyManager.init(
//             BuildOptions.fromJson({
//               copyto: [mainProject],
//               args: '',
//               watch: false,
//               outDir,
//             } as any),
//           );

//           // const localCopyToProjPath = dummyContainer.__copyManager.localTempProjPath;
//           // await dummyContainer.__copyManager.syncAction();

//           // expect(Helpers.exists(localCopyToProjPath)).to.be.true;

//           // const copiedProjPath = mainProject.node_modules.pathFor(dummyLibProjName)

//           // // dummy1.copyManager.generateSourceCopyIn(copiedProjPath);
//           // expect(Helpers.exists(copiedProjPath)).to.be.true;
//         });
//       },
//     );
//     //#endregion
//   },
// );

// function createDummyProj(location: string, projName: string): Project {
//   Helpers.mkdirp([location, projName]);
//   Helpers.writeJson([location, projName, config.file.package_json], {
//     name: projName,
//     version: '0.0.0',
//     tnp: {
//       type: 'isomorphic-lib',
//       version: config.defaultFrameworkVersion, // OK
//     },
//   });

//   return Project.ins.From(path.join(location, projName));
// }

// function createDummyContainer(location: string, projName: string): Project {
//   Helpers.mkdirp([location, projName]);
//   Helpers.writeJson([location, projName, config.file.package_json], {
//     name: projName,
//     version: '0.0.0',
//     tnp: {
//       type: 'container',
//       smart: true,
//       version: config.defaultFrameworkVersion, // OK
//     },
//   });

//   return Project.ins.From(path.join(location, projName));
// }
