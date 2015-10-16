
var common = require('./common');
var Enveloppe = require('./enveloppe');
var Message = require('./message');
var Response = require('./response');
var EventEmitter = require('promise-events');

var config = require('./config');

var primus = Primus.connect(connectionUrl(), config.primusOptions);

var isConnected = false;
var events = new EventEmitter();
var pendingRequests = {};


module.exports = {
  emit: emitMessage,
  on: addListener,
  remove: removeListener,
  removeAll: removeAllListeners,
  Message: Message
};


// private

function connectionUrl() {
  var url = config.primusUrl;

  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'id=' + encodeURIComponent(config.owner);
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


function handleRequest(enveloppe) {
  var message = new Message(enveloppe.content);

  events.emit(message.action, message).then(function (results) {
    var responses = results.filter(function (result) {
      return result;
    }).map(function (result) {
      return new Response({
        value: result
      });
    });

    primus.write(new Enveloppe({
      type: Enveloppe.TYPE_RESPONSE,
      content: responses
    }));
  });
}


function handleResponse(enveloppe) {
  var pending = pendingRequests[enveloppe.id];

  if (pending) {
    pending.callback(new Response(enveloppe.content));
  }
}


// public


function emitMessage(name, data, target) {
  var promises = [];
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

  if (!message.target || message.target.indexOf(String(config.owner)) !== -1) {
    promises.push(events.emit(message.action, message));
  }

  promises.push(new Promise(function (resolve) {
    var enveloppe = new Enveloppe({
      type: Enveloppe.TYPE_REQUEST,
      content: message
    });
    var timeout = setTimeout(function () {
      delete pendingRequests[enveloppe.id];

      resolve(new Response({
        error: new Error('Timeout')
      }));

    }, config.requestTimeout);

    pendingRequests[enveloppe.id] = {
      timeout: timeout,
      callback: function (response) {
        clearTimeout(timeout);
        delete pendingRequests[enveloppe.id];

        resolve(response);
      }
    }

    primus.write(enveloppe);
  }));

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


function addListener(action, listener) {
  if (typeof action === 'string') {
    return events.addListener(action, listener);
  } else {
    return Promise.all(common.scanObject('', action, function (action, listener) {
      return events.addListener(action, listener);
    }));
  }
}


function removeListener(name) {
  if (typeof action === 'string') {
    return events.removeListener(action, listener);
  } else {
    return Promise.all(common.scanObject('', action, function (action, listener) {
      return events.removeListener(action, listener);
    }));
  }
}


function removeAllListeners() {
  return events.removeAllListeners();
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
    handleRequest(enveloppe);
  } else if (enveloppe.type === Enveloppe.TYPE_RESPONSE) {
    handleResponse(enveloppe);
  } else {
    throw new Error('Unknown enveloppe : ' + enveloppe);
  }
});

primus.on('end', function () {
  isConnected = false;
});