/*global app, define */
//todo: this.req becomes this._super
define('request', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var util = require('util');

  var HTTP_METHODS = {GET: 1, HEAD: 1, POST: 1, PUT: 1, DELETE: 1};

  function Request(req) {
    this.req = req;
    this._data = {};
    this._params = {};
  }

  app.eventify(Request.prototype);

  util.extend(Request.prototype, {
    //exposes a simple way to attache data to the req object
    //todo: should this be removed?
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
      //method override (for methods like PUT/DELETE that may be unsupported at the server level)
      var method = (this.headers('X-HTTP-Method-Override') || this.params('_method')).toUpperCase();
      method = (method in HTTP_METHODS) ? method : this.req.getMethod();
      return (typeof s == 'string') ? (s.toUpperCase() == method) : method;
    },
    //todo: remove req._qsParams and just use _params
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
    },
    isAjax: function() {
      return (this.headers('x-requested-with').toLowerCase() == 'xmlhttprequest');
    }
  });

  module.exports = Request;

});