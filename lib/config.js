

var config = {
  guest: 'anonymous',
  owner: /*{{owner}}*/'server'/*{{!owner}}*/,
  primusUrl: /*{{primus-url}}*/''/*{{!primus-url}}*/,
  primusOptions: /*{{primus-options}}*/{}/*{{!primus-options}}*/,
  get timestamp() {
    return new Date().getTime();
  },
  requestTimeout: 10000
};


module.exports = config;