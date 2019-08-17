import { ProcesOptions } from './process-options';

const group = 'Firedev CLI essentials';

export type CommandType = {
  command?: string;
  exec?: string;
  title?: string;
  group?: string;
  options?: ProcesOptions;
}

export const commands: CommandType[] = ([
  {
    title: 'FIREDEV: show temp files',
    exec: 'tnp vscode:temp:show',
    options: { findNearestProject: true }
  },
  {
    title: 'FIREDEV: hide temp files',
    exec: 'tnp vscode:temp:hide',
    options: { findNearestProject: true }
  },
  {
    title: 'FIREDEV: build dist',
    exec: 'tnp build:dist',
    options: {
      findNearestProject: true
    }
  },
  {
    title: 'FIREDEV: static build dist',
    exec: 'tnp static:build:dist',
    options: {
      findNearestProject: true
    }
  },
  {
    title: 'FIREDEV: reset project',
    exec: 'tnp reset',
    options: {
      findNearestProject: true
    }
  },
  {
    title: 'FIREDEV: reset all projects',
    exec: 'tnp reset:all',
    options: {
      findNearestProject: true
    }
  },
  {
    title: 'FIREDEV: clear project',
    exec: 'tnp clear',
    options: {
      findNearestProject: true
    }
  },
  {
    title: 'FIREDEV: clear all projects',
    exec: 'tnp clear:all',
    options: {
      findNearestProject: true
    }
  },
  {
    title: 'FIREDEV QUICK GIT commit and push update',
    exec: `tnp ${camelize('$GIT_QUICK_COMMIT_AND_PUSH')}`,
    options: {
      findNearestProjectWithGitRoot: true,
    }
  },
  {
    title: 'FIREDEV QUICK GIT reset hard and pull',
    exec: `tnp ${camelize('$GIT_QUICK_RESET_HARD_AND_PULL')}`,
    options: {
      findNearestProjectWithGitRoot: true,
    }
  },
  {
    title: 'FIREDEV: rebuild/reinstal vscode ext',
    exec: 'tnp vscode:ext',
    options: {
      reloadAfterSuccesFinish: true,
      cancellable: false,
      debug: true,
    }
  },
  {
    title: 'FIREDEV: TEST EXT',
    exec: 'tnp show:loop:messages --max 6 --tnpShowProgress',
    options: {
      cancellable: false,
      title: 'Testing progress'
    }
  },
  {
    title: 'FIREDEV: show version',
    exec: 'tnp version',
    options: {
      syncProcess: true,
      title: 'Show version of firedev'
    }
  },
  {
    title: 'FIREDEV: fix termial vscode',
    exec: 'tnp vscodefix',
    options: {
    }
  },
  // only for tests
  // {
  //   title: 'FIREDEV TEST nearest project',
  //   exec: 'tnp processcwd',
  //   options: {
  //     findNearestProject: true,
  //     syncProcess: true
  //   }
  // },
  // {
  //   title: 'FIREDEV TEST nearest project with git root',
  //   exec: 'tnp processcwd',
  //   options: {
  //     findNearestProjectWithGitRoot: true,
  //     syncProcess: true
  //   }
  // },
  // {
  //   title: 'FIREDEV TEST nearest project workspace',
  //   exec: 'tnp processcwd',
  //   options: {
  //     findNearestProjectType: 'container',
  //     syncProcess: true
  //   }
  // },
  // {
  //   title: 'FIREDEV TEST nearest project workspace with git root',
  //   exec: 'tnp processcwd',
  //   options: {
  //     findNearestProjectTypeWithGitRoot: 'workspace',
  //     syncProcess: true
  //   }
  // }
] as CommandType[]).map(c => {
  if (!c.command) {
    c.command = `extension.${camelize(c.title)}`;
  }
  if (!c.group) {
    c.group = group;
  }
  return c;
})


function camelize(str: string = '') {
  str = str.replace(/\W/g, '').toLowerCase();
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
    return index == 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}
