
var Primus = require('primus');

var common = require('./common');
var Enveloppe = require('./enveloppe');
var config = require('./config');
var EventEmitter = require('promise-events');


module.exports = RPCServer;


function RPCServer(options) {
  options = options || {};

  if (!('serverOptions' in options)) {
    throw new Error('Missing serverOptions configuration');
  }

  this.clientConnection = getRemoteConnectionInfo(options.serverOptions);
  this.primus = Primus.createServer(options.serverOptions);
  this.clients = [];
  this.events = new EventEmitter();

  listenIncomingConnexions(this);
}


RPCServer.prototype.emit = function emit(name, data, target) {

};

RPCServer.prototype.on = function addListener(name, listener) {
  var events = this.events;
  if (typeof name === 'string') {
    return events.addListener(name, listener);
  } else {
    return Promise.all(common.scanObject('', name, function (name, listener) {
      return events.addListener(name, listener);
    }));
  }
};

RPCServer.prototype.remove = function removeListener(name, listener) {
  var events = this.events;
  if (typeof name === 'string') {
    return events.removeListener(name, listener);
  } else {
    return Promise.all(common.scanObject('', name, function (name, listener) {
      return events.removeListener(name, listener);
    }));
  }
};

RPCServer.prototype.removeAll = function removeAllListeners() {
  return this.events.removeAllListeners();
};


// private


function getRemoteConnectionInfo(serverOptions) {
  var os = require('os');

  var ifaces = os.networkInterfaces() || {};
  var ifaceNames = Object.keys(ifaces);

  var addr; // = primus.server.address();
  var useIPv6;
  var ifaceName;
  var remoteConnection;

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


  remoteConnection.protocol = serverOptions.cert ? 'https' : 'http';
  remoteConnection.port = (serverOptions && serverOptions.port) || (addr && addr.port);
  remoteConnection.url = remoteConnection.address + ':' + remoteConnection.port;

  return remoteConnection;
}



function listenIncomingConnexions(rpc) {

  rpc.primus.on('connection', function (spark) {
    var clientId = spark.request.query && spark.request.query.id || config.guest;

    //console.log('debug', '[RPC]', 'Connection from', spark.address.ip + ':' + spark.address.port, '(' + spark.id + ')');

    rpc.clients.push({
      clientId: clientId,
      spark: spark
    });

    bindSpark(rpc, spark);
  });

}


function bindSpark(rpc, spark) {
  
  spark.on('data', function onData(enveloppe) {
    if (enveloppe.type === Enveloppe.TYPE_REQUEST) {
      handleRequest(rpc, spark, enveloppe.message);
    } else {
      handleResponse(rpc, spark, enveloppe.message);
    }
  });

  spark.on('end', function onEnd() {
    rpc.clients = rpc.clients.filter(function (client) {
      return client.spark !== spark;
    });
  });

}



function handleRequest(rpc, spark, message) {



}


function handleResponse(rpc, spark, message) {



}