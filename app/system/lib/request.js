/*global app, define */
define('request', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var util = require('util');

  function Request(req) {
    this.req = req;
    this._data = {};
    this._params = {};
  }

  app.eventify(Request.prototype);

  util.extend(Request.prototype, {
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
      if (arguments.length) {
        return this._headers[n.toLowerCase()] || '';
      } else {
        return this._headers;
      }
    },
    cookies: function(n) {
      if (!this._cookies) {
        this._cookies = this.req.getCookies();
      }
      if (arguments.length) {
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
      if (!this._qsParams) {
        this._qsParams = qs.parse(this.url('qs'));
        util.extend(this._params, this._qsParams);
      }
      if (arguments.length) {
        return this._params[n] || '';
      } else {
        return this._params;
      }
    },
    getPostData: function() {
      if (!this._postdata) {
        util.propagateEvents(this.req, this, 'file');
        this._postdata = this.req.getPostData();
      }
      return this._postdata;
    },
    post: function(n) {
      var postdata = this.getPostData();
      if (arguments.length) {
        return postdata.fields[n.toLowerCase()] || '';
      } else {
        return postdata.fields;
      }
    },
    uploads: function(n) {
      var postdata = this.getPostData();
      if (!postdata.files) return null;
      if (arguments.length) {
        return postdata.files[n] || null;
      } else {
        return postdata.files;
      }
    }
  });

  module.exports = Request;

});