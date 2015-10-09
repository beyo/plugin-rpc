
/*{{primusSource}}*/

(function (root, factory) {
  root.beyo = root.beyo || {};
  root.beyo.plugins = root.beyo.plugins || {};

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery'], function ($) {
      return (root.beyo.plugins.rpc = factory($, root.beyo, root.Primus));
    });
  } else {
    // Browser globals
    root.beyo.plugins.rpc = factory(root.jQuery, root.beyo, root.Primus);
  }
}(this, function ($, beyo, Primus) {

  var ENVELOPPE_TYPE_REQUEST = 'request';
  var ENVELOPPE_TYPE_RESPONSE = 'response';
  var MESSAGE_OWNER = /*{{messageOwner}}*/
  var primusUrl = /*{{primusUrl}}*/;
  var primusOptions = /*{{primusOptions}}*/;
  var isConnected = false;
  var primus = Primus.connect(primusUrl, primusOptions);

  var handlers = {};

  var pending = {};


  // private

  function generateUId() {
    // return always 4 bytes
    function _randomPad() {
      return (Math.ceil(Math.random() * 1632959) + 46656).toString(36);
    }

    var id = new Date().getTime().toString(36);

    while (id.length < 12) {
      id = id + _randomPad();
    }

    return _randomPad() + '-' + id.substr(0, 12);
  }


  function registerHandler(name, handler) {
    if (!handlers[name]) {
      handlers[name] = handler;

      return true;
    } else {
      console.warn('Trying to override message handler', name);

      return false;
    }
  }

  function unregisterHandler(name) {
    if (handlers[name]) {
      delete handlers[name];

      return true;
    } else {
      return false;
    }
  }

  function scanObject(prefix, obj, callback) {
    var keys = Object.keys(obj);
    var path;
    var handler;
    var ret = false;

    for (var i = 0, iLen = keys.length; i < iLen; ++i) {
      path = prefix + '.' + keys[i];
      handler = obj[keys[i]];

      if (typeof handler !== 'function') {
        ret = scanObject(path, handler, callback) || ret;
      } else {
        ret = callback(path, handler) || ret;
      }
    }

    return ret;
  }


  function buildEnveloppe(message, type, id) {
    'use strict';

    if (!(message && message.name && typeof message.name === 'string')) {
      throw new Error('Invalid message', message);
    }

    message.owner = MESSAGE_OWNER;  // override
    message.timestamp = message.timestamp || new Date().getTime();

    return {
      id: id || generateUId(),
      type: type || ENVELOPPE_TYPE_REQUEST,
      message: message
    };
  }


  function handleRequest(id, message) {
    var handler;
    var value;

    if (!handlers[message.name]) {
      return;
    }

    function _buildResponseMessage(err, value) {
      return buildEnveloppe({
        success: !err,
        error: err,
        value: value
      });
    }

    handler = handlers[message.name];

    value = handler(message);

    // FIXME: change this when jQuery 3.0 is out
    if (value.done && value.fail) {
      value.done(function (value) {
        primus.write(_buildResponseMessage(null, value));
      }).fail(function (err) {
        primus.write(_buildResponseMessage(err, null));
      });
    } else {
      primus.write(_buildResponseMessage(null, value));
    }
  }


  function handleResponse(id, message) {
    if (pending[id]) {
      var p = pending[id];

      delete pending[id];

      if (message.error) {
        p.deferred.reject(message);
      } else {
        p.deferred.resolve(message);
      }
    }
  }


  // public


  function emitMessage(message) {
    var enveloppe;
    var def;

    if (!isConnected) {
      throw new Error('Not connected to RPC server!');
    }


    enveloppe = buildEnveloppe(message);
    // FIXME: change this when jQuery 3.0 is out
    def = $.Deferred();

    pending[enveloppe.id] = {
      deferred: def,
      message: message
    };

    primus.write(enveloppe);

    return def.promise();
  }


  function onMessage(name, callback) {
    if (typeof name === 'string') {
      if (typeof callback !== 'function') {
        throw new Error('Invalid message callback');
      }

      registerHandler(name, callback);
    } else if (name) {
      scanObject('', name, registerHandler);
    } else {
      throw new Error('Invalid message handler arguments');
    }
  }


  function removeListener(name) {
    if (typeof name === 'string') {
      unregisterHandler(name);
    } else if (name) {
      scanObject('', name, unregisterHandler);
    } else {
      throw new Error('Invalid message handler arguments');
    }
  }


  function removeAllListeners() {
    handlers = {};
  }


  // primus

  primus.on('open', function open() {
    isConnected = true;
  });

  primus.on('reconnecting', function () {
    isConnected = false;
  });

  primus.on('data', function (enveloppe) {
    if (enveloppe.type === ENVELOPPE_TYPE_REQUEST) {
      handleRequest(enveloppe.id, enveloppe.message);
    } else if (enveloppe.type === ENVELOPPE_TYPE_RESPONSE) {
      handleResponse(enveloppe.id, enveloppe.message);
    }
  });

  primus.on('end', function () {
    isConnected = false;
  });

  return {
    emit: emitMessage,
    on: onMessage,
    remove: removeListener,
    removeAll: removeAllListeners
  };
}));