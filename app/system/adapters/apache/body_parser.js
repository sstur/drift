/*global app, define */
define('body-parser', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var md5 = require('md5');

  //var log = app._log = [];

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
      return;
    }
    switch(this.type) {
      case 'application/x-www-form-urlencoded':
        return this.processFormBody();
      case 'application/json':
        return this.processJSONBody();
      case 'multipart/form-data':
        return this.processMultiPartBody();
      //case 'application/octet-stream':
      //  return this.processBinaryBody();
    }
    return new Error(415);
  };

  BodyParser.prototype.processFormBody = function() {
    var body = this._read(Math.min(this.length, MAX_BUFFER_SIZE));
    //todo: decode
    this.parsed.fields = qs.parse(body);
  };

  BodyParser.prototype.processJSONBody = function() {
    var body = this._read(Math.min(this.length, MAX_BUFFER_SIZE));
    try {
      //todo: decode (try utf8, fallback)
      this.parsed.fields = JSON.parse(body);
    } catch(e) {
      return new Error('500 Invalid JSON Body');
    }
  };

  BodyParser.prototype.processMultiPartBody = function() {
    var boundary = this._headers['content-type'], pos = boundary.indexOf('=');
    boundary = boundary.slice(pos + 1);
    if (!boundary) {
      return new Error('500 Invalid Boundary');
    }
    var boundary1 = '--' + boundary;
    var boundary2 = '\r\n--' + boundary;
    var length = +this._headers['content-length'] || 0;
    //log.push('content-length: ' + length);
    var buffer = '', read = 0, currentPart, nomatch, loopCount = 0;
    while (1) {
      loopCount ++;
      if (loopCount > 20) return;

      if (nomatch || buffer.length == 0) {
        //read more data or else we're done
        if (read < length) {
          var data = this._read(Math.min(BUFFER_SIZE, length - read));
          buffer += data;
          read += data.length;
          nomatch = false;
          //log.push('read: ' + data.length + '; total: ' + read);
        } else {
          return;
        }
      }

      //log.push('buffer: ' + buffer.length + '; ' + JSON.stringify(truncate(buffer, 80)));
      if (!currentPart) {
        //header state
        if (buffer.length > MAX_HEADER_SIZE) {
          return new Error('500 Multipart header size exceeds limit');
        }
        var endHeader = buffer.indexOf('\r\n\r\n');
        //log.push('endHeader: ' + endHeader);
        if (endHeader > 0) {
          currentPart = new Part(buffer.slice(boundary1.length + 2, endHeader));
          //log.push('new part: ' + currentPart.headers['content-disposition']);
          buffer = buffer.slice(endHeader + 4);
        } else {
          //log.push('nomatch');
          nomatch = true; //causes read or exit on next loop
        }
      } else {
        //body state
        var endBody = buffer.indexOf(boundary2);
        //log.push('endBody: ' + endBody);
        if (endBody >= 0) {
          //part of buffer belongs to current item
          currentPart.write(buffer.slice(0, endBody));
          this._processMultipartItem(currentPart);
          buffer = buffer.slice(endBody + 2);
          currentPart = null;
        } else {
          //buffer contains data and possibly partial boundary
          if (buffer.length > boundary2.length) {
            currentPart.write(buffer.slice(0, buffer.length - boundary2.length));
            buffer = buffer.slice(0 - boundary2.length);
          } else {
            //log.push('nomatch');
            nomatch = true;
          }
        }
      }
    }
  };

  BodyParser.prototype._processMultipartItem = function(part) {
    var headers = part.headers, m;
    var cdisp = headers['content-disposition'] || '';
    var ctype = headers['content-type'] || '';
    m = cdisp.match(/\bname="(.*?)"/i);
    var fieldName = m && m[1] || 'file';
    m = cdisp.match(/\bfilename="(.*?)"/i);
    var fileName = m && m[1] || '';
    if (part.type == 'file') {
      if (!fileName) return;
      var file = {
        headers: headers,
        contentType: ctype,
        fieldName: fieldName,
        fileName: fileName,
        md5: part.hash.digest('hex')
      };
      this.parsed.files[fieldName] = file;
    } else {
      //todo: decode (try utf8, fallback)
      this.parsed.fields[fieldName] = part.data.join('');
    }
  };



  function Part(head) {
    this.headers = parseHeaders(head);
    var contentDisp = this.headers['content-disposition'] || '';
    this.type = (contentDisp.match(/\bfilename=/)) ? 'file' : 'field';
    this.data = [];
    if (this.type == 'file') {
      this.hash = md5.create();
    }
  }

  Part.prototype.write = function(data) {
    //log.push('body data: ' + JSON.stringify(data));
    if (this.type == 'file') {
      //todo: actually write to disk
      this.hash.update(data, 'binary');
    } else {
      this.data.push(data);
    }
  };



  //function truncate(str, len) {
  //  if (str.length > len) {
  //    var snip = len / 2 - 2;
  //    str = str.slice(0, snip) + '...' + str.slice(0 - snip);
  //  }
  //  return str;
  //}



  function parseHeaders(raw) {
    var headers = {}, all = raw.split('\r\n');
    for (var i = 0; i < all.length; i++) {
      var header = all[i], pos = header.indexOf(':');
      if (pos < 0) continue;
      var n = header.slice(0, pos), val = header.slice(pos + 1).trim(), key = n.toLowerCase();
      headers[key] = headers[key] ? headers[key] + ', ' + val : val;
    }
    return headers;
  }

});