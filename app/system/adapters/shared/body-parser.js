/*global app, define */
define('body-parser', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var md5 = require('md5');
  var util = require('util');
  var Buffer = require('buffer').Buffer;

  //var log = app._log = [];

  var CHUNK_SIZE = 1024;
  var MAX_HEADER_SIZE = 1024;
  var MAX_BUFFER_SIZE = 4096;

  function BodyParser(headers, read) {
    this._headers = headers;
    this._binaryRead = read;
    this.bytesRead = 0;
    this.parsed = {files: {}, fields: {}}
  }
  module.exports = BodyParser;

  app.eventify(BodyParser.prototype);

  BodyParser.prototype.parse = function() {
    this.length = parseInt(this._headers['content-length'], 10);
    if (isNaN(this.length)) {
      return util.extend(new Error('Length Required'), {statusCode: 411});
    } else
    if (this.length === 0) {
      return; //nothing to parse
    }
    this.type = this._headers['content-type'] || '';
    this.type = this.type.toLowerCase().split(';')[0];
    if (!this.type) {
      return util.extend(new Error('Content-Type Required'), {statusCode: 415});
    }
    switch(this.type) {
      case 'application/x-www-form-urlencoded':
        return this.processFormBody();
      case 'application/json':
        return this.processJSONBody();
      case 'multipart/form-data':
        //todo: support nested multipart with multipart/mixed
        //todo: support Content-Transfer-Encoding of parts
        return this.processMultiPartBody();
      default:
        return this.processBinaryBody();
    }
  };

  BodyParser.prototype.processFormBody = function() {
    var body = this._read(MAX_BUFFER_SIZE, 'utf8');
    this.parsed.fields = qs.parse(body);
  };

  BodyParser.prototype.processJSONBody = function() {
    var body = this._read(MAX_BUFFER_SIZE, 'utf8');
    try {
      var parsed = JSON.parse(body);
    } catch(e) {
      return new Error('Invalid JSON Body');
    }
    //ensure parsed is not null or a primitive
    this.parsed.fields = (parsed === Object(parsed)) ? parsed : {'': parsed};
  };

  BodyParser.prototype.processBinaryBody = function() {
    var headers = this._headers;
    var contentDisp = util.parseHeaderValue(headers['content-disposition'] || '');
    var part = new Part(headers, {
      name: contentDisp.name || headers['x-name'] || 'file',
      fileName: contentDisp.filename || headers['x-filename'] || 'upload',
      //todo: support content-description?
      contentType: headers['x-content-type'] || this.type
    });
    this.emit('file', part);
    var chunk;
    while ((chunk = this._read(CHUNK_SIZE)) && chunk.length) {
      part.write(chunk);
    }
    this._finalizePart(part)
  };

  BodyParser.prototype.processMultiPartBody = function() {
    var boundary = this._headers['content-type'], pos = boundary.indexOf('=');
    boundary = boundary.slice(pos + 1);
    if (!boundary) {
      return new Error('Invalid Boundary');
    }
    var boundary1 = '--' + boundary;
    var boundary2 = '\r\n--' + boundary;
    var buffer = '', currentPart, nomatch;
    while (1) {
      if (nomatch || buffer.length == 0) {
        //read more data or else we're done
        var data = this._read(CHUNK_SIZE, 'binary');
        if (data) {
          buffer += data;
          nomatch = false;
        } else {
          return;
        }
      }
      //log.push('buffer: ' + buffer.length + '; ' + JSON.stringify(truncate(buffer, 80)));
      if (!currentPart) {
        //header state
        if (buffer.length > MAX_HEADER_SIZE) {
          return new Error('Multipart header size exceeds limit');
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
          currentPart.write(new Buffer(buffer.slice(0, endBody), 'binary'));
          this._finalizePart(currentPart);
          buffer = buffer.slice(endBody + 2);
          currentPart = null;
        } else {
          //buffer contains data and possibly partial boundary
          if (buffer.length > boundary2.length) {
            currentPart.write(new Buffer(buffer.slice(0, buffer.length - boundary2.length), 'binary'));
            buffer = buffer.slice(0 - boundary2.length);
          } else {
            //log.push('nomatch');
            nomatch = true;
          }
        }
      }
    }
  };

  BodyParser.prototype._read = function(bytes, enc) {
    bytes = bytes || CHUNK_SIZE;
    var left = this.length - this.bytesRead;
    var chunk = this._binaryRead(Math.min(bytes, left));
    this.bytesRead += chunk.length;
    this.emit('upload-progress', this.bytesRead, this.length);
    return (enc) ? chunk.toString(enc) : chunk;
  };

  BodyParser.prototype._finalizePart = function(part) {
    part.end();
    if (part.type == 'file') {
      this.parsed.files[part.name] = part;
    } else {
      this.parsed.fields[part.name] = part.value;
    }
  };



  function Part(head, file) {
    this.headers = (typeof head == 'string') ? util.parseHeaders(head) : head;
    this._chunks = [];
    file = file || parseFileHeaders(this.headers);
    this.type = (file) ? 'file' : 'field';
    if (file) {
      this._initFile(file);
    }
  }

  app.eventify(Part.prototype);

  Part.prototype._initFile = function(file) {
    this.guid = getGuid();
    this._hash = md5.create();
    this.length = 0;
    util.extend(this, file);
  };

  //to make Part a valid ReadStream
  Part.prototype.setEncoding = function(enc) {
    //output encoding
    this._encoding = enc;
  };

  //to make Part a valid WriteStream
  Part.prototype.write = function(data) {
    if (this._finished) return;
    this.length += data.length;
    if (this.type == 'file') {
      this._hash.update(data);
      if (this._events && this._events['data']) {
        var enc = this._encoding;
        this.emit('data', (enc) ? data.toString(enc) : data);
      }
    } else {
      this._chunks.push(data.toString('binary'));
    }
  };

  Part.prototype.end = function() {
    if (this._finished) return;
    this._finished = true;
    if (this.type == 'file') {
      this.md5 = this._hash.digest('hex');
      delete this._hash;
      this.emit('end');
    } else {
      var data = new Buffer(this._chunks.join(''), 'binary');
      this.value = data.toString('utf8');
    }
    delete this._chunks;
  };



  function getGuid() {
    return new Array(33).join(' ').replace(/ /g, function() {
      return Math.floor(Math.random() * 16).toString(16);
    });
  }

  function parseFileHeaders(headers) {
    var file, contentDisp = util.parseHeaderValue(headers['content-disposition'] || '');
    if ('filename' in contentDisp) {
      file = {};
      file.name = contentDisp.name || 'file';
      file.fileName = contentDisp.filename || 'upload';
      file.contentType = headers['content-type'] || 'application/octet-stream';
    }
    return file;
  }

});