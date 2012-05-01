/*global app, define */
define('request', function(require, exports, module) {
  "use strict";

  var qs = require('qs');

  var Request = function(req) {
    this.req = req;
  };

  Request.prototype = {
    url: function(part) {
      if (part) {
        if (!this.url_parts) this.url_parts = this.req.getURLParts();
        return this.url_parts[part];
      } else {
        if (!this._url) this._url = this.req.getURL();
        return this._url;
      }
    },
    headers: function(n) {
      if (!this._headers) {
        this._headers = this.req.getHeaders();
      }
      if (n) {
        return this._headers[n.toLowerCase()] || '';
      } else {
        return this._headers;
      }
    },
    cookies: function(n) {
      if (!this._cookies) {
        this._cookies = this.req.getCookies();
      }
      if (n) {
        return this._cookies[n] || '';
      } else {
        return this._cookies;
      }
    },
    method: function(s) {
      var r = this.req.getMethod();
      return (typeof s == 'string') ? (s.toUpperCase() == r) : r;
    },
    params: function(n) {
      if (!this._params) {
        this._params = qs.parse(this.req.url('qs'));
      }
      if (n) {
        return this._params[n] || '';
      } else {
        return this._params;
      }
    },
    post: function(n) {
      if (!this._postdata) {
        this._postdata = this.req.getPostData();
      }
      if (n) {
        return this._postdata.fields[n.toLowerCase()] || '';
      } else {
        return this._postdata.fields;
      }
    },
    uploads: function(n) {
      if (!this._postdata) {
        this._postdata = this.req.getPostData();
      }
      if (!this._postdata.files) return null;
      if (n) {
        return this._postdata.files[n] || null;
      } else {
        return this._postdata.files;
      }
    }
  };

  module.exports = Request;

});