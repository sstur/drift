/*global app, define, iis */
define('adapter-request', function(require, exports, module) {
  "use strict";
  var qs = require('qs');
  var util = require('util');
  var Buffer = require('buffer').Buffer;
  var BodyParser = require('body-parser');

  var REG_URL = /^([^:\/]+:\/\/)?([^\/]*)(.*)$/;

  function Request() {
    this._super = iis.req;
  }

  util.extend(Request.prototype, {
    _get: function(n) {
      var val, key = n.replace(/-/g, '_').toUpperCase();
      val = this._super.serverVariables(key).item() || this._super.serverVariables('HTTP_' + key).item();
      return val || '';
    },
    getMethod: function() {
      var method = this._get('method');
      this.getHeaders();
      //POST is mis-reported as GET in IIS6 404 fallback
      if (method == 'GET' && this._get('Content-Type')) {
        method = 'POST';
      }
      return method;
    },
    getURL: function() {
      var url = this._get('X-Rewrite-URL') || this._get('X-Original-URL');
      if (app.cfg('virtual_url') || !url) {
        //url path embedded in query
        url = this._get('Query-String').match(REG_URL).pop() || '/';
      }
      return url;
    },
    getHeaders: function() {
      if (!this._headers) {
        this._headers = parseHeaders(this._get('all-raw'));
      }
      return this._headers;
    },
    getRemoteAddress: function() {
      return this._get('remote-addr');
    },
    _read: function(bytes) {
      try {
        var bin = this._super.binaryRead(bytes);
      } catch(e) {
        throw new Error('Could not read ' + bytes + ' bytes from request body: ' + e.message);
      }
      return new Buffer(bin);
    },
    parseReqBody: function(emitter) {
      var opts = {
        autoSavePath: app.cfg('auto_save_uploads')
      };
      var parser = new BodyParser(this.getHeaders(), this._read.bind(this), opts);
      util.propagateEvents(parser, emitter, 'file upload-progress');
      return parser.parse();
    }
  });

  function parseHeaders(raw) {
    var headers = {}, all = raw.split('\r\n');
    for (var i = 0; i < all.length; i++) {
      var header = all[i], pos = header.indexOf(':');
      if (pos < 0) continue;
      var n = header.slice(0, pos), val = header.slice(pos + 1).trim(), key = n.toLowerCase();
      headers[key] = headers[key] ? headers[key] + ', ' + val : val;
    }
    return headers;
  }

  module.exports = Request;
});