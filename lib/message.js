
var config = require('./config');


module.exports = Message;


function Message(options) {
  options = options || {};

  this.name = options.name;
  this.owner = config.owner;
  this.target = options.target !== undefined ? options.target : null;
  this.data = options.data;
  this.timestamp = options.timestamp || config.timestamp;
}
