/*global app, define */
define('body-parser', function(require, exports, module) {
  "use strict";

  var fs = require('fs');
  var qs = require('qs');
  var md5 = require('md5');
  var path = require('path');
  var util = require('util');
  var Buffer = require('buffer').Buffer;

  var CHUNK_SIZE = 1024;
  var MAX_HEADER_SIZE = 4096; //4 KB
  var MAX_BUFFER_SIZE = 1048576; //1 MB

  var join = path.join;
  var hasOwn = Object.hasOwnProperty;

  function BodyParser(headers, read, opts) {
    this.opts = opts || {};
    this._headers = headers;
    this._binaryRead = read;
    this.bytesRead = 0;
    this.parsed = {}
  }
  module.exports = BodyParser;

  app.eventify(BodyParser.prototype);

  BodyParser.prototype.parse = function() {
    this.length = parseInt(this._headers['content-length'], 10);
    if (isNaN(this.length)) {
      throw '411 Length Required';
    } else
    if (this.length === 0) {
      //nothing to parse
      return this.parsed;
    }
    this.type = this._headers['content-type'] || '';
    this.type = this.type.toLowerCase().split(';')[0];
    if (!this.type) {
      throw '415 Content-Type Required';
    }
    switch(this.type) {
      case 'application/x-www-form-urlencoded':
        this.processFormBody();
        break;
      case 'application/json':
        this.processJSONBody();
        break;
      case 'multipart/form-data':
        //note: nested multipart with multipart/mixed not supported
        //note: "Content-Transfer-Encoding: base64" in parts is ignored
        this.processMultiPartBody();
        break;
      default:
        this.processBinaryBody();
    }
    return this.parsed;
  };

  BodyParser.prototype.processFormBody = function() {
    if (this.length > MAX_BUFFER_SIZE) {
      throw '413 Request Entity Too Large';
    }
    var body = this._read(MAX_BUFFER_SIZE, 'utf8');
    util.extend(this.parsed, qs.parse(body));
  };

  BodyParser.prototype.processJSONBody = function() {
    if (this.length > MAX_BUFFER_SIZE) {
      throw '413 Request Entity Too Large';
    }
    var body = this._read(MAX_BUFFER_SIZE, 'utf8');
    try {
      var parsed = JSON.parse(body);
    } catch(e) {
      throw new Error('Invalid JSON Body');
    }
    //ensure parsed is not null or a primitive
    if (parsed !== Object(parsed)) {
      parsed = {'': parsed};
    }
    util.extend(this.parsed, parsed);
  };

  BodyParser.prototype.processBinaryBody = function() {
    var headers = this._headers;
    var contentDisp = util.parseHeaderValue(headers['content-disposition'] || '');
    var part = new Part(headers, {
      name: contentDisp.name || headers['x-name'] || 'file',
      fileName: contentDisp.filename || headers['x-file-name'] || 'upload',
      contentType: headers['content-description'] || headers['x-content-type'] || this.type
    }, this.opts);
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
      throw new Error('Invalid Boundary');
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
      if (!currentPart) {
        //header state
        if (buffer.length > MAX_HEADER_SIZE) {
          throw new Error('Multipart Headers Too Large');
        }
        var endHeader = buffer.indexOf('\r\n\r\n');
        if (endHeader > 0) {
          currentPart = new Part(buffer.slice(boundary1.length + 2, endHeader), null, this.opts);
          if (currentPart.type == 'file') {
            this.emit('file', currentPart);
          }
          buffer = buffer.slice(endHeader + 4);
        } else {
          nomatch = true; //causes read or exit on next loop
        }
      } else {
        //body state
        var endBody = buffer.indexOf(boundary2);
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
    var parsed = this.parsed, key = part.name.toLowerCase();
    if (part.type == 'file') {
      //uploads by the same name get replaced
      parsed[key] = part;
    } else {
      parsed[key] = (hasOwn(parsed, key) ? parsed[key] + ', ' : '') + part.value;
    }
  };



  function Part(head, file, opts) {
    this.headers = (typeof head == 'string') ? util.parseHeaders(head) : head;
    this._chunks = [];
    file = file || parseFileHeaders(this.headers);
    this.type = (file) ? 'file' : 'field';
    if (file) {
      this._initFile(file, opts);
    }
  }

  app.eventify(Part.prototype);

  Part.prototype._initFile = function(file, opts) {
    this.guid = getGuid();
    this._hash = md5.create();
    this.size = 0;
    util.extend(this, file);
    if (opts.autoSavePath) {
      var path = this.fullpath = join(opts.autoSavePath, this.guid);
      var writeStream = fs.createWriteStream(path);
      this.on('data', function(data) {
        writeStream.write(data);
      });
      this.on('end', function() {
        writeStream.end();
      });
    }
  };

  //allows files to be flattened to strings
  Part.prototype.toString = function() {
    return (('value' in this) ? this.value : this.fileName) || '';
  };

  //to make Part a valid ReadStream
  Part.prototype.setEncoding = function(enc) {
    //output encoding
    this._encoding = enc;
  };

  //to make Part a valid WriteStream
  Part.prototype.write = function(data) {
    if (this._finished) return;
    this.size += data.length;
    if (this.type == 'file') {
      this._hash.update(data);
      if (this._events && this._events['data']) {
        var enc = this._encoding;
        this.emit('data', (enc) ? data.toString(enc) : data);
      }
    } else {
      if (this.size > MAX_BUFFER_SIZE) {
        throw new Error('Multipart Entity Too Large');
      }
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

  function getGuid() {
    var chars = '';
    for (var i = 0; i < 32; i++) {
      chars += Math.floor(Math.random() * 16).toString(16);
    }
    return chars;
  }

});