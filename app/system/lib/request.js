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
        return url.full;
      }
    },
    method: function(s) {
      if (!this._method) {
        //method override (for JSONP and platforms that don't support PUT/DELETE)
        this._method = (this.headers('X-HTTP-Method-Override') || this.params('_method')).toUpperCase();
        this._method = (this._method in HTTP_METHODS) ? this._method : this._super.getMethod();
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
    params: function(n) {
      var params = this._params || (this._params = qs.parse(this.url('qs')));
      if (arguments.length) {
        return params[n] || '';
      } else {
        return params;
      }
    },
    post: function(n) {
      var parsed = this._body || (this._body = parseReqBody(this));
      if (arguments.length) {
        return parsed.fields[n.toLowerCase()] || '';
      } else {
        return parsed.fields;
      }
    },
    uploads: function(n) {
      var parsed = this._body || (this._body = parseReqBody(this));
      if (!parsed.files) return null;
      if (arguments.length) {
        return parsed.files[n] || null;
      } else {
        return parsed.files;
      }
    },
    isAjax: function() {
      return (this.headers('x-requested-with').toLowerCase() == 'xmlhttprequest');
    }
  });

  //Helpers

  var REG_COOKIE_SEP = /[;,] */;

  function parseURL(url) {
    var pos = url.indexOf('?')
      , search = (pos > 0) ? url.slice(pos) : '';
    return {
      full: url,
      path: qs.unescape(search ? url.slice(0, pos) : url),
      search: search,
      qs: search.slice(1)
    };
  }

  function parseReqBody(req) {
    var body = {files: {}, fields: {}};
    //todo: check method in parser?
    if (req.method() in BODY_ALLOWED) {
      //passing req, ensures body-parser events propogate to request
      //todo: use try/catch
      var result = req._super.parseReqBody(req);
      if (result instanceof Error) {
        var statusCode = result.statusCode || 400; //400 Bad Request
        req.res.die(statusCode, {error: 'Unable to parse request body; ' + result.description});
      }
      body = result;
    }
    return body;
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