/*global global, require, app, adapter */
app.define('adapter-request', function(require, exports, module) {
  "use strict";

  var util = require('util');
  var BodyParser = require('body-parser');

  function Request(req) {
    //node's incoming http request
    this._super = req;
    //pause so that we can use the body parser later
    req.pause();
  }

  util.extend(Request.prototype, {
    getMethod: function() {
      return this._super.method;
    },
    getURL: function() {
      return this._super.url;
    },
    getHeaders: function() {
      return this._super.headers;
    },
    getRemoteAddress: function() {
      return this._super.connection.remoteAddress;
    },
    getBodyParser: function(opts) {
      return new BodyParser(this.getHeaders(), this._super, opts);
    },
    read: function(bytes) {
      throw new Error('Body Parser: nodeRequest.read() not implemented');
      //this._super.read(bytes);
    }
  });

  module.exports = Request;
});