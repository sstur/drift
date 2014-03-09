/*global global, require, app */
var crypto = require('crypto');
var Buffer = require('buffer').Buffer;
app.define('md5', function(require, exports, module) {

  module.exports = {
    hash: function(data, enc) {
      var hash = crypto.createHash('md5');
      hash.update(Buffer.apply(null, arguments));
      return Buffer(hash.digest(), 'binary');
    },
    create: function() {
      return crypto.createHash('md5');
    }
  };

});