/*global app, define */
define('body-parser', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var md5 = require('md5');

  var BUFFER_SIZE = 1024;
  var MAX_HEADER_SIZE = 1024;
  var MAX_BUFFER_SIZE = 4096;

  function BodyParser(headers, read) {
    this._headers = headers;
    this._read = read;
    this.parsed = {files: {}, fields: {}}
  }
  module.exports = BodyParser;

  app.eventify(BodyParser.prototype);

  BodyParser.prototype.parse = function() {
    this.type = this._headers['content-type'] || '';
    this.type = this.type.toLowerCase().split(';')[0];
    this.length = parseInt(this._headers['content-length'], 10);
    if (!this.length) {
      return this.parsed;
    }
    switch(this.type) {
      case 'application/x-www-form-urlencoded':
        this.processFormBody();
        break;
      case 'application/json':
        this.processJSONBody();
        break;
      case 'multipart/form-data':
        this.processMultiPartBody();
        break;
      //case 'application/octet-stream':
      //  this.processBinaryBody();
      //  break;
      default:
        return new Error(415);
    }
    return this.parsed;
  };

  BodyParser.prototype.processFormBody = function() {
    var body = this._read(Math.min(this.length, MAX_BUFFER_SIZE));
    //todo: ascii
    this.parsed.fields = qs.parse(body);
    return this.parsed;
  };

  BodyParser.prototype.processJSONBody = function() {
    var body = this._read(Math.min(this.length, MAX_BUFFER_SIZE));
    try {
      //todo: utf8
      this.parsed.fields = JSON.parse(body);
    } catch(e) {
      return new Error('500 Invalid JSON Body');
    }
    return this.parsed;
  };

  BodyParser.prototype.processMultiPartBody = function() {
    var boundary = this._headers['content-type'], pos = boundary.indexOf('=');
    boundary = boundary.slice(pos + 1);
    if (!boundary) {
      return new Error('500 Invalid Boundary');
    }
    var boundary1 = '--' + boundary;
    var boundary2 = '\r\n--' + boundary;
    //todo: chunks
    var body = this._read(Math.min(this.length, MAX_BUFFER_SIZE));
    var index1 = 0; /* start of part in body */
    var index2 = -1; /* end of part in body (start of next boundary) */

    while (1) {
      boundary = (index1) ? boundary2 : boundary1; /* 2nd and next boundaries start with newline */
      index2 = body.indexOf(boundary, index1);
      if (index2 < 0) {
        /* no next boundary -> die */
        return;
      }
      if (index1 != 0) {
        /* both boundaries -> process whats between them */
        var headerBreak = body.indexOf('\r\n\r\n', index1);
        if (headerBreak < 0) {
          throw new Error('500 No header break in multipart component');
        }
        var headerView = body.slice(index1, headerBreak);
        var bodyView = body.slice(headerBreak + 4, index2);
        this._processMultipartItem(headerView, bodyView);
      }
      index1 = index2 + boundary.length;
    }
    return this.parsed;
  };

  BodyParser.prototype._processMultipartItem = function(header, body) {
    var headers = parseHeaders(header), m;
    var cdisp = headers['content-disposition'] || '';
    var ctype = headers['content-type'] || '';
    m = cdisp.match(/\bname="(.*?)"/i);
    var fieldName = m && m[1] || 'file';
    m = cdisp.match(/\bfilename="(.*?)"/i);
    //todo: var hash = md5.create();
    //todo: hash.update(body, 'binary');
    if (m) {
      var file = {
        headers: headers,
        fieldName: fieldName,
        originalName: m[1],
        data: body,
        md5: null //todo: hash.digest('hex')
      };
      this.parsed.files[fieldName] = file;
    } else {
      //todo: decode
      this.parsed.fields[fieldName] = body;
    }
  };

  function parseHeaders(raw) {
    var headers = {}, all = raw.split('\r\n');
    for (var i = 0; i < all.length; i++) {
      var header = all[i], pos = header.indexOf(':');
      var n = header.slice(0, pos), val = header.slice(pos + 1).trim(), key = n.toLowerCase();
      headers[key] = headers[key] ? headers[key] + ', ' + val : val;
    }
    return headers;
  }

});