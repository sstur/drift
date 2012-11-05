/*global global, require, app, adapter */
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var formidable = require('formidable');
var EventEmitter = require('events').EventEmitter;
adapter.define('body-parser', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var util = require('util');

  var MAX_BUFFER_SIZE = 1048576;

  var join = path.join;

  function BodyParser(readStream, headers, opts) {
    EventEmitter.call(this);
    this.readStream = readStream;
    this.headers = headers;
    this.opts = opts || {};
    this.parsed = {fields: {}, files: {}};
    //to work properly with formidable
    if (!readStream.headers) {
      readStream.headers = headers;
    }
    this.on('end', function() {
      this._finished = true;
    });
  }

  util.inherits(BodyParser, EventEmitter);

  BodyParser.prototype.parse_ = function(callback) {
    //enable callback syntax
    this.on('error', function(err) {
      callback(err);
    });
    this.on('end', function() {
      callback(null, this.parsed);
    });
    //process based on headers
    var headers = this.headers;
    this.length = parseInt(headers['content-length'], 10);
    if (isNaN(this.length)) {
      this.emit('error', '411 Length Required');
      return;
    } else
    if (this.length === 0) {
      //nothing to parse
      this.emit('end');
      return;
    }
    this.type = headers['content-type'] || '';
    this.type = this.type.toLowerCase().split(';')[0];
    if (!this.type) {
      this.emit('error', '415 Content-Type Required');
      return;
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
      default:
        this.processBinaryBody();
    }
    if (this.readStream._paused) {
      this.readStream.resume();
    }
  };

  BodyParser.prototype.bufferReqBody = function(callback) {
    var readStream = this.readStream, opts = this.opts;
    var maxSize = opts.maxSize || MAX_BUFFER_SIZE;
    if (this.length > maxSize) {
      callback('413 Request Entity Too Large');
      return;
    }
    var buffer = [], size = 0, expected = this.length;
    readStream.on('data', function(data) {
      if (size > expected) {
        readStream.pause();
        callback('413 Request Entity Too Large');
        return;
      }
      buffer.push(data.toString(opts.encoding || 'utf8'));
      size += data.length;
    });
    readStream.on('error', function(err) {
      callback(err);
    });
    readStream.on('end', function() {
      callback(null, buffer.join(''));
    });
  };

  BodyParser.prototype.processFormBody = function() {
    var self = this;
    this.bufferReqBody(function(err, body) {
      if (err) {
        self.emit('error', err);
        return;
      }
      util.extend(self.parsed.fields, qs.parse(body));
      self.emit('end');
    });
  };

  BodyParser.prototype.processJSONBody = function() {
    var self = this;
    this.bufferReqBody(function(err, body) {
      if (err) {
        self.emit('error', err);
        return;
      }
      try {
        var parsed = JSON.parse(body);
      } catch(e) {
        self.emit('error', new Error('Invalid JSON Body'));
        return;
      }
      if (parsed !== Object(parsed)) {
        parsed = {'': parsed};
      }
      util.extend(self.parsed.fields, parsed);
      self.emit('end');
    });

  };

  BodyParser.prototype.processMultiPartBody = function() {
    var self = this, readStream = this.readStream, opts = this.opts;
    var parser = new formidable.IncomingForm();
    parser.hash = 'md5';
    parser.maxFieldsSize = opts.maxSize || MAX_BUFFER_SIZE;
    if (opts.autoSavePath) {
      parser.uploadDir = global.mappath(opts.autoSavePath);
    }
    parser.on('field', function(name, value) {
      self.parsed.fields[name] = value;
    });
    parser.on('fileBegin', function(name, file) {
      file.guid = getGuid();
      if (opts.autoSavePath) {
        file.path = join(parser.uploadDir, file.guid);
      } else {
        //hacky way to prevent formidable from saving files to disk
        file.open = function() {
          file._writeStream = new DummyWriteStream();
        };
      }
    });
    parser.on('file', function(name, item) {
      if (item.path && item.size == 0) {
        fs.unlink(item.path);
        return;
      }
      var file = self.parsed.files[name] = {
        type: 'file',
        guid: item.guid,
        length: item.size,
        name: name,
        fileName: item.name,
        contentType: item.type,
        md5: item.hash
      };
      if (item.path) {
        file.fullpath = item.path;
      }
    });
    //socket timeout or close
    //parser.on('aborted', function() {});
    parser.parse(readStream, function(err) {
      if (err) {
        self.emit('error', err);
        return;
      }
      self.emit('end');
    });
  };

  BodyParser.prototype.processBinaryBody = function() {
    var self = this, readStream = self.readStream, headers = this.headers, opts = self.opts;
    var hash = crypto.createHash('md5');

    var contentDisp = util.parseHeaderValue(headers['content-disposition']);
    var fieldName = contentDisp.name || headers['x-name'] || 'file';

    var file = self.parsed.files[fieldName] = new EventEmitter();
    file.name = contentDisp.filename || headers['x-file-name'] || 'upload';
    file.type = headers['content-description'] || headers['x-content-type'] || self.type;
    file.size = 0;
    file.hash = null;
    file.fieldName = fieldName;

    self.emit('file', file);

    if (opts.autoSavePath) {
      file.path = join(opts.autoSavePath, getGuid());
      var outStream = fs.createWriteStream(global.mappath(file.path));
      outStream.on('error', function(err) {
        self.emit('error', err);
        console.log('write stream error', err);
      });
      readStream.pipe(outStream);
    }

    readStream.on('data', function(data) {
      hash.update(data);
      file.size += data.length;
      file.emit('data', data);
    });
    readStream.on('end', function() {
      file.hash = hash.digest('hex');
      file.emit('end');
      self.emit('end');
    });
  };

  function getGuid() {
    var chars = '';
    for (var i = 0; i < 32; i++) {
      chars += Math.floor(Math.random() * 16).toString(16);
    }
    return chars;
  }


  function DummyWriteStream() {}
  DummyWriteStream.prototype.write = function(data, callback) {
    callback();
  };
  DummyWriteStream.prototype.end = function(callback) {
    callback();
  };

  module.exports = BodyParser;

});