/*global global, require, app, adapter, Fiber */
app.define('adapter-response', function(require, exports, module) {
  "use strict";

  var fs = require('fs');
  var util = require('util');
  var Buffer = require('buffer').Buffer;

  var TEXT_CTYPES = /^text\/|\/json$/i;
  var STATUS_PARTS = /^(\d{3}\b)?\s*(.*)$/i;

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

  function Response(httpRes) {
    //node's http response
    this._super = httpRes;
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
      var key = knownHeaders[n.toLowerCase()] || n;
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
        length: 0,
        body: []
      };
    },
    write: function(data) {
      data = (Buffer.isBuffer(data)) ? data : new Buffer(String(data));
      this.response.length += data.length;
      this.response.body.push(data);
    },
    end: function() {
      var res = this.response, headers = res.headers;
      var statusParts = STATUS_PARTS.exec(res.status);
      var statusCode = statusParts[1] || '200', reasonPhrase = statusParts[2];
      headers['Content-Type'] = buildContentType(res.charset, headers['Content-Type']);
      headers['Content-Length'] = this.response.length;
      this._super.writeHead(statusCode, reasonPhrase || headers, headers); //hacky
      for (var i = 0; i < res.body.length; i++) {
        this._super.write(res.body[i]);
      }
      this._super.end();
      Fiber.current.abort();
    },
    sendFile: function(opts) {
      var res = this.response, httpRes = this._super;
      if (Object.isPrimitive(opts)) {
        opts = {file: String(opts)};
      }
      if (!opts.contentType) {
        opts.contentType = 'application/octet-stream';
      }
      opts.contentType = buildContentType(opts.charset || res.charset, opts.contentType);
      if (!opts.name) {
        opts.name = opts.file.split('/').pop();
      }
      opts.fullpath = global.mappath(opts.file);
      console.log('sendfile: ' + opts.fullpath);
      Fiber.current.abort(function() {
        httpRes.sendFile({
          path: opts.fullpath,
          contentType: opts.contentType,
          attachment: !!opts.attachment,
          filename: opts.name
        });
      });
    }
  };

  module.exports = Response;

});