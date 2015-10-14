

var config = {
  owner: /*{{owner}}*/'server'/*{{!owner}}*/,
  primusUrl: /*{{primus-url}}*/''/*{{!primus-url}}*/,
  primusOptions: /*{{primus-options}}*/{}/*{{!primus-options}}*/,
  get timestamp() {
    return new Date().getTime();
  }
};


module.exports = config;