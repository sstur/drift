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
      this._super.header('Status', status);
      //headers['Content-Type'] = buildContentType(charset, headers['Content-Type']);
      for (var n in headers) {
        this._super.header(n, headers[n]);
      }
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