/*global app, require */
var crypto = require('crypto');
var Buffer = require('buffer').Buffer;
app.define('crypto', function(require, exports, module) {

  module.exports = {
    //indicates that we aren't doing any real crypto in js
    nativeImplementation: true,
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
    }
  };

});