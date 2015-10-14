
const TYPE_REQUEST = 'request';
const TYPE_RESPONSE = 'response';

var types = {};

// build lookup
types[TYPE_REQUEST] = true;
types[TYPE_RESPONSE] = true;


module.exports = enveloppe;


function Enveloppe(options) {
  if (!TYPES[options.type]) {
    throw new Error('Invalid enveloppe type : ' + options.type);
  }

  this.id = options.id || generateUID();
  this.type = options.type || TYPE_REQUEST;
  this.message = options.message || {};
}

Enveloppe.TYPE_REQUEST = TYPE_REQUEST;
Enveloppe.TYPE_RESPONSE = TYPE_RESPONSE;


function generateUID() {
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
