/*global global, require, app, adapter, Fiber */
var fs = require('fs');
app.define('adapter-response', function(require, exports, module) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;

  function Response(httpRes) {
    this._super = httpRes;
  }

  util.extend(Response.prototype, {
    writeHead: function(statusCode, statusReason, headers) {
      this._super.writeHead(statusCode, statusReason || '', headers);
    },
    write: function(chunk) {
      this._super.write(Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk));
    },
    end: function() {
      this._super.end();
      Fiber.current.abort();
    },
    streamFile: function(path, headers) {
      var _super = this._super;
      var fullpath = global.mappath(path);
      console.log('stream file: ' + fullpath);
      this.writeHead('200', 'OK', headers);
      Fiber.current.abort(function() {
        fs.createReadStream(fullpath).pipe(_super);
      });
    }
  });

  module.exports = Response;

});