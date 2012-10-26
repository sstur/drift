/*global app, define, iis */
//todo: possibly move getCookies and getPostData to higher-level request lib
define('adapter-request', function(require, exports, module) {
  "use strict";
  var qs = require('qs');
  var util = require('util');
  var Buffer = require('buffer').Buffer;
  var BodyParser = require('body-parser');

  var varmap = {
    ipaddr: 'REMOTE_ADDR',
    headers: 'ALL_RAW'
  };

  var REG_URL = /^([^:\/]+:\/\/)?([^\/]*)(.*)$/;
  var REG_COOKIE_SEP = /[;,] */;

  function Request() {
    this._super = iis.req;
  }

  app.eventify(Request.prototype);

  util.extend(Request.prototype, {
    _get: function(n) {
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
      var method = this._get('method');
      //POST is mis-reported as GET in 404 handler, so we make a best guess based on headers
      if (method == 'GET' && (this._get('Content-Type') || +this._get('Content-Length'))) {
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
    getURLParts: function() {
      if (!this._url) {
        var url = this.getURL()
          , pos = url.indexOf('?')
          , search = (pos > 0) ? url.slice(pos) : '';
        this._url = {path: qs.unescape(search ? url.slice(0, pos) : url), search: search, qs: search.slice(1)};
      }
      return this._url;
    },
    getHeaders: function() {
      if (!this._headers) {
        this._headers = parseHeaders(this._get('headers'));
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
      return new Buffer(iis.req.binaryRead(bytes)).toString('binary');
    },
    getPostData: function() {
      var parser = new BodyParser(this.getHeaders(), this.read);
      util.propagateEvents(parser, this, 'file');
      var err = parser.parse();
      if (err) {
        //todo: respond with correct http status
        throw err;
      }
      return parser.parsed;
    }
  });

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