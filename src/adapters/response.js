'use strict';
const _fs = require('fs');

const Fiber = require('../lib/fiber');
const { mapPath } = require('../mapPath');
const fs = require('./fs');

function Response(httpRes) {
  this._super = httpRes;
}

Object.assign(Response.prototype, {
  writeHead: function(statusCode, statusReason, headers) {
    this._super.writeHead(statusCode, statusReason || '', headers);
  },
  write: function(data) {
    this._super.write(Buffer.isBuffer(data) ? data : Buffer.from(data));
  },
  end: function() {
    this._super.end();
    //fire end event after we have finished the response to perform things like cleanup
    this.req.emit('end');
    Fiber.current.abort();
  },
  streamFile: function(statusCode, statusReason, headers, path) {
    var _super = this._super;
    var info = fs.getFileInfo(path);
    headers['Content-Length'] = info.size;
    this.writeHead(statusCode, statusReason, headers);
    process.nextTick(function() {
      var fullpath = mapPath(path);
      var readStream = _fs.createReadStream(fullpath);
      readStream.pipe(_super);
    });
    this.req.emit('end');
    Fiber.current.abort();
  },
});

module.exports = Response;
