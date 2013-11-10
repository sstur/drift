/*global app, define */
define('dummy-response', function(require, exports, module) {
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
        val = (val == null) ? '' : String(val);
        self.headers[n] = val;
      });
      if (app.cfg('debug_open_connections')) {
        self.headers['X-Open-DB-Connections'] = app.data('debug:open_connections') || 'None';
      }
    },
    write: function(data) {
      this.body.push(typeof data == 'string' ? data : toString(data));
    },
    end: function() {
      throw null;
    }
  });

  var _toString = Object.prototype.toString;
  function toString(obj) {
    return (obj == null) ? String(obj) : (typeof obj.toString == 'funtion') ? obj.toString() : _toString.call(obj);
  }

  module.exports = Response;
});