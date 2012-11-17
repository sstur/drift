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
        var override = (this.headers('X-HTTP-Method-Override') || this.query('_method')).toUpperCase();
        this._method = (override in HTTP_METHODS) ? override : this._super.getMethod();
      }
      return (typeof s == 'string') ? (s.toUpperCase() == this._method) : this._method;
    },
    headers: function(n) {
      var headers = this._headers || (this._headers = this._super.getHeaders());
      if (arguments.length) {
        return headers[n.toLowerCase()] || '';
      } else {
        return headers;
      }
    },
    cookies: function(n) {
      var cookies = this._cookies || (this._cookies = parseCookies(this.headers('cookie')));
      if (arguments.length) {
        return cookies[n] || '';
      } else {
        return cookies;
      }
    },
    query: function(n) {
      var query = this._query || (this._query = qs.parse(this.url('qs')));
      if (arguments.length) {
        return query[n] || '';
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
      return (this.headers('x-requested-with').toLowerCase() == 'xmlhttprequest');
    }
  });


  //Helpers

  var REG_COOKIE_SEP = /[;,] */;

  function parseURL(url) {
    var pos = url.indexOf('?')
      , search = (pos > 0) ? url.slice(pos) : ''
      , rawPath = search ? url.slice(0, pos) : url;
    return {
      raw: url,
      rawPath: rawPath,
      path: qs.unescape(rawPath),
      search: search,
      qs: search.slice(1)
    };
  }

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