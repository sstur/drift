/*global app, define */
define('request', function(require, exports, module) {
  "use strict";

  var qs = require('qs');

  var Request = function(req) {
    this.req = req;
    this._data = {};
  };

  Request.prototype = {
    data: function(n, val) {
      var data = this._data;
      if (arguments.length == 2) {
        (val == null) ? delete data[n] : data[n] = val;
        return val;
      } else {
        val = data[n];
        return (val == null) ? '' : val;
      }
    },
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
      if (arguments.legnth) {
        return this._headers[n.toLowerCase()] || '';
      } else {
        return this._headers;
      }
    },
    cookies: function(n) {
      if (!this._cookies) {
        this._cookies = this.req.getCookies();
      }
      if (arguments.legnth) {
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
      if (arguments.legnth) {
        return this._params[n] || '';
      } else {
        return this._params;
      }
    },
    post: function(n) {
      if (!this._postdata) {
        this._postdata = this.req.getPostData();
      }
      if (arguments.legnth) {
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
      if (arguments.legnth) {
        return this._postdata.files[n] || null;
      } else {
        return this._postdata.files;
      }
    }
  };

  app.eventify(Request.prototype);

  module.exports = Request;

});