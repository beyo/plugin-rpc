
var crypto = require ("crypto")

var RPC = require('./lib/rpc');
var clientLibrary = require('./lib/client-library');


var rpc;


module.exports = rpcPlugin;


function rpcPlugin(beyo) {
  var config = beyo.config('plugins.rpc', {});

  if (rpc) {
    throw new Error('Plugin already initialized!');
  } else if (!config.port) {
    throw new Error('Configuration missing: port');
  }

  rpc = new RPC(config);

  rpc.middleware = middlewareWrapper(beyo, config);

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

      if (config.clientURL && (this.url === config.clientURL)) {
        id = yield ownerProvider(this);

        this.body = yield clientLibrary(id, this);
      } else {
        yield next;
      }
    });
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
        cb(new Error('Invalid owner property `' + property + '` for RPC client library'));
      }
    };
  };
}


function defaultOwnerProvider() {
  return function (cb) {
    crypto.randomBytes(256, cb);
  };
}