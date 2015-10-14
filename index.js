
const LIBRARY_PATTERN_TOKENS = /\/\*+\{\{(.+?)\}\}\*+\/(.*?)\/\*+\{\{!\1\}\}\*+\//g;

var path = require('path');
var crypto = require("crypto")

var browserify = require('browserify');
var esmangleify = require('esmangleify');
var browserifyReplace = require('browserify-replace');
var esprima = require('esmangleify/node_modules/browserify-esprima-tools/node_modules/esprima/esprima');
var escodegen = require('esmangleify/node_modules/browserify-esprima-tools/node_modules/escodegen/escodegen');
var esmangle = require('esmangleify/node_modules/esmangle/lib/esmangle');

var RPCServer = require('./lib/rpc-server');

var rpc;
var libraryTemplate;


module.exports = rpcPlugin;


function * rpcPlugin(beyo, options) {
  if (rpc) {
    return rpc;
  }

  options = options || {};

  rpc = new RPCServer(options);
  rpc.middleware = middlewareWrapper(beyo, options.clientOptions);

  return rpc;
}

function middlewareWrapper(beyo, config) {
  var ownerProvider;

  config = config || {};

  ownerProvider = config.ownerProvider;

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

        this.body = yield clientLibrary(id, config);
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
        cb(null, "anonymous");
      }
    };
  };
}


function defaultOwnerProvider() {
  return function (cb) {
    crypto.randomBytes(64, function (err, buf) {
      cb(err, buf.toString('base64'));
    });
  };
}


function clientLibrary(id, options) {
  return function (done) {
    if (libraryTemplate) {
      done(null, configClientLibrary(id, options));
    } else {
      var tokens = {
        'owner': id,
        'primus-url': options.url
      };
      var b = browserify({
        basedir: path.join(__dirname, 'lib'),
        standalone: 'beyo.plugins.rpc'
      });
      var buffer = getPrimusLibrary(false) + '\n// ============= RPC =============\n';

      b.transform(browserifyReplace, {
        'replace': [{
          'from': LIBRARY_PATTERN_TOKENS,
          'to': function (match, token, old) {
            return 'beyo.plugins.rpc.config["' + token + '"]';
          }
        }]
      });
      //b.transform(esmangleify());
      b.add('./rpc-client');

      b.bundle().on('data', function (data) {
        buffer = buffer + data.toString();
      }).on('end', function () {
        libraryTemplate = buffer;

        done(null, configClientLibrary(id, options));
      });
    }
  };
}


function getPrimusLibrary(optimize) {
  var buffer = rpc.primus.library();

  if (optimize) {
    var ast = esprima.parse(buffer);
    // Get optimized AST
    var optimized = esmangle.optimize(ast, null);
    // gets mangled AST
    var result = esmangle.mangle(optimized);
    // get source back
    buffer = escodegen.generate(result, {
      format: {
        renumber: true,
        hexadecimal: true,
        escapeless: true,
        compact: true,
        semicolons: false,
        parentheses: false
      }
    });
  }
  
  return '\n// ============= Primus =============\n' 
       + '!function(module,exports,define){'
       + buffer
      + '}();'
  ;
}


function configClientLibrary(id, options) {
  var pre = '\n// ============= Config =============\n'
          //+ 'var exports,module,define;'
          + 'var beyo=window.beyo||{};'
          + 'beyo.plugins=beyo.plugins||{};'
          + 'beyo.plugins=beyo.plugins||{};'
          + 'beyo.plugins.rpc=beyo.plugins.rpc||{};'
          + 'beyo.plugins.rpc.config=' + JSON.stringify({
              'owner': id,
              'primus-url': rpc.clientConnection.url,
              'primus-options': options.primusOptions || {}
            }) + ';'
  ;

  return '!function(window){' + pre + libraryTemplate + '}(this||window||{})';
}