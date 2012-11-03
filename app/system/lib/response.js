/*global app, define */
define('response', function(require, exports, module) {
  "use strict";

  //todo: move this to app/config
  var cfg = {
    logging: {response_time: 1}
  };

  var fs = require('fs');
  var util = require('util');
  var Buffer = require('buffer').Buffer;

  var RE_CTYPE = /^[\w-]+\/[\w-]+$/;
  var RE_STATUS = /^\d{3}\b/;
  var TEXT_CTYPES = /^text\/|\/json$/i;

  var knownHeaders = ['Accept-Ranges', 'Age', 'Allow', 'Cache-Control', 'Connection', 'Content-Encoding', 'Content-Language',
    'Content-Length', 'Content-Location', 'Content-MD5', 'Content-Disposition', 'Content-Range', 'Content-Type', 'Date',
    'ETag', 'Expires', 'Last-Modified', 'Link', 'Location', 'P3P', 'Pragma', 'Proxy-Authenticate', 'Refresh',
    'Retry-After', 'Server', 'Set-Cookie', 'Strict-Transport-Security', 'Trailer', 'Transfer-Encoding', 'Vary', 'Via',
    'Warning', 'WWW-Authenticate', 'X-Frame-Options', 'X-XSS-Protection', 'X-Content-Type-Options', 'X-Forwarded-Proto',
    'Front-End-Https', 'X-Powered-By', 'X-UA-Compatible'];

  //index headers by lowercase
  knownHeaders = knownHeaders.reduce(function(headers, header) {
    headers[header.toLowerCase()] = header;
    return headers;
  }, {});

  //headers that allow multiple
  var allowMulti = {'Set-Cookie': 1};

  var buildContentType = function(charset, contentType) {
    //contentType may already have charset
    contentType = contentType.split(';')[0];
    charset = charset && charset.toUpperCase();
    return (charset && TEXT_CTYPES.test(contentType)) ? contentType + '; charset=' + charset : contentType;
  };

  var getCharset = function(charset, contentType) {
    charset = charset || 'utf-8';
    if (TEXT_CTYPES.test(contentType)) {
      return charset.toUpperCase();
    }
  };


  function Response(res) {
    this._super = res;
    this._cookies = {};
    this._clear();
  }

  util.extend(Response.prototype, {
    clear: function(type, status) {
      //reset response buffer
      this.response = {
        status: status || '200 OK',
        headers: {'Content-Type': type || 'text/plain'},
        charset: 'utf-8',
        body: []
      };
    },

    //these methods manipulate the response buffer
    status: function(status) {
      if (arguments.length) {
        return this.response.status = status;
      } else {
        return this.response.status;
      }
    },
    charset: function(charset) {
      if (arguments.length) {
        return this.response.charset = charset;
      } else {
        return this.response.charset;
      }
    },
    headers: function(n, val) {
      var headers = this.response.headers;
      if (arguments.length == 0) {
        return headers;
      }
      n = (n == null) ? '' : String(n);
      var key = knownHeaders[n.toLowerCase()] || n;
      if (arguments.length == 1) {
        val = headers[key];
        //some header values are saved as an array
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
    write: function(data) {
      //don't write anything for head requests
      if (this.req.method('head')) return;
      if (isPrimitive(data)) {
        this.response.body.push(String(data));
      } else
      if (Buffer.isBuffer(data)) {
        this.response.body.push(data);
      } else {
        //stringify returns undefined in some cases
        this.response.body.push(JSON.stringify(data) || '');
      }
    },

    //these use the functions above to manipulate the response buffer
    contentType: function(type) {
      //hack to override application/json -> text/plain when not an xhr request
      //todo: should we check accepts header instead of x-requested-with
      if (type == 'application/json' && !this.req.isAjax()) {
        type = 'text/plain'
      }
      this.headers('Content-Type', type);
    },
    cookies: function(n, val) {
      //cookies are a case-sensitive collection that will be serialized into
      // Set-Cookie header(s) when response is sent
      var cookies = this._cookies;
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

    //these methods interface with the adapter (_super)
    sendStream: function(readStream) {
      this.req.emit('end');
      //commit the buffered headers
      var _super = this._super, response = this.response;
      _super.writeHead(response.status, response.headers);
      //this._super.buffer = false;
      readStream.on('data', function(data) {
        _super.write(data);
      });
      readStream.read();
      _super.end();
    },
    end: function() {
      var args = toArray(arguments);
      if (args.length) {
        if (args.length > 1 && RE_STATUS.test(args[0])) {
          this.status(args.shift());
        }
        if (args.length > 1 && RE_CTYPE.test(args[0])) {
          this.contentType(args.shift());
        }
        for (var i = 0; i < args.length; i++) {
          this.write(args[i]);
        }
      }
      var cookies = this._cookies;
      for (var n in cookies) {
        this.headers('Set-Cookie', serializeCookie(cookies[n]));
      }
      if (cfg.logging && cfg.logging.response_time && app.__init) {
        this.headers('X-Response-Time', new Date().valueOf() - app.__init.valueOf());
      }
      this.req.emit('end');
      //commit the buffered response
      var _super = this._super, response = this.response;
      _super.writeHead(response.status, response.headers);
      response.body.forEach(function(chunk) {
        _super.write(chunk);
      });
      _super.end();
    },

    //these build on the methods above
    die: function() {
      this.clear();
      this.end.apply(this, arguments);
    },
    debug: function(data) {
      this.clear();
      this.write(util.inspect(data, 4));
      this.end();
    },
    sendFile: function(opts) {
      if (Object.isPrimitive(opts)) {
        opts = {file: String(opts)};
      }
      this.headers('Content-Type', opts.contentType || 'application/octet-stream');
      var cdisp = [];
      if (opts.attachment) cdisp.push('attachment');
      if (opts.name) {
        var name = (typeof opts.name == 'string') ? opts.name : opts.file.split('/').pop();
        cdisp.push('filename="' + util.stripFilename(name, '~', {'"': '', ',': ''}) + '"');
      }
      if (cdisp.length) {
        this.headers('Content-Disposition', cdisp.join('; '));
      }
      this.sendStream(fs.createReadStream(opts.file));
    },
    redirect: function(url, type) {
      if (type == 'html') {
        this.htmlRedirect(url);
      }
      if (type == '301') {
        this.status('301 Moved Permanently');
      } else
      if (type == '303') {
        this.status('303 See Other');
      } else {
        this.status('302 Moved');
      }
      this.headers('Location', url);
      this.end();
    },
    htmlRedirect: function(url) {
      var html = htmlRedirect.replace(/URL/g, util.htmlEnc(url));
      this.end('text/html', html);
    }
  });

  var htmlRedirect = [
    '<html>',
    '<head><title>Redirecting ...</title><meta http-equiv="refresh" content="0;url=URL"/></head>',
    '<body onload="location.replace(document.getElementsByTagName(\'meta\')[0].content.slice(6))">',
    '<noscript><p>If you are not redirected, <a href="URL">Click Here</a></p></noscript>',
    //add padding to prevent "friendly" error messages in certain browsers
    new Array(15).join('<' + '!-- PADDING --' + '>'),
    '</body>',
    '</html>'
  ].join('\r\n');

  function serializeCookie(cookie) {
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
  }

  module.exports = Response;

});