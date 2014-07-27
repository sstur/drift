/*global global, require, app, adapter, Fiber, Buffer */
var fs = require('fs');
app.define('adapter-response', function(require, exports, module) {
  "use strict";

  var util = require('util');

  function Response(httpRes) {
    this._super = httpRes;
  }

  util.extend(Response.prototype, {
    writeHead: function(statusCode, statusReason, headers) {
      this._super.writeHead(statusCode, statusReason || '', headers);
    },
    write: function(data) {
      this._super.write(Buffer.isBuffer(data) ? data : new Buffer(data));
    },
    end: function() {
      this._super.end();
      //fire end event on
      this.req.emit('end');
      Fiber.current.abort();
    },
    streamFile: function(statusCode, statusReason, headers, path) {
      var _super = this._super;
      this.writeHead(statusCode, statusReason, headers);
      process.nextTick(function() {
        var fullpath = app.mappath(path);
        fs.createReadStream(fullpath).pipe(_super);
      });
      this.req.emit('end');
      Fiber.current.abort();
    }
  });

  module.exports = Response;

});