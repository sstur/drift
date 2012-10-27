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
      if (part) {
        if (!this.url_parts) this.url_parts = this._super.getURLParts();
        return this.url_parts[part];
      } else {
        if (!this._url) this._url = this._super.getURL();
        return this._url;
      }
    },
    headers: function(n) {
      if (!this._headers) {
        this._headers = this._super.getHeaders();
      }
      if (arguments.length) {
        return this._headers[n.toLowerCase()] || '';
      } else {
        return this._headers;
      }
    },
    cookies: function(n) {
      if (!this._cookies) {
        this._cookies = this._super.getCookies();
      }
      if (arguments.length) {
        return this._cookies[n] || '';
      } else {
        return this._cookies;
      }
    },
    method: function(s) {
      //method override (for methods like PUT/DELETE that may be unsupported at the server level)
      var method = (this.headers('X-HTTP-Method-Override') || this.params('_method')).toUpperCase();
      method = (method in HTTP_METHODS) ? method : this._super.getMethod();
      return (typeof s == 'string') ? (s.toUpperCase() == method) : method;
    },
    params: function(n) {
      if (!this._params) {
        this._params = qs.parse(this.url('qs'));
      }
      if (arguments.length) {
        return this._params[n] || '';
      } else {
        return this._params;
      }
    },
    _parseReqBody: function() {
      if (!this._body && this.method() in BODY_ALLOWED) {
        util.propagateEvents(this._super, this, 'file');
        var result = this._super.parseReqBody();
        if (result instanceof Error) {
          var statusCode = result.statusCode || 400; //400 Bad Request
          this.res.die(statusCode, {error: 'Unable to parse request body; ' + result.description});
        }
        this._body = result;
      }
      return this._body || (this._body = {files: {}, fields: {}});
    },
    post: function(n) {
      var parsed = this._parseReqBody();
      if (arguments.length) {
        return parsed.fields[n.toLowerCase()] || '';
      } else {
        return parsed.fields;
      }
    },
    uploads: function(n) {
      var parsed = this._parseReqBody();
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

  module.exports = Request;

});