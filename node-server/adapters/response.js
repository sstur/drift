/*global global, require, app, adapter, Fiber */
var fs = require('fs');
app.define('adapter-response', function(require, exports, module) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;

  var STATUS_PARTS = /^(\d{3}\b)?\s*(.*)$/i;

  function Response(httpRes) {
    this._super = httpRes;
  }

  util.extend(Response.prototype, {
    writeHead: function(status, headers) {
      var parts = STATUS_PARTS.exec(status);
      var statusCode = parts[1] || '200', reasonPhrase = parts[2];
      if (reasonPhrase) {
        this._super.writeHead(statusCode, reasonPhrase, headers);
      } else {
        this._super.writeHead(statusCode, headers);
      }
    },
    write: function(chunk) {
      this._super.write(Buffer.isBuffer(chunk) ? chunk : new Buffer(chunk));
    },
    end: function() {
      this._super.end();
      Fiber.current.abort();
    },
    streamFile: function(path) {
      var _super = this._super;
      var fullpath = global.mappath(path);
      console.log('stream file: ' + fullpath);
      this.writeHead();
      Fiber.current.abort(function() {
        fs.createReadStream(fullpath).pipe(_super);
      });
    }
  });

  module.exports = Response;

});