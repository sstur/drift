/*global app, define */
define('adapter-request', function(require, exports, module) {
  "use strict";
  var qs = require('qs');
  var util = require('util');
  var Buffer = require('buffer').Buffer;
  var BodyParser = require('body-parser');

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
      var headers = {};
      forEach(this._data.headers, function(key, value) {
        headers[key.toLowerCase()] = value;
      });
      return headers;
    },
    getRemoteAddress: function() {
      return this._data.remoteAddr;
    },
    _read: function(bytes) {
      //todo: read from file-system for testing
      throw new Error('Could not read ' + bytes + ' bytes from request body');
    },
    parseReqBody: function(parent) {
      var opts = {
        autoSavePath: ('autoSavePath' in parent) ? parent.autoSavePath : app.cfg('auto_save_uploads')
      };
      var parser = new BodyParser(this.getHeaders(), this._read.bind(this), opts);
      util.propagateEvents(parser, parent, 'file upload-progress');
      return parser.parse();
    }
  });

  module.exports = Request;
});