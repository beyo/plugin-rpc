
var common = require('./common');
var Enveloppe = require('./enveloppe');
var Message = require('./message');
var Response = require('./response');
var EventEmitter = require('promise-events');

var config = require('./config');

var primus = Primus.connect(connectionUrl(), config.primusOptions);

var events = new EventEmitter();
var isConnected = false;
var messageQueue = {};
var pendingRequests = {};


module.exports = {
  emit: emitMessage,
  on: addListener,
  remove: removeListener,
  removeAll: removeAllListeners,
  Message: Message,
  get isConnected() { return isConnected; }
};


// private

function connectionUrl() {
  var url = config.primusUrl;

  return url + (url.indexOf('?') === -1 ? '?' : '&') + 'id=' + encodeURIComponent(config.owner);
}


function handleRequest(enveloppe) {
  var message = new Message(enveloppe.content);

  events.emit(message.action, message).then(function (results) {
    var responses = (results||[]).filter(function (result) {
      return result;
    }).map(function (result) {
      return new Response({
        value: result
      });
    });

    primus.write(new Enveloppe({
      id: enveloppe.id,
      type: Enveloppe.TYPE_RESPONSE,
      content: responses
    }));
  });
}


function handleResponse(enveloppe) {
  var pending = pendingRequests[enveloppe.id];

  if (pending) {
    pending.callback(enveloppe.content);
  }
}


// public


function emitMessage(action, data, target) {
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
    promises.push(events.emit(message.action, message).then(function (results) {
      return (results||[]).map(function (result) {
        return new Response({ value: result });
      });
    }));
  }

  promises.push(new Promise(function (resolve) {
    var enveloppe = new Enveloppe({
      type: Enveloppe.TYPE_REQUEST,
      content: message
    });
    var timeout = setTimeout(function () {
      delete messageQueue[enveloppe.id];
      delete pendingRequests[enveloppe.id];

      resolve(new Response({
        error: 'Timeout'
      }));

    }, config.messageTimeout);

    pendingRequests[enveloppe.id] = {
      timeout: timeout,
      callback: function (response) {
        clearTimeout(timeout);
        delete messageQueue[enveloppe.id];
        delete pendingRequests[enveloppe.id];

        if (response instanceof Array) {
          resolve(response.filter(function (res) {
            return res !== undefined;
          }).map(function (res) {
            return new Response(res);
          }));
        } else {
          resolve(response && new Response(response));
        }
      }
    }

    if (isConnected) {
      primus.write(enveloppe);
    } else {
      messageQueue[enveloppe.id] = enveloppe;
    }
  }));

  return Promise.all(promises).then(function (results) {
    return results.reduce(function (responses, result) {
      if (result instanceof Array) {
        responses = responses.concat(result);
      } else if (result) {
        responses.push(result);
      }

      return responses;
    }, []);
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


function removeListener(action) {
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

  Object.keys(messageQueue).forEach(function (enveloppeId) {
    primus.write(messageQueue[enveloppeId]);
  });

  messageQueue = {};
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