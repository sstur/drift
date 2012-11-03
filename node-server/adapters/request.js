/*global global, require, app, adapter */
app.define('adapter-request', function(require, exports, module) {
  "use strict";

  function Request(nodeReq) {
    this._super = nodeReq;
  }

  Request.prototype = {
    getMethod: function() {
      return this._super.method;
    },
    getURL: function() {
      return this._super.url;
    },
    getHeaders: function() {
      return this._super.headers;
    },
    getRemoteHost: function() {
      return this._super.connection.remoteAddress;
    },
    parseReqBody: function() {
      //todo: fix
      //var req = this._super;
      //if (!req.body || !req.body.getParsed) {
      //  throw new Error('Request body parser not loaded');
      //}
      //return Fiber.sync(req.body.getParsed, req.body)();
    }
  };

  module.exports = Request;
});