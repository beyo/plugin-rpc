
var crypto = require("crypto")

var browserify = require('browserify');
var esmangleify = require('esmangleify');

var RPCServer = require('./lib/rpc-server');

var rpc;


module.exports = rpcPlugin;


function * rpcPlugin(beyo, options) {
  if (rpc) {
    return rpc;
  }

  rpc = new RPCServer(options);
  rpc.middleware = middlewareWrapper(beyo, options.clientOptions);

  return rpc;
}

function middlewareWrapper(beyo, config) {
  var ownerProvider = config.ownerProvider;

  if (typeof ownerProvider === 'string') {
    ownerProvider = propertyOwnerProvider(ownerProvider);
  } else if (typeof ownerProvider !== 'function') {
    ownerProvider = defaultOwnerProvider;
  }

  return function middleware() {
    return function * (next) {
      var id;

      if (config.url && (this.url === config.url)) {
        id = yield ownerProvider(this);

        this.body = yield* clientLibrary(id, this);
      } else {
        yield* next;
      }
    };
  };
}


function propertyOwnerProvider(property) {
  var path = property.split('.');

  return function (ctx) {
    return function (cb) {
      for (var i = 0, iLen = path.length; ctx && i < iLen; ++i) {
        ctx = ctx[path[i]];
      }

      if (ctx !== undefined) {
        cb(null, ctx);
      } else {
        cb("anonymous");
      }
    };
  };
}


function defaultOwnerProvider() {
  return function (cb) {
    crypto.randomBytes(256, cb);
  };
}


function * clientLibrary(id, ctx) {
  return 'alert("OK");';
}