var crypto = require('crypto');
app.define('crypto', function(_appRequire, exports, module) {
  module.exports = {
    createHash: crypto.createHash.bind(crypto),
    hash: function(type, data, enc) {
      var hasher = crypto.createHash(type);
      hasher.update(data, enc);
      return hasher.digest();
    },
    createHmac: crypto.createHmac.bind(crypto),
    hmac: function(type, key, data, enc) {
      var hasher = crypto.createHmac(type, key, enc);
      hasher.update(data, enc);
      return hasher.digest();
    },
  };
});
