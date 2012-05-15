/*global app, define */
define('wsh-request', function(require, exports, module) {
  "use strict";
  var qs = require('qs');

  var COOKIE_SEP = /[;,] */;

  function Request() {
    this._super = app.messenger.query('get-request');
    console.log('route:', this._super.url);
  }

  Request.prototype = {
    getMethod: function() {
      return this._super.method;
    },
    getURL: function() {
      return this._super.url;
    },
    getURLParts: function() {
      if (!this._url) {
        var parts = this._super.url.split('?');
        this._url = {path: qs.unescape(parts[0]), qs: parts[1] || ''};
      }
      return this._url;
    },
    getHeaders: function() {
      return this._super.headers;
    },
    getCookies: function() {
      if (!this._cookies) {
        this._cookies = parseCookies(this._super.headers.cookie);
      }
      return this._cookies;
    },
    getPostData: function() {
      return app.messenger.query('get-body');
    }
  };

  //Helpers
  function parseCookies(str) {
    str = (str == null) ? '' : String(str);
    var obj = {}, split = str.split(COOKIE_SEP);
    for (var i = 0, len = split.length; i < len; i++) {
      var part = split[i], pos = part.indexOf('=');
      if (pos < 0) {
        pos = part.length;
      }
      var key = part.slice(0, pos).trim(), val = part.slice(pos + 1).trim();
      if (!key) continue;
      // quoted values
      if (val[0] == '"') val = val.slice(1, -1);
      // only assign once
      if (!obj.hasOwnProperty(key)) {
        obj[key] = qs.unescape(val);
      }
    }
    return obj;
  }

  module.exports = Request;
});