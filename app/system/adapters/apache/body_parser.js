/*global app, define */
define('body-parser', function(require, exports, module) {
  "use strict";

  var qs = require('qs');

  var BUFFER_SIZE = 1024;
  var MAX_HEADER_SIZE = 1024;
  var MAX_BUFFER_SIZE = 4096;

  function BodyParser(headers, read) {
    this._headers = headers;
    this._read = read;
  }
  module.exports = BodyParser;

  app.eventify(BodyParser.prototype);

  BodyParser.prototype.parse = function() {
    return {files: {}, fields: {}};
  };



  var _parsePOST = function() {
    var ct = this._headers['content-type'] || '';
    var length = parseInt(this._headers['content-length'], 10);
    if (!length) { return; }

    if (ct.indexOf("application/x-www-form-urlencoded") != -1) {
      var buffer = this._input(length);
      this.post = qs.parse(buffer.toString("utf-8"));
    } else {
      var boundary = ct.match(/boundary=(.*)/); /* find boundary */
      if (boundary) {
        var buffer = this._input(length);
        this._parseMultipartBuffer(buffer, boundary[1], null);
      }
      }
  };

  /**
   * @param {Buffer} buffer data
   * @param {boundary} boundary
   * @param {string || null} fieldName form field name
   */
  var _parseMultipartBuffer = function(buffer, boundary, fieldName) {
    var boundary1 = "--"+boundary;
    var boundary2 = "\r\n--"+boundary;
    var index1 = 0; /* start of part in buffer */
    var index2 = -1; /* end of part in buffer (start of next boundary) */

    while (1) {
      boundary = (index1 ? boundary2 : boundary1); /* 2nd and next boundaries start with newline */
      index2 = buffer.indexOf(boundary, index1);
      if (index2 == -1) { return; } /* no next boundary -> die */
      if (index1 != 0) { /* both boundaries -> process whats between them */
        var headerBreak = buffer.indexOf("\r\n\r\n", index1);
        if (headerBreak == -1) { throw new Error("No header break in multipart component"); }
        var headerView = buffer.range(index1, headerBreak);
        var bodyView = buffer.range(headerBreak+4, index2);
        this._processMultipartItem(headerView, bodyView, fieldName);
      }

      index1 = index2 + boundary.length; /* move forward */
    }
  };

  /**
   * @param {Buffer} header
   * @param {Buffer} body
   * @param {string} fieldName
   */
  var _processMultipartItem = function(header, body, fieldName) {
    var headers = {};
    var headerArray = header.toString("utf-8").split("\r\n");
    for (var i=0, len=headerArray.length;i<len;i++) {
      var line = headerArray[i];
      if (!line) { continue; }
      var r = line.match(/([^:]+): *(.*)/);
      if (!r) { throw new Error("Malformed multipart header '" + line + "'"); }

      var name = r[1].toLowerCase(), value = r[2];
      headers[name] = value;
    }

    var cd = headers['content-disposition'] || '';
    var ct = headers['content-type'] || '';
    var r = cd.match(/ name="(.*?)"/i); /* form field name in header */
    if (r) { fieldName = r[1]; }

    if (ct.match(/multipart\/mixed/i)) { /* recursive processing */
      var boundary = ct.match(/boundary=(.*)/); /* find boundary */
      if (boundary) {
        this._parseMultipartBuffer(body, boundary[1], fieldName);
      }
    } else { /* no recursion: either file or form field */
      var r = cd.match(/filename="(.*?)"/i);
      if (r) { /* file */
        var file = {
          headers: headers,
          originalName: r[1],
          data: body
        };
        Object.extend(this.files, fieldName, file);
      } else { /* form field */
        Object.extend(this.post, fieldName, body.toString("utf-8"));
      }
    }
  };

});