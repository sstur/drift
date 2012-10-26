/*global app, define */
define('request', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var util = require('util');

  var HTTP_METHODS = {GET: 1, HEAD: 1, POST: 1, PUT: 1, DELETE: 1};

  function Request(req) {
    this._super = req;
    this._params = {};
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
    getPostData: function() {
      if (!this._postdata) {
        util.propagateEvents(this._super, this, 'file');
        this._postdata = this._super.getPostData();
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
    },
    isAjax: function() {
      return (this.headers('x-requested-with').toLowerCase() == 'xmlhttprequest');
    }
  });

  module.exports = Request;

});