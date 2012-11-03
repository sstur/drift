/*global app, define, iis */
define('adapter-response', function(require, exports, module) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;

  function Response() {
    this._super = iis.res;
  }

  util.extend(Response.prototype, {
    writeHead: function() {
      var res = this.response, _super = this._super;
      _super.status = res.status;
      var charset = getCharset(res.charset, res.headers['Content-Type']);
      if (charset) {
        _super.charset = charset;
      }
      _super.contentType = res.headers['Content-Type'];
      forEach(res.headers, function(n, val) {
        switch (n.toLowerCase()) {
          case 'content-type':
            break;
          case 'cache-control':
            _super.cacheControl = String(val);
            break;
          default:
            _super.addHeader(n, val);
        }
      });
      this._super.buffer = false;
    },
    write: function(data) {
      if (Buffer.isBuffer(data)) {
        this._super.binaryWrite(data.toBin());
      } else {
        this._super.write(String(data));
      }
    },
    end: function() {
      this._super.end();
    }
  });

  module.exports = Response;
});