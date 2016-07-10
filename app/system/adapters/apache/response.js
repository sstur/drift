/*global app, define, apache */
define('adapter-response', function(require, exports, module) {
  'use strict';

  var Buffer = require('buffer').Buffer;

  function Response() {
    this._super = apache;
  }

  Object.assign(Response.prototype, {
    writeHead: function(statusCode, statusReason, headers) {
      var _super = this._super;
      _super.header('Status', statusCode + ' ' + statusReason);
      forEach(headers, function(n, val) {
        _super.header(n, val);
      });
    },
    write: function(data) {
      this._super.write((Buffer.isBuffer(data)) ? data.toBin() : String(data));
    },
    end: function() {
      app.emit('end');
      throw 0;
    }
  });

  module.exports = Response;
});
