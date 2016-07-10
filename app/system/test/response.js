/*global global, app, define, Buffer */
define('mock-response', function(require, exports, module) {
  'use strict';

  var fs = require('fs');

  function Response() {
    this.status = '';
    this.headers = {};
    this.body = [];
  }

  Object.assign(Response.prototype, {
    writeHead: function(statusCode, statusReason, headers) {
      var self = this;
      self.status = statusCode + ' ' + statusReason;
      forEach(headers, function(n, val) {
        val = Array.isArray(val) ? val : String(val);
        self.headers[n] = val;
      });
      if (app.cfg('debug_open_connections')) {
        self.headers['X-Open-DB-Connections'] = app.data('debug:open_connections') || 'None';
      }
    },
    write: function(data) {
      this.body.push(Buffer.isBuffer(data) ? data.toString('binary') : toString(data));
    },
    end: function() {
      this.req.emit('end');
      throw null;
    },
    getBody: function() {
      return this.body.join('');
    },
    getFullResponse: function() {
      var lines = [this.status].concat(serializeHeaders(this.headers));
      lines.push('');
      lines.push(this.getBody());
      return lines.join('\n');
    },
    streamFile: function(statusCode, statusReason, headers, path) {
      var data = fs.readFile(path);
      this.writeHead(statusCode, statusReason, headers);
      this.write(data);
      this.end();
    }
  });

  var _toString = Object.prototype.toString;
  function toString(obj) {
    return (obj == null) ? String(obj) : (typeof obj.toString == 'function') ? obj.toString() : _toString.call(obj);
  }

  function serializeHeaders(headers) {
    var lines = [];
    forEach(headers, function(name, value) {
      lines.push(name + ': ' + value);
    });
    return lines;
  }

  module.exports = Response;
});
