

const MESSAGE_OWNER = 'server';


module.exports = Message;


function Message(name, data) {
  this.name = name;
  this.owner = MESSAGE_OWNER;
  this.data = data;
  this.timestamp = new Date().getTime();
}