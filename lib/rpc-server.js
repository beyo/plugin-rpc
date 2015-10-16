
var Primus = require('primus');

var common = require('./common');
var Enveloppe = require('./enveloppe');
var Message = require('./message');
var config = require('./config');
var EventEmitter = require('promise-events');


module.exports = RPCServer;


function RPCServer(options) {

  this.primus = Primus.createServer(options.primusOptions);
  this.clientConnection = getRemoteConnectionInfo(this.primus, options);
  this.clients = [];
  this.events = new EventEmitter();

  this._pendingRequests = {};

  listenIncomingConnexions(this);
}


RPCServer.prototype.emit = function emit(action, data, target) {
  var message;

  if (action instanceof Message) {
    message = action;
  } else {
    message = new Message({
      action: action,
      data: data,
      target: target
    });
  }

  return messageRouter(this, message);
};

RPCServer.prototype.on = function addListener(action, listener) {
  var events = this.events;
  if (typeof action === 'string') {
    return events.addListener(action, listener);
  } else {
    return Promise.all(common.scanObject('', action, function (action, listener) {
      return events.addListener(action, listener);
    }));
  }
};

RPCServer.prototype.remove = function removeListener(action, listener) {
  var events = this.events;
  if (typeof action === 'string') {
    return events.removeListener(action, listener);
  } else {
    return Promise.all(common.scanObject('', action, function (action, listener) {
      return events.removeListener(action, listener);
    }));
  }
};

RPCServer.prototype.removeAll = function removeAllListeners() {
  return this.events.removeAllListeners();
};


// private


function getRemoteConnectionInfo(primus, options) {
  var os = require('os');

  var ifaces = os.networkInterfaces() || {};
  var ifaceNames = Object.keys(ifaces);

  var addr = primus.server.address();
  var useIPv6 = !!options['useIPv6'];
  var ifaceName = options['interface'];
  var remoteConnection;

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

  remoteConnection.secure = !!(options.primusOptions && options.primusOptions.cert);
  remoteConnection.port = (options.primusOptions && options.primusOptions.port) || (addr && addr.port);
  remoteConnection.url = remoteConnection.address + ':' + remoteConnection.port;

  return remoteConnection;
}



function listenIncomingConnexions(rpc) {
  rpc.primus.on('connection', function (spark) {
    var clientId = spark.request.query && spark.request.query.id || config.guest;

    //console.log('debug', '[RPC]', 'Connection from', spark.address.ip + ':' + spark.address.port, '(' + spark.id + ')');

    rpc.clients.push({
      id: String(clientId),
      spark: spark
    });

    bindSpark(rpc, spark);
  });
}


function bindSpark(rpc, spark) {

  spark.on('data', function onData(enveloppe) {
    if (enveloppe.type === Enveloppe.TYPE_REQUEST) {
      handleRequest(rpc, spark, enveloppe);
    } else if (enveloppe.type === Enveloppe.TYPE_RESPONSE) {
      handleResponse(rpc, spark, enveloppe);
    }
    /* ignore unknown enveloppes */
  });

  spark.on('end', function onEnd() {
    rpc.clients = rpc.clients.filter(function (client) {
      return client.spark !== spark;
    });
  });

}



function handleRequest(rpc, spark, enveloppe) {
  messageRouter(rpc, new Message(enveloppe.content)).then(function (responses) {
    spark.write(new Enveloppe({
      id: enveloppe.id,
      type: Enveloppe.TYPE_RESPONSE,
      content: responses
    }));
  });
}


function handleResponse(rpc, spark, enveloppe) {
  var pending = rpc._pendingRequests[enveloppe.id];

  if (pending) {
    pending.callback(new Response(enveloppe.content));
  }
}



function messageRouter(rpc, message) {
  var promises = [];

  if (!message.target || message.target.indexOf('server') !== -1) {
    promises.push(rpc.events.emit(message.action, message));
  }

  rpc.clients.forEach(function (client) {
    if (!message.target || message.target.indexOf(String(client.id)) !== -1) {
      promises.push(new Promise(function (resolve) {
        var enveloppe = new Enveloppe({
          type: Enveloppe.TYPE_REQUEST,
          content: message
        });
        var timeout = setTimeout(function () {
          delete rpc._pendingRequests[enveloppe.id];

          resolve(new Response({
            error: new Error('Timeout')
          }));
        }, config.requestTimeout);

        rpc._pendingRequests[enveloppe.id] = {
          timeout: timeout,
          callback: function (response) {
            clearTimeout(timeout);
            delete rpc._pendingRequests[enveloppe.id];

            resolve(response);
          }
        };

        client.spark.write(enveloppe);
      }));
    }
  });

  return Promise.all(promises).then(function (results) {
    return results.filter(function (result) {
      return result;
    }).map(function (result) {
      if (result instanceof Response) {
        return result;
      } else {
        return new Response({
          value: result
        });
      }
    });
  });
}