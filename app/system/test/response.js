/*global app, define */
define('mock-response', function(require, exports, module) {
  "use strict";

  var util = require('util');

  function Response() {
    this.status = '';
    this.headers = {};
    this.body = [];
  }

  util.extend(Response.prototype, {
    writeHead: function(statusCode, statusReason, headers) {
      var self = this;
      self.status = statusCode + ' ' + statusReason;
      forEach(headers, function(n, val) {
        //note: is val guaranteed to be a string or array of strings?
        //if (val == null) val = '';
        val = Array.isArray(val) ? val : String(val);
        self.headers[n] = val;
      });
      if (app.cfg('debug_open_connections')) {
        self.headers['X-Open-DB-Connections'] = app.data('debug:open_connections') || 'None';
      }
    },
    write: function(data) {
      this.body.push(Buffer.isBuffer(data) ? data._raw : toString(data));
    },
    end: function() {
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