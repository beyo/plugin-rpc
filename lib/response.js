

const RESPONSE_OWNER = 'server';


module.exports = Response;


function Response(name, error, value) {
  this.success = !error;
  this.owner = RESPONSE_OWNER;
  this.error = error;
  this.value = value;
  this.timestamp = new Date().getTime();
}