/*global app, define */
define('body-parser', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var md5 = require('md5');
  var Buffer = require('buffer').Buffer;

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
    var buffer = '', read = 0, currentPart, nomatch;
    while (1) {
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
          if (currentPart.type == 'file') {
            this.emit('file', currentPart);
          }
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
          this._finalizePart(currentPart);
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

  BodyParser.prototype._finalizePart = function(part) {
    part.end();
    if (part.type == 'file') {
      this.parsed.files[part.fieldName] = part;
    } else {
      this.parsed.fields[part.fieldName] = part.fieldValue;
    }
  };



  function Part(head) {
    this.headers = parseHeaders(head);
    var contentDisp = this.headers['content-disposition'] || '';
    this.type = (contentDisp.match(/\bfilename=/)) ? 'file' : 'field';
    this._chunks = [];
    if (this.type == 'file') {
      this._initFile();
    }
  }

  app.eventify(Part.prototype);

  Part.prototype._initFile = function() {
    this.guid = getGuid();
    this._hash = md5.create();
    this.contentType = this.headers['content-type'] || '';
    var cd = this.headers['content-disposition'] || '';
    this.fieldName = (cd.match(/\bname="(.*?)"/i) || [])[1] || 'file';
    this.fileName = (cd.match(/\bfilename="(.*?)"/i) || [])[1] || this.guid;
  };

  //to make Part a valid ReadStream
  Part.prototype.setEncoding = function(enc) {
    //output encoding
    this._encoding = enc;
  };

  //to make Part a valid WriteStream
  Part.prototype.write = function(data) {
    if (this._finished) return; //todo: throw?
    if (this.type == 'file') {
      this._hash.update(data, 'binary');
      if (this._events['data']) {
        var enc = this._encoding, _data = new Buffer(data, 'binary');
        this.emit('data', enc ? _data.toString(enc) : _data);
      }
    } else {
      this._chunks.push(data);
    }
  };

  Part.prototype.end = function() {
    if (this._finished) return;
    this._finished = true;
    if (this.type == 'file') {
      this.md5 = this._hash.digest('hex');
      this.emit('end');
    } else {
      var data = new Buffer(this._chunks.join(''), 'binary');
      this.fieldValue = data.toString('utf8');
    }
  };



  //function truncate(str, len) {
  //  if (str.length > len) {
  //    var snip = len / 2 - 2;
  //    str = str.slice(0, snip) + '...' + str.slice(0 - snip);
  //  }
  //  return str;
  //}



  function getGuid() {
    return new Array(33).join(' ').replace(/ /g, function() {
      return Math.floor(Math.random() * 16).toString(16);
    });
  }

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