# Beyo Plugin RPC

Bi-directional RPC plugin for Beyo applications


## Installation

In your application :

```
npm install beyo-plugin-rpc --save
```

Then add the plugin configuration to your app `conf` :

```
// app/conf/plugins/rpc.json
{
  "rpc": {
    "module": "beyo-plugin-rpc",
    "options": {
      "primusOptions": {
        "iknowhttpsisbetter": true,
        "port": 4046,
        "transformer": "websockets"
      },
      "ownerProvider": "passport.user.id",
      "clientUrl": "/rpc/client.js"
      }
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
require(['rpc/client'], function (rpc) {
  // ...
});
```

**NOTE**: The client library uses [Primus](https://github.com/primus/primus) to communicate with the server. However, at the moment, there is no way to setup primus.


## Configuration

* **primusOptions** : *{object}* - *(required)* an object that will be passed to the Primus constructor. (See [documentation](https://github.com/primus/primus).)
* **interface** : *{string}* - the network interface to use (i.e. `'eth0'`)
* **useIPv6** : *{boolean}* - when determining the network interface IP address, should the address be resolved as IPv6 (`true`) or IPv4 (`false`)
* **clientUrl** : *{string}* - the URL that the client will connect to to get the library. If not specified, then no client code will be served.
* **ownerProvider** : *{function|string}* - how message and response owners are generated for clients. If a function, it will receive the HTTP request context object and should return an identifier or a `Promise` resolving to an identifier. If a string, it should represent a property path from the HTTP request context. If not specified, a unique hash value will be generated and returned.
  
  Example:
  ```
  {
    "ownerProvider": "passport.user.id"
  }
  ```

  ```
  {
    "ownerProvider": function (ctx) {
      return ctx.passport.user.id;
    }
  }
  ```


### API

* **rpc.emit(name, data, target)** or **rpc.emit(message)** : *(Promise)* - emit some `data` to the specified `name`d listeners, and return a `Promise` resolving with the given values, or rejecting with the given `Error`s. If `target` is specified, it is a string or array of strings, which will emit to these specified targets only. If target is not specified, it will be emitted to all server and clients.

  ```
  var message = new rpc.Message('foo.bar', {
    greeting: 'World'
  });
  rpc.emit(message).then(function (responses) {
    responses.forEach(function (response) {
      if (response.success) {
        console.log('RPC response from', response.owner || 'guest', 'is', response.value);
      } else {
        console.log('RPC failed from', response.owner || 'guest', 'with error', response.error);
      }
    });
  }).catch(function (err) {
    console.error(err.message);
  })
  ```

  **NOTE**: on the client side, jQuery's promise implementation is used. Until version 3.0 of jQuery, the client-side promises will be "thenable", and not Promise/A+ compatible.

* *(server)* **rpc.library(id)** : *{GeneratorFunction}* - resolve with the client library as string. The argument `id` should be an library's unique id when connecting to the server. This function will generate a personalized client library. Therefore, it's returned value must not be cached globally. The first time this function is called may require some time to process. However, any subsequent call returns almost immediately as the generic part of the library is cached internally (~30KB)

* *(server)* **rpc.middleware()** : *{function}* - return a middleware to handle retrieving the client library from the configured url.

* **rpc.on(name, callback)** or **rpc.on(obj)** : *(Promise)* - register a new message handler. The `name` is an arbitrary string value. If an `object` is passed, then it's nested keys will be used as names. The `callback` argument, or `obj` values, should be functions receiving a `Message` object and returning or a value (sync), or a `Promise` (async).
 
  ```
  rpc.on('foo.bar', function (msg) {
    return 'Hello ' + msg.data.greeting;
  });

  // is te same as
  rpc.on({
    'foo': {
      'bar': function (msg) { 
        return 'Hello ' + msg.data.greeting;
      }
    }
  });
  ```

  **NOTE**: each instance of the RPC library (either server or client) may only register one message handler per name. Trying to register an handler on top of an existing one will return `false`. For example, the server and client may both register the same name, but the same name cannot be registered twice on the same server or client.

  **NOTE**: if executed as is, the code above would return false for the second call, as `foo.bar` is already registered using the `name` variation.

* **rpc.remove(name)** or **rpc.remove(obj)** : *{Promise}* - unregister the specified message handler. If an object is passed, then remove all the nested keys and resolve to `true` if at least message handler key was removed.

* **rpc.removeAll()** : *{Promise}* - unregister all message handlers.


### API : Message

* **message.name** : *(string}* - the message name
* **message.owner** : *{number|string}* - the message owner (user id), or `"server"`, or `null` if anonymous.
* **message.target** : *{number|string|array}* - the target owners to send this message to. If an array, try to contact all the specified owners. If `null`, broadcast to all message listeners.
* **message.data** : *{object}* - the message data
* **message.timestamp** : *{number}* - the UNIX timestamp of the message


### API : Response

* **response.success** : *{boolean}* - the response has a value or an error
* **response.owner** : *{number|string}* - the response owner (user id), or `"server"`, or `null` if anonymous.
* **response.value** : *{object}* - the response value, what the message handler resolved to or returned, or `null`.
* **response.error** : *{Error}* - an `Error` object if `response.success === false`, or `null`
* **response.timestamp** : *{number}* - the UNIX timestamp of the response


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
