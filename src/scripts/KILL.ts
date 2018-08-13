import { Project } from "../project";
import { info, error } from "../messages";
import { run } from '../process';
import * as os from 'os';

function killall() {
  if (process.platform === 'win32') {
    run(`taskkill /F /im node.exe`).sync();
  } else {
    run(`killall -9 node`).sync();
  }
}

function killonport(args) {
  const port = parseInt(args.trim())
  console.log(`Killing process on port ${port} in progress`);
  try {

    if (os.platform() === 'linux') {
      Project.Current.run(`lsof -i:${port}`, { output: false }).sync()
    } else if (os.platform() === 'win32') {
      // run(`for /f "tokens=5" %a in ('netstat -aon ^| find ":${port}" ^| find "LISTENING"') do taskkill /f /pid %a`).sync()
      const pid = run(`netstat -ano | findstr :${port} | grep LISTENING -m 1 |  awk '{print $NF}'`, { output: false }).sync().toString();
      console.log(`Killing process on pid: ${pid} in progress`);
      run(`tskill ${pid}`).sync();
      info(`Done`);
    } else {
      Project.Current.run(`lsof -P | grep ':${port}' | awk '{print $2}'`, { output: false }).sync()
    }

    info(`Process killed on port: ${port}`)
  } catch (e) {
    error(`Incorrect port: ${args}`)
  }
  process.exit(0)
}


export default {
  $KILL_ON_PORT: (args: string) => {
    killonport(args);
  },
  $KILLONPORT: (args: string) => {
    killonport(args);
  },
  $KILLALL_NODE: () => {
    killall()
  },
  $KILLALLNODE: () => {
    killall()
  }

}
