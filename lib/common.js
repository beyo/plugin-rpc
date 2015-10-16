

module.exports.scanObject = function (prefix, obj, callback) {
  var keys = Object.keys(obj);
  var path;
  var handler;
  var ret = [];

  for (var i = 0, iLen = keys.length; i < iLen; ++i) {
    path = prefix + '.' + keys[i];
    handler = obj[keys[i]];

    if (typeof handler !== 'function') {
      ret.concat(scanObject(path, handler, callback));
    } else {
      ret.push(callback(path, handler));
    }
  }

  return ret;
};


module.exports.generateUID = function () {
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
