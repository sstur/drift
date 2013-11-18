/*global app, define */
define('mock-request', function(require, exports, module) {
  "use strict";
  var qs = require('qs');
  var util = require('util');

  function Request(data) {
    if (typeof data == 'string') {
      data = {url: data};
    }
    data = data || {};
    data.url = data.url || '/';
    data.method = data.method || 'GET';
    data.headers = data.headers || {};
    data.remoteAddr = data.remoteAddr || '127.0.0.1';
    this._data = data;
  }

  util.extend(Request.prototype, {
    getMethod: function() {
      return this._data.method;
    },
    getURL: function() {
      return this._data.url;
    },
    getHeaders: function() {
      var headers = this._data.headers;
      if (typeof headers == 'object') {
        headers = Object.keys(headers).reduce(function(obj, key) {
          obj[key.toLowerCase()] = headers[key];
          return obj;
        }, {});
      }
      return headers;
    },
    getRemoteAddress: function() {
      return this._data.remoteAddr;
    },
    read: function(bytes) {
      //todo: read from file-system for testing
      throw new Error('Could not read ' + bytes + ' bytes from request body');
    }
  });

  module.exports = Request;
});