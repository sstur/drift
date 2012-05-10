/*global app, define */
define('node-response', function(require, exports, module) {
  "use strict";

  var TEXT_CTYPES = /^text\/|\/json$/i;
  var STATUS_PARTS = /^(\d{3}\b)?\s*(.*)$/i;

  var headers = ['Accept-Ranges', 'Age', 'Allow', 'Cache-Control', 'Connection', 'Content-Encoding', 'Content-Language',
    'Content-Length', 'Content-Location', 'Content-MD5', 'Content-Disposition', 'Content-Range', 'Content-Type', 'Date',
    'ETag', 'Expires', 'Last-Modified', 'Link', 'Location', 'P3P', 'Pragma', 'Proxy-Authenticate', 'Refresh',
    'Retry-After', 'Server', 'Set-Cookie', 'Strict-Transport-Security', 'Trailer', 'Transfer-Encoding', 'Vary', 'Via',
    'Warning', 'WWW-Authenticate', 'X-Frame-Options', 'X-XSS-Protection', 'X-Content-Type-Options', 'X-Forwarded-Proto',
    'Front-End-Https', 'X-Powered-By', 'X-UA-Compatible'];

  //headers that allow multiple
  var allowMulti = {'Set-Cookie': 1};

  //index headers by lowercase
  var allHeaders = {};
  headers.forEach(function(header) {
    allHeaders[header.toLowerCase()] = header;
  });

  var buildContentType = function(charset, contentType) {
    //contentType may already have charset
    contentType = contentType.split(';')[0];
    charset = charset && charset.toUpperCase();
    return (charset && TEXT_CTYPES.test(contentType)) ? contentType + '; charset=' + charset : contentType;
  };

  function Response() {
    //init response buffer
    this.clear();
  }

  Response.prototype = {
    headers: function(n, val) {
      var headers = this.response.headers;
      if (arguments.length == 0) {
        return headers;
      }
      n = (n == null) ? '' : String(n);
      var key = allHeaders[n.toLowerCase()] || n;
      if (arguments.length == 1) {
        val = headers[key];
        return (val && val.join) ? val.join('; ') : val;
      } else
      if (val === null) {
        return (delete headers[key]);
      } else
      if (allowMulti[key]) {
        headers[key] ? headers[key].push(val) : headers[key] = [val];
      } else {
        headers[key] = val;
      }
    },
    cookies: function(n, val) {
      //cookies are a case-sensitive collection that will be serialized into
      // Set-Cookie header(s) when response is sent
      var cookies = this.response.cookies;
      if (arguments.length == 0) {
        return cookies;
      }
      if (arguments.length == 1) {
        return cookies[n];
      } else
      if (val === null) {
        return (delete cookies[n]);
      }
      var cookie = (typeof val == 'string') ? {value: val} : val;
      cookie.name = n;
      cookies[n] = cookie;
    },
    serializeCookie: function(cookie) {
      var out = [];
      out.push(cookie.name + '=' + encodeURIComponent(cookie.value));
      if (cookie.domain)
        out.push('Domain=' + cookie.domain);
      out.push('Path=' + (cookie.path || '/'));
      if (cookie.expires)
        out.push('Expires=' + cookie.expires.toGMTString());
      if (cookie.httpOnly)
        out.push('HttpOnly');
      if (cookie.secure)
        out.push('Secure');
      return out.join('; ');
    },
    charset: function(charset) {
      if (arguments.length) {
        return this.response.charset = charset;
      } else {
        return this.response.charset;
      }
    },
    status: function(status) {
      if (arguments.length) {
        return this.response.status = status;
      } else {
        return this.response.status;
      }
    },
    clear: function() {
      //reset response buffer
      this.response = {
        status: '200 OK',
        headers: {'Content-Type': 'text/plain'},
        cookies: {},
        charset: 'utf-8',
        body: []
      };
    },
    write: function(data) {
      this.response.body.push(String(data));
    },
    writebin: function(data) {
      this.write(data);
    },
    end: function() {
      var res = this.response, headers = res.headers;
      headers['Content-Type'] = buildContentType(res.charset, headers['Content-Type']);
      var cookies = this.response.cookies;
      for (var n in cookies) {
        this.headers('Set-Cookie', this.serializeCookie(cookies[n]));
      }
      //we must throw to unwind our call stack and get back to main loop
      throw this;
    },
    sendFile: function(opts) {
      //var res = this.response, httpRes = this._super;
      //if (Object.isPrimitive(opts)) {
      //  opts = {file: String(opts)};
      //}
      //if (!opts.ctype) {
      //  opts.ctype = this.headers('content-type');
      //}
      //opts.ctype = buildContentType(opts.charset || res.charset, opts.ctype);
      //if (!opts.name) {
      //  opts.name = opts.file.split('/').pop();
      //}
      //opts.fullpath = global.mappath('app/' + opts.file);
      //console.log('sendfile: ' + opts.fullpath);
      //httpRes.sendFile({
      //  path: opts.fullpath,
      //  contentType: opts.ctype,
      //  attachment: !!opts.attachment,
      //  filename: opts.name
      //});
    },
    debug: function(data) {
      this.clear();
      //todo: util.inspect
      this.write(JSON.stringify(data));
      this.end();
    }
  };

  module.exports = Response;
});