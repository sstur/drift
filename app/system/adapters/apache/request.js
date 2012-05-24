/*global app, define, apache, system */
define('apache-request', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var Buffer = require('buffer').Buffer;
  var BodyParser = require('body-parser');

  var varmap = {
    ipaddr: 'REMOTE_ADDR'
  };

  var special = {
    content_type: 'content-type',
    content_length: 'content-length'
  };

  var REG_COOKIE_SEP = /[;,] */;

  function Request() {
    this._super = apache;
  }

  Request.prototype = {
    get: function(n) {
      var key = n.replace(/-/g, '_').toUpperCase();
      return system.env[varmap[n]] || system.env[key] || system.env['HTTP_' + key] || '';
    },
    getMethod: function() {
      return this.get('request-method');
    },
    getURL: function() {
      return this.get('request-uri');
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
        var headers = {}, all = system.env;
        for (var n in all) {
          var key = n.toLowerCase(), val = all[n];
          if (special[key] || key.slice(0, 5) == 'http_') {
            key = key.replace(/^http_/, '').replace(/_/g, '-');
            headers[key] = headers[key] ? headers[key] + ', ' + val : val;
          }
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
    read: function(bytes) {
      return new Buffer(apache.read(bytes)).toString('binary');
    },
    getPostData: function() {
      var parser = new BodyParser(this.getHeaders(), this.read);
      //parser.on('file', function(file) {});
      return parser.parse();
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