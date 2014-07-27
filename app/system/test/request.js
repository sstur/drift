/*global app, define, Buffer */
define('mock-request', function(require, exports, module) {
  "use strict";
  var fs = require('fs');
  var qs = require('qs');
  var util = require('util');
  var BodyParser = require('body-parser');

  var dataPath = app.cfg('data_dir') || 'data/';

  function Request(data) {
    if (typeof data == 'string') {
      data = {url: data};
    }
    data = data || {};
    data.url = data.url || '/';
    data.method = data.method || 'GET';
    data.headers = data.headers || {};
    data.remoteAddr = data.remoteAddr || '127.0.0.1';
    //body can be path to file or raw data (Buffer)
    if (typeof data.body === 'string') {
      this._bodyFile = data.body;
    } else
    if (Buffer.isBuffer(data.body)) {
      var fileName = Math.floor(Math.random() * Math.pow(2, 53)).toString(36);
      this._bodyFile = dataPath + 'temp/' + fileName;
      fs.writeFile(this._bodyFile, data.body);
    }
    this._data = data;
  }
  app.eventify(Request.prototype);

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
    getBodyParser: function(opts) {
      return new BodyParser(this.getHeaders(), this._bodyFile, opts);
    },
    read: function() {
      throw new Error('Body Parser: request.read() not implemented');
    },
    //this is called in our tests on res.end
    cleanup: function() {
      if (this._bodyFile) {
        fs.deleteFile(this._bodyFile);
      }
    }
  });

  module.exports = Request;
});