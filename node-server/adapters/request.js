/*global global, require, app, adapter */
app.define('adapter-request', function(require, exports, module) {
  "use strict";

  var util = require('util');
  var BodyParser = require('body-parser');

  function Request(req) {
    //node's incoming http request instance
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
    parseReqBody: function(emitter) {
      var req = this._super, res = this.res;
      var opts = {
        autoSavePath: app.cfg('auto_save_uploads')
      };
      var parser = new BodyParser(req, req.headers, opts);
      util.propagateEvents(parser, emitter, 'file upload-progress');
      console.log(Object.keys(parser.__proto__));
      return parser.parse();
    }
  });

  module.exports = Request;
});