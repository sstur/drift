/*global app, define */
define('iis-request', function(require, exports, module) {
  "use strict";
  var qs = require('qs');

  var iis = {
    req: global['Request'],
    res: global['Response']
  };
  var varmap = {
    ipaddr: 'REMOTE_ADDR',
    headers: 'ALL_RAW'
  };

  var REG_URL = /^([^:\/]+:\/\/)?([^\/]*)(.*)$/;
  var REG_COOKIE_SEP = /[;,] */;

  function Request() {
    this._super = iis.req;
  }

  Request.prototype = {
    get: function(n) {
      var val, key = n.replace(/-/g, '_').toUpperCase();
      if (varmap[n]) {
        val = iis.req.serverVariables(varmap[n]).item();
      }
      if (!val) {
        val = iis.req.serverVariables(key).item() || iis.req.serverVariables('HTTP_' + key).item();
      }
      return val || '';
    },
    getMethod: function() {
      return this.get('method');
    },
    getURL: function() {
      var url = this.get('X-Rewrite-URL') || this.get('X-Original-URL');
      if (!url) {
        //when using 404 handler instead of rewrites
        url = this.get('Query-String').match(REG_URL).pop() || '/';
      }
      return url;
    },
    getURLParts: function() {
      if (!this._url) {
        var parts = this.getURL().split('?');
        this._url = {path: qs.unescape(parts[0]), qs: parts[1] || ''};
      }
      return this._url;
    },
    getHeaders: function() {
      if (!this._headers) {
        var headers = {}, all = this.get('headers').split('\r\n');
        for (var i = 0; i < all.length; i++) {
          var header = all[i], pos = header.indexOf(':');
          var n = header.slice(0, pos), val = header.slice(pos + 1).trim(), key = n.toLowerCase();
          headers[key] = headers[key] ? headers[key] + ', ' + val : val;
        }
        this._headers = headers;
      }
      return this._headers;
    },
    getCookies: function() {
      if (!this._cookies) {
        var headers = this.getHeaders();
        this._cookies = parseCookies(headers.cookie);
      }
      return this._cookies;
    },
    getPostData: function() {
      //todo
    }
  };

  //Helpers
  function parseCookies(str) {
    str = (str == null) ? '' : String(str);
    var obj = {}, split = str.split(REG_COOKIE_SEP);
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