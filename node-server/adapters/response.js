/*global global, require, app, adapter, Fiber */
app.define('adapter-response', function(require, exports, module) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;

  var buildContentType = function(charset, contentType) {
    //contentType may already have charset
    contentType = contentType.split(';')[0];
    charset = charset && charset.toUpperCase();
    return (charset && TEXT_CTYPES.test(contentType)) ? contentType + '; charset=' + charset : contentType;
  };

  function Response(httpRes) {
    this._super = httpRes;
  }

  Response.prototype = {
    writeHead: function() {

    },
    write: function() {

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