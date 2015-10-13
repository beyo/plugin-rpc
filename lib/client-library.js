
var browserify = require('browserify');
var esmangleify = require('esmangleify');



module.exports = clientLibrary;



function * clientLibrary(id, ctx) {


//var b = browserify({
//  standalone: 'beyo.plugins.rpc'
//});
//b.transform(esmangleify());
//b.add('./lib/message.js');
//b.add('./lib/response.js');
//b.bundle().pipe(process.stdout);

  return 'alert("Client library not implemented!");';
}