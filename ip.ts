
import * as os from 'os';
import { NetworkInterfaceInfo } from 'os';

function getLocalIp(): NetworkInterfaceInfo {

  const ifaces = os.networkInterfaces();
  const interfaces: NetworkInterfaceInfo[] = [];
  Object.keys(ifaces).forEach(function (ifname) {
    let alias = 0;

    ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
        // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
        return;
      }
      // if (alias >= 1) {
      //   // this single interface has multiple ipv4 addresses
      //   console.log(ifname + ':' + alias, iface.address);
      // } else {
      //   // this interface has only one ipv4 adress
      //   console.log(ifname, iface.address);
      // }
      interfaces.push(iface);
      ++alias;
    });
  });
  return interfaces.find(c => c.address.startsWith('192')) || {} as NetworkInterfaceInfo;
}


console.log(`localip: '${getLocalIp().address}'`)
