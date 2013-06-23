/*global app, define, iis */
define('adapter-response', function(require, exports, module) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;

  var CHARSET = /;\s*charset=([\w-]+)/i;

  function Response() {
    this._super = iis.res;
  }

  util.extend(Response.prototype, {
    writeHead: function(statusCode, statusReason, headers) {
      var _super = this._super;
      _super.status = statusCode + ' ' + statusReason;
      var contentType = headers['Content-Type'];
      if (contentType) {
        contentType = contentType.replace(CHARSET, function(_, charset) {
          _super.charset = charset;
          return '';
        });
        headers['Content-Type'] = contentType;
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
      //todo: move this to _writeHead ?
      app.emit('end');
      this._super.end();
    }
  });

  module.exports = Response;
});