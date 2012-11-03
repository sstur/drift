/*global app, define, iis */
define('adapter-response', function(require, exports, module) {
  "use strict";

  var fs = require('fs');
  var util = require('util');
  var Buffer = require('buffer').Buffer;

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

  var getCharset = function(charset, contentType) {
    charset = charset || 'utf-8';
    if (TEXT_CTYPES.test(contentType)) {
      return charset.toUpperCase();
    }
  };

  function Response() {
    this._super = iis.res;
    //init response buffer
    this.clear();
  }

  util.extend(Response.prototype, {
    headers: function(n, val) {
      var headers = this.response.headers;
      if (arguments.length == 0) {
        return headers;
      }
      n = (n == null) ? '' : String(n);
      var key = knownHeaders[n.toLowerCase()] || n;
      if (arguments.length == 1) {
        val = headers[key];
        return (val && val.join) ? val.join('; ') : val;
      } else
      if (val === null) {
        return (delete headers[key]);
      } else
      if (key in allowMulti) {
        headers[key] ? headers[key].push(val) : headers[key] = [val];
      } else {
        headers[key] = val;
      }
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
        charset: 'utf-8',
        body: []
      };
    },
    write: function(data) {
      this.response.body.push(data);
    },
    _sendHeaders: function() {
      var res = this.response, _super = this._super;
      _super.status = res.status;
      var charset = getCharset(res.charset, res.headers['Content-Type']);
      if (charset) {
        _super.charset = charset;
      }
      _super.contentType = res.headers['Content-Type'];
      forEach(res.headers, function(n, val) {
        switch (n.toLowerCase()) {
          case 'content-type':
            break;
          case 'cache-control':
            _super.cacheControl = String(val);
            break;
          default:
            _super.addHeader(n, val);
        }
      });
    },
    _sendChunk: function(data) {
      if (Buffer.isBuffer(data)) {
        this._super.binaryWrite(data.toBin());
      } else {
        this._super.write(String(data));
      }
    },
    end: function() {
      this._sendHeaders();
      this._super.buffer = false;
      var parts = this.response.body;
      for (var i = 0; i < parts.length; i++) {
        this._sendChunk(parts[i]);
      }
      this._super.end();
    },
    sendStream: function(readStream) {
      this._sendHeaders();
      this._super.buffer = false;
      var res = this;
      readStream.on('data', function(data) {
        res._sendChunk(data);
      });
      readStream.read();
      this._super.end();
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
    }
  });

  module.exports = Response;
});