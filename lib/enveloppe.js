
const TYPE_REQUEST = 'request';
const TYPE_RESPONSE = 'response';

var common = require('./common');

var types = {};

// build lookup
types[TYPE_REQUEST] = true;
types[TYPE_RESPONSE] = true;


module.exports = Enveloppe;


function Enveloppe(options) {
  if (options.type && !types[options.type]) {
    throw new Error('Invalid enveloppe type : ' + options.type);
  }

  this.id = options.id || common.generateUID();
  this.type = options.type || TYPE_REQUEST;
  this.content = options.content || {};
}

Enveloppe.TYPE_REQUEST = TYPE_REQUEST;
Enveloppe.TYPE_RESPONSE = TYPE_RESPONSE;