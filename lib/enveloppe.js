
const TYPE_REQUEST = 'request';
const TYPE_RESPONSE = 'response';


module.exports = enveloppe;



function Enveloppe(message, type, id) {
  this.id = id || generateUID();
  this.type = type || TYPE_REQUEST;
  this.message = message;
}



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
