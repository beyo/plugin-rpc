
const MESSAGE_OWNER = 'server';


module.exports = Message;


function Message(options) {
  options = options || {};

  this.name = options.name;
  this.owner = MESSAGE_OWNER;
  this.target = options.target !== undefined ? options.target : null;
  this.data = options.data;
  this.options.timestamp = options.timestamp || new Date().getTime();
}
