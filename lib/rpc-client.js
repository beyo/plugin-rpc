

var Enveloppe = require('./enveloppe');
var Message = require('./message');
var Response = require('./response');

var config = require('./config');

var primus = Primus.connect(config.primusUrl, config.primusOptions);

var isConnected = false;
var handlers = {};
var pending = {};


module.exports = {
  emit: emitMessage,
  on: onMessage,
  remove: removeListener,
  removeAll: removeAllListeners
};


// private

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

  if (!(message instanceof Message)) {
    throw new Error('Invalid message : ' + message);
  }

  return new Enveloppe({
    id: id,
    type: type,
    message: message
  });
}


function handleRequest(id, message) {
  var handler;
  var value;

  function _buildResponseMessage(err, value) {
    return buildEnveloppe(new Response({
      error: err,
      value: value
    }, Enveloppe.TYPE_RESPONSE, id);
  }

  if (!handlers[message.name]) {
    primus.write(buildEnveloppe({
      success: false
    }, Enveloppe.TYPE_RESPONSE, id));
    return;
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


function emitMessage(name, data, target) {
  var enveloppe;
  var def;

  if (!isConnected) {
    throw new Error('Not connected to RPC server!');
  }

  enveloppe = buildEnveloppe(new Message({
    name: name,
    data: data,
    target: target
  }), Enveloppe.TYPE_REQUEST);
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
  if (enveloppe.type === Enveloppe.TYPE_REQUEST) {
    handleRequest(enveloppe.id, enveloppe.message);
  } else if (enveloppe.type === Enveloppe.TYPE_RESPONSE) {
    handleResponse(enveloppe.id, enveloppe.message);
  } else {
    throw new Error('Unknown enveloppe : ' + enveloppe);
  }
});

primus.on('end', function () {
  isConnected = false;
});