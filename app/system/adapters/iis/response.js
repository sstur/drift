/*global app, define, iis */
define('adapter-response', function(require, exports, module) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;

  var CHARSET = /\bcharset=([\w-]+)/i;

  function Response() {
    this._super = iis.res;
  }

  util.extend(Response.prototype, {
    writeHead: function(status, headers) {
      var _super = this._super;
      _super.status = status;
      var charset = CHARSET.exec(headers['Content-Type']);
      if (charset) {
        _super.charset = charset[1];
      }
      forEach(headers, function(n, val) {
        val = (val == null) ? '' : String(val);
        switch (n.toLowerCase()) {
          case 'content-type':
            _super.contentType = val;
            break;
          case 'cache-control':
            _super.cacheControl = val;
            break;
          default:
            _super.addHeader(n, val);
        }
      });
      _super.buffer = false;
    },
    write: function(data) {
      if (Buffer.isBuffer(data)) {
        this._super.binaryWrite(data.toBin());
      } else {
        this._super.write('' + data);
      }
    },
    end: function() {
      this._super.end();
    }
  });

  module.exports = Response;
});