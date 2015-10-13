

module.exports = RPC;


function RPC(options) {
  this.clientConnection = getRemoteConnectionInfo(options);
}



function getRemoteConnectionInfo(serverOptions) {
  var os = require('os');

  var ifaces = os.networkInterfaces() || {};
  var ifaceNames = Object.keys(ifaces);

  var addr; // = primus.server.address();
  var useIPv6;
  var ifaceName;
  var remoteConnection;

  serverOptions = serverOptions || {};

  useIPv6 = !!serverOptions['useIPv6'];
  ifaceName = serverOptions['interface'];

  function getIp(name, iface, external) {
    var ipList = iface.filter(function (info) {
      return (!useIPv6 || (info.family === 'IPv6')) && (!name || (ifaceName === name) || (!external && info.internal));
    });
    var ipInfo = ipList.length && ipList.shift();

    return ipInfo && {
      address: ipInfo.address,
      family: ipInfo.family
    };
  }

  remoteConnection = ifaceNames.reduce(function (found, name) {
    return found || getIp(name, ifaces[name], true);
  }, false) || ifaceNames.reduce(function (found, name) {
    return found || getIp(null, ifaces[name]);
  }, false) || {
    address: 'localhost',
    family: 'IPv4'
  };

  remoteConnection.port = (serverOptions && serverOptions.port) || (addr && addr.port);

  return remoteConnection;
}
