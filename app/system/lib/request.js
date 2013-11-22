/*global app, define */
define('request', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var util = require('util');
  var BodyParser = require('body-parser');

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
        this._method = (override in HTTP_METHODS) ? override : this._super.getMethod().toUpperCase();
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
    body: function(n) {
      var body = this._body || (this._body = this._parseBody());
      if (arguments.length) {
        return body[n.toLowerCase()];
      } else {
        return body;
      }
    },
    //todo: merge this with parseReqBody
    _parseBody: function() {
      try {
        //body-parser events will be propagated to this
        var body = (this.method() in BODY_ALLOWED) ? parseReqBody(this) : {};
      } catch(e) {
        if (typeof e == 'string' && e.match(/^\d{3}\b/)) {
          this.res.die(e);
        } else {
          this.res.die(400, {error: 'Unable to parse request body; ' + e.message});
        }
      }
      return body;
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
    return util.parseHeaders(input);
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
      // no empty keys
      if (!key) continue;
      var value = part.slice(index + 1).trim();
      // quoted values
      if (value[0] == '"') value = value.slice(1, -1);
      value = qs.unescape(value);
      cookies[key] = cookies[key] ? cookies[key] + ', ' + value : value;
    }
    return cookies;
  }

  function parseReqBody(req) {
    var _super = req._super;
    var opts = {
      autoSavePath: ('autoSavePath' in req) ? req.autoSavePath : app.cfg('auto_save_uploads')
    };
    var parser = new BodyParser(req.headers(), _super.read.bind(_super), opts);
    util.propagateEvents(parser, req, 'file upload-progress');
    return parser.parse();
  }

  module.exports = Request;

});