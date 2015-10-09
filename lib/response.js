

const RESPONSE_OWNER = 'server';


module.exports = Response;


function Response(options) {
  options = options || {};

  this.success = 'success' in options ? !!options.success : !options.error;
  this.owner = RESPONSE_OWNER;
  this.error = options.error;
  this.value = options.value;
  this.timestamp = options.timestamp || new Date().getTime();
}