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

  //todo: use these if statusReason not specified
  var statusCodes = {100: 'Continue', 101: 'Switching Protocols', 102: 'Processing', 200: 'OK', 201: 'Created',
    202: 'Accepted', 203: 'Non-Authoritative Information', 204: 'No Content', 205: 'Reset Content', 206: 'Partial Content',
    207: 'Multi-Status', 300: 'Multiple Choices', 301: 'Moved Permanently', 302: 'Moved Temporarily', 303: 'See Other',
    304: 'Not Modified', 305: 'Use Proxy', 307: 'Temporary Redirect', 400: 'Bad Request', 401: 'Unauthorized',
    402: 'Payment Required', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 406: 'Not Acceptable',
    407: 'Proxy Authentication Required', 408: 'Request Time-out', 409: 'Conflict', 410: 'Gone', 411: 'Length Required',
    412: 'Precondition Failed', 413: 'Request Entity Too Large', 414: 'Request-URI Too Large', 415: 'Unsupported Media Type',
    416: 'Requested Range Not Satisfiable', 417: 'Expectation Failed', 422: 'Unprocessable Entity', 423: 'Locked',
    424: 'Failed Dependency', 425: 'Unordered Collection', 426: 'Upgrade Required', 428: 'Precondition Required',
    429: 'Too Many Requests', 431: 'Request Header Fields Too Large', 500: 'Internal Server Error', 501: 'Not Implemented',
    502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Time-out', 505: 'HTTP Version not supported',
    506: 'Variant Also Negotiates', 507: 'Insufficient Storage', 509: 'Bandwidth Limit Exceeded', 510: 'Not Extended',
    511: 'Network Authentication Required'};

  //index headers by lowercase
  knownHeaders = knownHeaders.reduce(function(headers, header) {
    headers[header.toLowerCase()] = header;
    return headers;
  }, {});

  //headers that allow multiple
  var allowMulti = {'Set-Cookie': 1};


  function Response(res) {
    this._super = res;
    this.clear();
  }

  util.extend(Response.prototype, {
    clear: function(type, status) {
      //reset response buffer
      this.response = {
        status: status || '200 OK',
        headers: {'Content-Type': type || 'text/plain'},
        charset: 'utf-8',
        cookies: {},
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

    //these methods interface with the adapter (_super)
    _writeHead: function() {
      var headers = this.response.headers, cookies = this.response.cookies;
      Object.keys(cookies).forEach(function(n) {
        headers['Set-Cookie'] = serializeCookie(cookies[n]);
      });
      headers['Content-Type'] = buildContentType(this.response.charset, headers['Content-Type']);
      if (cfg.logging && cfg.logging.response_time && this.req.__init) {
        headers['X-Response-Time'] = new Date().valueOf() - this.req.__init.valueOf();
      }
      this.req.emit('end');
      this._super.writeHead(this.response.status, headers);
    },
    _streamFile: function(path) {
      this._writeHead();
      var _super = this._super;
      if (_super.streamFile) {
        //allow the adapter to do things like X-Sendfile or X-Accel-Redirect
        _super.streamFile(path);
      } else {
        var readStream = fs.createReadStream(path);
        readStream.on('data', function(data) {
          _super.write(data);
        });
        readStream.read();
        _super.end();
      }
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
      this._writeHead();
      //write the buffered response
      var _super = this._super;
      this.response.body.forEach(function(chunk) {
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
      //todo: stat the file for content-length and throw if not exists
      //todo: use file extention to lookup mime-type if not specified
      this.headers('Content-Type', opts.contentType || 'application/octet-stream');
      var contentDisp = [];
      if (opts.attachment) contentDisp.push('attachment');
      if (opts.filename) {
        var filename = (typeof opts.filename == 'string') ? opts.filename : opts.file.split('/').pop();
        //strip double-quote and comma, replacing other invalid chars with ~
        filename = util.stripFilename(filename, '~', {'"': '', ',': ''});
        contentDisp.push('filename="' + filename + '"');
      }
      if (contentDisp.length) {
        this.headers('Content-Disposition', contentDisp.join('; '));
      }
      this._streamFile(opts.file);
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

  function buildContentType(charset, contentType) {
    //contentType may already have charset
    contentType = contentType.split(';')[0];
    charset = charset ? charset.toUpperCase() : '';
    return (charset && TEXT_CTYPES.test(contentType)) ? contentType + '; charset=' + charset : contentType;
  }

  module.exports = Response;

});