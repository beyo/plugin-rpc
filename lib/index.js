


module.exports = rpcPlugin;


function rpcPlugin(beyo) {
  var config = beyo.config('plugins.rpc', {});

  if (!config.port) {
    throw new Error('Configuration missing: port');
  }

  // client middleware
  setupClient(beyo.app, config);

  return {
    on: null,
    remove: null,
    removeAll: null,
    emit: null,
    Message: null
  };
}


function setupClient(app, config) {
  if (!config.clientURL) {
    return;
  }

  app.use(function * (next) {
    if (this.url === config.clientURL) {

      // TODO serve client
      this.body = 'alert("RPC client not implemented");';

    } else {
      yield next;
    }
  });
}