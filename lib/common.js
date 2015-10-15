

module.exports.scanObject = scanObject;


function scanObject(prefix, obj, callback) {
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
}
