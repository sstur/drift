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
      if (this._super.method != 'POST') {
        return {fields: {}, files: {}};
      }
      var type = this._super.headers['content-type'];
      type = type && type.toLowerCase();
      switch(type) {
        case 'application/x-www-form-urlencoded':
          return this.processFormBody();
        case 'application/json':
          return this.processJSONBody();
        case 'multipart/form-data':
          return this.processMultiPartBody();
        case 'application/octet-stream':
          return this.processBinaryBody();
      }
      this.httpError(415);
    },
    getBody: function(opts) {
      var req = this._super;
      opts = opts || {};
      return Fiber.sync(req.getBody, req)(opts);
    },
    processFormBody: function() {
      var body = this.getBody()
        , fields = qs.parse(body);
      return {fields: fields, files: {}};
    },
    processJSONBody: function() {
      var body = this.getBody(), fields = {};
      try {
        fields = JSON.parse(body);
      } catch(e) {
        this.httpError(400);
      }
      if (typeof fields != 'object') {
        fields = {data: fields};
      }
      return {fields: fields, files: {}};
    },
    processMultiPartBody: function() {
      //todo
    },
    processBinaryBody: function() {
      //todo
    },
    httpError: function(code) {
      var res = this._super.res;
      Fiber.current.abort(function() {
        res.httpError(code);
      });
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