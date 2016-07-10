/*global app, define, iis */
define('adapter-request', function(require, exports, module) {
  'use strict';

  var Buffer = require('buffer').Buffer;

  var REG_URL = /^([^:\/]+:\/\/)?([^\/]*)(.*)$/;

  function Request() {
    this._super = iis.req;
  }
  app.eventify(Request.prototype);

  Object.assign(Request.prototype, {
    _get: function(n) {
      var key = n.replace(/-/g, '_').toUpperCase();
      var val = this._super.serverVariables(key).item() || this._super.serverVariables('HTTP_' + key).item();
      return val || '';
    },
    getMethod: function() {
      var method = this._get('method');
      //POST is mis-reported as GET when using 404 method in IIS 6
      if (method == 'GET' && this._get('Content-Type')) {
        method = 'POST';
      }
      return method;
    },
    getURL: function() {
      //todo: these header names should be specified in cfg e.g. "original_url_header"
      //if the original url (pathname) is in a header
      var url = this._get('X-Rewrite-URL') || this._get('X-Original-URL');
      if (app.cfg('virtual_url') || !url) {
        //else we assume it's embedded in the query string (IIS 404 method)
        url = this._get('Query-String').match(REG_URL).pop() || '/';
      }
      return url;
    },
    getHeaders: function() {
      return this._get('all-raw');
    },
    getRemoteAddress: function() {
      return this._get('remote-addr');
    },
    read: function(bytes) {
      try {
        var bin = this._super.binaryRead(bytes);
      } catch (e) {
        throw new Error('Could not read ' + bytes + ' bytes from request body: ' + e.message);
      }
      //ensure our request doesn't timeout while we are receiving body
      if (!this.scriptTimeout) {
        this.scriptTimeout = iis.server.scriptTimeout = app.cfg('upload_timeout') || 3600;
      }
      return new Buffer(bin);
    }
  });

  module.exports = Request;
});
