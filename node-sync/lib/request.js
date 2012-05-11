/*global Fiber */
(function() {
  "use strict";
  var qs = require('./qs')
    , parseUrl = require('url').parse;

  var COOKIE_SEP = /[;,] */;

  function Request(httpReq) {
    this._super = httpReq;
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
        var parts = parseUrl(this._super.url);
        this._url = {path: qs.unescape(parts.pathname), qs: parts.search || ''};
      }
      return this._url;
    },
    getHeaders: function() {
      //var allHeaders = this._super.allHeaders || {};
      //var headers = parseHeaders(allHeaders);
      return this._super.headers;
    },
    getCookies: function() {
      if (!this._cookies) {
        this._cookies = parseCookies(this._super.headers.cookie);
      }
      return this._cookies;
    },
    getPostData: function() {
      var req = this._super;
      if (!req.body || !req.body.getParsed) {
        throw new Error('Request body parser not loaded');
      }
      return Fiber.sync(req.body.getParsed, req.body)();
    }
  };

  //Helpers
  function parseCookies(str) {
    str = (str == null) ? '' : String(str);
    var obj = {}, split = str.split(COOKIE_SEP);
    for (var i = 0, len = split.length; i < len; i++) {
      //var part = split[i], pos = part.indexOf('=');
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
})();