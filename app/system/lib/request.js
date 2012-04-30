define('request', ['require', 'qs'], function(require, qs) {
  "use strict";

  var Request = function(req) {
    this.req = req;
  };

  Request.prototype = {
    url: function(part) {
      if (part) {
        if (!this.url_parts) this.url_parts = this.req.getURLParts();
        return this.url_parts[part];
      } else {
        if (!this.url) this.url = this.req.getURL();
        return this.url;
      }
    },
    headers: function(n) {
      if (!this.headers) this.headers = this.req.getHeaders();
      if (n) {
        return this.headers[n.toLowerCase()] || '';
      } else {
        return this.headers;
      }
    },
    cookies: function(n) {
      if (!this.cookies) this.cookies = this.req.getCookies();
      if (n) {
        return this.cookies[n] || '';
      } else {
        return this.cookies;
      }
    },
    method: function(s) {
      var r = this.req.getMethod();
      return (typeof s == 'string') ? (s.toUpperCase() == r) : r;
    },
    params: function(n) {
      if (!this.params) {
        this.params = qs.parse(this.req.url('qs'));
      }
      if (n) {
        return this.params[n] || '';
      } else {
        return this.params;
      }
    },
    post: function(n) {
      if (!this.postdata) this.postdata = this.req.getPostData();
      if (n) {
        return this.postdata.fields[n.toLowerCase()] || '';
      } else {
        return this.postdata.fields;
      }
    },
    uploads: function(n) {
      if (!this.postdata) this.postdata = this.req.getPostData();
      if (!this.postdata.files) return null;
      if (n) {
        return this.postdata.files[n] || null;
      } else {
        return this.postdata.files;
      }
    }
  };

  module.exports = Request;

});