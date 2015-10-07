# Beyo Plugin RPC

Bi-directional RPC plugin for Beyo applications


## Installation

In your application :

```
npm install beyo-plugin-rpg --save
```

Then add the plugin configuration to your app `conf` :

```
// app/conf/plugins/rpc.json
{
  "rpc": {
    "module": "beyo-plugin-rpc",
    "options": {
        "port": 6000,
        "clientURL": "/rpc/client.js"
    }
  }
}
```


## Usage

The API is the same on both the client and the server. However, the way to retrive the interface differ on the server and client.


### Getting the Interface on the Server

Since this is a plugin, the instance may be obtained only from `beyo.plugins`. Trying to get the instance any other way is not garanteed to work. Obviously, the interface is only available once plugins are loaded.

```
var rpc = beyo.plugins.rpc;
```


### Getting the Interface on the Client

The interface is recommended to be obtained globally or through `require` (i.e. if [RequireJS](http://www.requirejs.org/) or any UMD compatible library is available).

```
<script src="/rpc/client.js"></script> <!-- see plugin configuration -->
<script type="text/javascript">
  var rpc = beyo.plugins.rpc;  // just like on the server!

  ...
</script>
```

or with a loader (ex: RequireJS) :

```
require(['beyo-plugin-rpc'], function (rpc) {
  // ...
});
```

**NOTE**: The client library uses [Primus](https://github.com/primus/primus) to communicate with the server.


### API

* **register(name, callback)** : *(boolean)* - register a new handler. The `name` is an arbitrary string value. The `callback` argument should be a function returning a value (sync), or a `Promise` (async).
 
  ```
  rpc.register('foo.bar', function (text) {
    return 'Hello ' + text;
  });
  ```

* **invoke(name, [arguments, ...])** : *(Promise)* - invoke a given handler on the other end returning a `Promise` resolving with the given value, or rejecting with the given `Error`.

  ```
  rpc.invoke('foo.bar', 'World').then(function (value) {
    console.log("RPC response:", value);
  }).catch(function (err) {
    console.error(err.message);
  })
  ```

  **NOTE**: on the client side, jQuery's promise implementation is used. Until version 3.0 of jQuery, the client-side promises will be "thenable", and not Promise/A+ compatible.


## Contribution

All contributions welcome! Every PR **must** be accompanied by their associated
unit tests!


## License

The MIT License (MIT)

Copyright (c) 2015 Mind2Soft <yanick.rochon@mind2soft.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
