/*global app, define */
define('request', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var util = require('util');

  var HTTP_METHODS = {GET: 1, HEAD: 1, POST: 1, PUT: 1, DELETE: 1};
  var BODY_ALLOWED = {POST: 1, PUT: 1};

  function Request(req) {
    this._super = req;
  }

  app.eventify(Request.prototype);

  util.extend(Request.prototype, {
    url: function(part) {
      var url = this._url || (this._url = parseURL(this._super.getURL()));
      if (part) {
        return url[part];
      } else {
        return url.raw;
      }
    },
    method: function(s) {
      if (!this._method) {
        //method override (for JSONP and platforms that don't support PUT/DELETE)
        //todo: this query param (_method) should be specified/disabled in config
        var override = (this.headers('X-HTTP-Method-Override') || this.query('_method')).toUpperCase();
        this._method = (override in HTTP_METHODS) ? override : this._super.getMethod();
      }
      return (typeof s == 'string') ? (s.toUpperCase() == this._method) : this._method;
    },
    headers: function(n) {
      var headers = this._headers || (this._headers = parseHeaders(this._super.getHeaders()));
      if (arguments.length) {
        return headers[n.toLowerCase()] || '';
      } else {
        return headers;
      }
    },
    cookies: function(n) {
      var cookies = this._cookies || (this._cookies = parseCookies(this.headers('cookie')));
      if (arguments.length) {
        return cookies[n.toLowerCase()] || '';
      } else {
        return cookies;
      }
    },
    query: function(n) {
      var query = this._query || (this._query = qs.parse(this.url('qs')));
      if (arguments.length) {
        return query[n.toLowerCase()] || '';
      } else {
        return query;
      }
    },
    parseReqBody: function() {
      if (!this._body) {
        try {
          //passing req, ensures body-parser events propagate to request
          this._body = (this.method() in BODY_ALLOWED) ? this._super.parseReqBody(this) : {};
        } catch(e) {
          if (typeof e == 'string' && e.match(/^\d{3}\b/)) {
            this.res.die(e);
          } else {
            this.res.die(400, {error: 'Unable to parse request body; ' + e.message});
          }
        }
      }
      return this._body;
    },
    body: function(n) {
      var body = this.parseReqBody();
      if (arguments.length) {
        return body[n.toLowerCase()];
      } else {
        return body;
      }
    },
    isAjax: function() {
      //todo: check accepts, x-requested-with, and qs (jsonp/callback)
      return (this.headers('X-Requested-With').toLowerCase() == 'xmlhttprequest');
    }
  });


  //Helpers

  var REG_COOKIE_SEP = /[;,] */;

  function parseURL(url) {
    var pos = url.indexOf('?');
    var search = (pos > 0) ? url.slice(pos) : '';
    var rawPath = search ? url.slice(0, pos) : url;
    //todo: normalize rawPath: rawPath.split('/').map(decode).map(encode).join('/')
    return {
      raw: url,
      rawPath: rawPath,
      path: qs.unescape(rawPath),
      search: search,
      qs: search.slice(1)
    };
  }

  function parseHeaders(input) {
    if (typeof input != 'string') return input;
    var headers = {};
    var lines = input.split('\r\n').join('\n').split('\n');
    for (var i = 0, len = lines.length; i < len; i++) {
      var line = lines[i];
      var index = line.indexOf(':');
      if (index < 0) continue;
      var key = line.slice(0, index).trim().toLowerCase();
      var value = line.slice(index + 1).trim();
      headers[key] = headers[key] ? headers[key] + ', ' + value : value;
    }
    return headers;
  }

  function parseCookies(str) {
    str = (str == null) ? '' : String(str);
    var cookies = {};
    var parts = str.split(REG_COOKIE_SEP);
    for (var i = 0, len = parts.length; i < len; i++) {
      var part = parts[i];
      var index = part.indexOf('=');
      if (index < 0) {
        index = part.length;
      }
      var key = part.slice(0, index).trim().toLowerCase();
      // no empty keys; no duplicates
      if (key && !(key in cookies)) {
        var value = part.slice(index + 1).trim();
        // quoted values
        if (value[0] == '"') value = value.slice(1, -1);
        cookies[key] = qs.unescape(value);
      }
    }
    return cookies;
  }

  module.exports = Request;

});