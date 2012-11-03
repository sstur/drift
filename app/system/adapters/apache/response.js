/*global app, define, apache */
define('adapter-response', function(require, exports, module) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;

  function Response() {
    this._super = apache;
  }

  util.extend(Response.prototype, {
    writeHead: function(status, headers) {
      var _super = this._super;
      _super.header('Status', status);
      forEach(headers, function(n, val) {
        _super.header(n, val);
      });
    },
    write: function(data) {
      this._super.write((Buffer.isBuffer(data)) ? data.toBin() : String(data));
    },
    end: function() {
      throw 0;
    }
  });

  module.exports = Response;
});