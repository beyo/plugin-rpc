

const MESSAGE_OWNER = 'server';


module.exports = Message;


function Message(name, data, target) {
  this.name = name;
  this.owner = MESSAGE_OWNER;
  this.target = target !== undefined ? target : null;
  this.data = data;
  this.timestamp = new Date().getTime();
}