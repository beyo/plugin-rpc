
var config = require('./config');


module.exports = Response;


function Response(options) {
  options = options || {};

  this.success = 'success' in options ? !!options.success : !options.error;
  this.owner = options.owner || config.owner;
  this.error = options.error && options.error.message || options.error;
  this.value = options.value;
  this.timestamp = options.timestamp || config.timestamp;
}