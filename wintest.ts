import { path } from 'tnp-core';
import { Helpers } from 'tnp-helpers';
import { config } from 'tnp-config';
import * as spawn from 'cross-spawn';

console.log('press any key')
spawn.sync('pause','', { shell: true, stdio: [0, 1, 2] })

process.exit(0)
Helpers.foldersFrom(path.join(process.cwd(), '..'))
  .filter(f => !f.endsWith('tnp'))
  .map( f => path.join(f,config.folder.node_modules) )
  .forEach(f => {
    Helpers.remove(f);
    console.log(f)
  })

// import { path } from 'tnp-core'

// import { fse, crossPlatformPath } from 'tnp-core'

// export default function slash(p) {
//     if (process.platform === 'win32') {
//         p = `/${p}`;
//         return p.replace(/\\/g, '/').replace(/\:/g,'').split('/').map( (a:string,i) => {
//             if(i === 0){
//                 return a.toLowerCase();
//             }
//             return a;
//         } ).join('/')
//       }
//       return p;

// 	const isExtendedLengthPath = /^\\\\\?\\/.test(p);
// 	const hasNonAscii = /[^\u0000-\u0080]+/.test(p); // eslint-disable-line no-control-regex

// 	if (isExtendedLengthPath || hasNonAscii) {
// 		return p;
// 	}

// 	return p.replace(/\\/g, '/');
// }

// import { os } from 'tnp-core';

// const v = crossPlatformPath( os.homedir());

// console.log(fse.existsSync(path.resolve('C:/Users/Dariusz/projects/npm/tnp')))
// console.log(fse.existsSync('/c/Users/Dariusz/projects/npm/tnp'))
// console.log(v)
// console.log(slash(v))
// console.log(fse.existsSync(slash(v)))
// console.log(fse.existsSync(slash(v)))
// console.log(path.resolve('/'))
