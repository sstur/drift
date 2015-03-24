/*global app, define, Buffer */
define('body-parser', function(require, exports, module) {
  "use strict";

  var fs = require('fs');
  var qs = require('qs');
  var path = require('path');
  var util = require('util');
  var crypto = require('crypto');

  var CHUNK_SIZE = 1024;
  var MAX_HEADER_SIZE = 4096; //4 KB
  var MAX_BUFFER_SIZE = 1048576; //1 MB

  var join = path.join;
  var hasOwnProperty = Object.hasOwnProperty;

  function BodyParser(headers, src, opts) {
    this.opts = opts || {};
    this._headers = headers;
    if (typeof src === 'string') {
      var readStream = fs.createReadStream(src);
      this._readBytes = readStream.readBytes.bind(readStream);
    } else {
      this._readBytes = src;
    }
    this.bytesReceived = 0;
    this.parsed = {};
  }

  app.eventify(BodyParser.prototype);

  BodyParser.prototype.parse = function() {
    this.bytesExpected = parseInt(this._headers['content-length'], 10);
    if (isNaN(this.bytesExpected)) {
      throw '411 Length Required';
    } else
    if (this.bytesExpected === 0) {
      //nothing to parse
      return this.parsed;
    }
    var type = this._headers['content-type'] || '';
    type = this.type = type.toLowerCase().split(';')[0];
    if (!type) {
      throw '415 Content-Type Required';
    }
    switch(type) {
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
    if (this.bytesExpected > MAX_BUFFER_SIZE) {
      throw '413 Request Entity Too Large';
    }
    var body = this._read(MAX_BUFFER_SIZE, 'utf8') || '';
    Object.assign(this.parsed, qs.parse(body));
  };

  BodyParser.prototype.processJSONBody = function() {
    if (this.bytesExpected > MAX_BUFFER_SIZE) {
      throw '413 Request Entity Too Large';
    }
    var body = this._read(MAX_BUFFER_SIZE, 'utf8') || '';
    try {
      var parsed = JSON.parse(body);
    } catch(e) {
      throw new Error('Invalid JSON Body');
    }
    //ensure parsed is not null or a primitive
    if (parsed !== Object(parsed)) {
      parsed = {'': parsed};
    }
    Object.assign(this.parsed, parsed);
  };

  BodyParser.prototype.processBinaryBody = function() {
    var headers = this._headers;
    var contentDisp = util.parseHeaderValue(headers['content-disposition'] || '');
    var part = new Part(headers, {
      name: contentDisp.name || headers['x-name'] || '',
      fileName: contentDisp.filename || headers['x-file-name'] || '',
      //some upload libraries (jquery/blueimp) set content-type to "application/octet-stream"
      // and use content-description for the file's actual content-type
      contentType: headers['content-description'] || headers['x-content-type'] || this.type
    }, this.opts);
    this.emit('file', part);
    var chunk;
    while ((chunk = this._read(CHUNK_SIZE)) && chunk.length) {
      part.write(chunk);
    }
    this._finalizePart(part);
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
      if (nomatch || buffer.length === 0) {
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

  BodyParser.prototype._read = function(chunkSize, enc) {
    chunkSize = chunkSize || CHUNK_SIZE;
    var bytesRemaining = this.bytesExpected - this.bytesReceived;
    var chunk = this._readBytes(Math.min(chunkSize, bytesRemaining));
    if (chunk) {
      this.bytesReceived += chunk.length;
      this.emit('upload-progress', this.bytesReceived, this.bytesExpected);
      return (enc) ? chunk.toString(enc) : chunk;
    } else {
      return null;
    }
  };

  BodyParser.prototype._finalizePart = function(part) {
    part.end();
    var parsed = this.parsed;
    var key = part.name.toLowerCase();
    var exists = hasOwnProperty.call(parsed, key);
    if (part.type == 'file') {
      //append a number to key if we have multiple with the same name
      if (exists) key = getUniqueKey(parsed, key);
      parsed[key] = part;
    } else {
      //non-file fields are flattened; those with the same name are concatenated
      parsed[key] = (exists ? parsed[key] + ', ' : '') + part.value;
    }
  };



  function Part(head, parsed, opts) {
    this.headers = (typeof head == 'string') ? util.parseHeaders(head) : head;
    this._chunks = [];
    parsed = parsed || parsePartHeaders(this.headers);
    Object.assign(this, parsed);
    if ('fileName' in parsed) {
      this.type = 'file';
      this._initFile(parsed, opts);
    } else {
      this.type = 'field';
    }
  }

  app.eventify(Part.prototype);

  Part.prototype._initFile = function(file, opts) {
    this.guid = util.getUniqueHex();
    var hashType = (opts.hash === false) ? null : (opts.hash || 'md5');
    if (hashType) {
      this._hash = crypto.createHash(hashType);
      //note: kinda hacky; used once below
      this._hash.type = hashType;
    }
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

  Part.prototype.toJSON = function() {
    if (this.type === 'file') {
      return {
        guid: this.guid,
        name: this.name,
        fileName: this.fileName,
        contentType: this.contentType,
        size: this.size,
        md5: this.md5,
        hash: this.hash,
        fullpath: this.fullpath
      };
    } else {
      return {
        name: this.name,
        value: this.value
      };
    }
  };

  //to make Part a valid ReadStream
  Part.prototype.setEncoding = function(enc) {
    //output encoding
    this._encoding = enc;
  };

  //to make Part a valid WriteStream
  Part.prototype.write = function(data) {
    if (!this._chunks) return;
    this.size = (this.size || 0) + data.length;
    if (this.type == 'file') {
      this._hash.update(data);
      if (this._events && this._events.data) {
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
    if (!this._chunks) return;
    if (this._hash) {
      this.hash = this._hash.digest('hex');
      //for legacy code that expects file.md5
      this[this._hash.type] = this.hash;
      delete this._hash;
      this.emit('end');
    } else {
      var data = new Buffer(this._chunks.join(''), 'binary');
      this.value = data.toString('utf8');
    }
    delete this._chunks;
    delete this._events;
  };

  Part.prototype.saveTo = function(path) {
    if (this.type !== 'file') {
      throw new Error('saveTo() called on non-file');
    }
    //todo: check if file has been finalized yet
    fs.moveFile(this.fullpath, path);
    this.fullpath = path;
  };



  function isUpload(item) {
    return (item instanceof Part && item.type === 'file');
  }

  function parsePartHeaders(headers) {
    var contentDisp = util.parseHeaderValue(headers['content-disposition'] || '');
    var parsed = {name: contentDisp.name || ''};
    if ('filename' in contentDisp) {
      parsed.fileName = contentDisp.filename || '';
      parsed.contentType = headers['content-type'] || 'application/octet-stream';
    }
    return parsed;
  }

  function getUniqueKey(obj, key) {
    var id = 0;
    key = key.replace(/\d+$/, function(key, num) {
      id = parseInt(num, 10);
      return '';
    });
    id += 1;
    while (hasOwnProperty.call(obj, key + id)) id += 1;
    return key + id;
  }

  module.exports = BodyParser;
  BodyParser.isUpload = isUpload;

});