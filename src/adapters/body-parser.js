/* eslint-disable one-var */
var _fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var formidable = require('formidable');
var EventEmitter = require('events').EventEmitter;
adapter.define('body-parser', function(require, exports, module) {
  'use strict';

  var fs = require('fs');
  var qs = require('qs');
  var util = require('util');

  var MAX_BUFFER_SIZE = 1048576;

  var join = path.join;
  var hasOwnProperty = Object.hasOwnProperty;

  //src can be either a readStream or a path to file
  function BodyParser(headers, src, opts) {
    EventEmitter.call(this);
    this.init(src);
    this.headers = headers;
    opts = opts || {};
    this.hashType = opts.hash === false ? null : opts.hash || 'md5';
    this.opts = opts;
    this.parsed = {};
    //to work properly with formidable
    if (!this.readStream.headers) {
      this.readStream.headers = headers;
    }
    this.on('end', function() {
      this._finished = true;
    });
  }

  util.inherits(BodyParser, EventEmitter);

  BodyParser.prototype.init_ = function(src, callback) {
    if (typeof src === 'string') {
      var readStream = (this.readStream = _fs.createReadStream(
        app.mappath(src),
      ));
      readStream.on('error', callback);
      readStream.on('open', function() {
        callback();
      });
      //pause immediately since we may not attach data listener until later
      readStream.pause();
    } else {
      this.readStream = src;
      callback();
    }
  };

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
    } else if (this.length === 0) {
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
    switch (this.type) {
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
    this.readStream.resume();
  };

  BodyParser.prototype.bufferReqBody = function(callback) {
    var readStream = this.readStream,
      opts = this.opts;
    if (this.length > MAX_BUFFER_SIZE) {
      callback('413 Request Entity Too Large');
      return;
    }
    var buffer = [],
      size = 0,
      expected = this.length;
    readStream.on('data', function(data) {
      if (size > expected) {
        readStream.pause();
        callback('413 Request Entity Too Large');
        return;
      }
      buffer.push(data.toString('binary'));
      size += data.length;
    });
    readStream.on('error', function(err) {
      callback(err);
    });
    readStream.on('end', function() {
      var data = new Buffer(buffer.join(''), 'binary');
      callback(null, data.toString(opts.encoding || 'utf8'));
    });
  };

  BodyParser.prototype.processFormBody = function() {
    var self = this;
    this.bufferReqBody(function(err, body) {
      if (err) {
        self.emit('error', err);
        return;
      }
      Object.assign(self.parsed, qs.parse(body));
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
      } catch (e) {
        self.emit('error', new Error('Invalid JSON Body'));
        return;
      }
      if (parsed !== Object(parsed)) {
        parsed = { '': parsed };
      }
      Object.assign(self.parsed, parsed);
      self.emit('end');
    });
  };

  BodyParser.prototype.processMultiPartBody = function() {
    var self = this,
      readStream = this.readStream,
      opts = this.opts;
    //todo: we should use formidable.MultipartParser directly
    var parser = new formidable.IncomingForm();
    parser.hash = this.hashType;
    parser.maxFieldsSize = MAX_BUFFER_SIZE;
    if (opts.autoSavePath) {
      parser.uploadDir = global.mappath(opts.autoSavePath);
    }
    parser.on('field', function(name, val) {
      var parsed = self.parsed;
      var key = qs.unescape(name).toLowerCase();
      if (hasOwnProperty.call(parsed, key)) {
        parsed[key] += ', ' + qs.unescape(val);
      } else {
        parsed[key] = qs.unescape(val);
      }
    });
    parser.on('fileBegin', function(name, _file) {
      var guid = getGuid();
      var key = qs.unescape(name).toLowerCase();
      if (opts.autoSavePath) {
        _file.path = join(parser.uploadDir, guid);
      } else {
        //hacky way to prevent formidable from saving files to disk
        _file.open = function() {
          _file._writeStream = new DummyWriteStream();
        };
      }
      var file = new File();
      file.guid = guid;
      file.name = name; //field name
      file.fileName = _file.name; //original file name as uploaded
      file.contentType = _file.type;
      file.size = 0;
      file.md5 = null;
      self.emit('file', file);
      _file.on('data', function(data) {
        file.size += data.length;
        file.emit('data', data);
      });
      _file.on('end', function() {
        file.hash = _file.hash;
        if (_file.path && _file.size === 0) {
          _fs.unlink(_file.path);
        } else if (_file.path) {
          file.fullpath = _file.path;
        }
        file.emit('end');
      });
      var exists = hasOwnProperty.call(self.parsed, key);
      if (exists) {
        key = getUniqueKey(self.parsed, key);
      }
      self.parsed[key] = file;
    });
    //parser.on('error', function() {});
    //todo: socket timeout or close
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
    var self = this,
      readStream = self.readStream,
      headers = this.headers,
      opts = self.opts;
    if (this.hashType) {
      var hash = crypto.createHash(this.hashType);
    }

    var contentDisp = util.parseHeaderValue(headers['content-disposition']);
    var fieldName = contentDisp.name || headers['x-name'] || 'file';

    var file = (self.parsed[fieldName] = new File());
    file.guid = getGuid();
    file.name = fieldName;
    file.fileName = contentDisp.filename || headers['x-file-name'] || 'upload';
    file.contentType =
      headers['content-description'] || headers['x-content-type'] || self.type;
    file.size = 0;
    file.md5 = null;

    self.emit('file', file);

    if (opts.autoSavePath) {
      var path = (file.fullpath = join(opts.autoSavePath, getGuid()));
      var outStream = _fs.createWriteStream(app.mappath(path));
      outStream.on('error', function(err) {
        self.emit('error', err);
      });
      readStream.pipe(outStream);
    }

    readStream.on('data', function(data) {
      if (hash) hash.update(data);
      file.size += data.length;
      file.emit('data', data);
    });
    readStream.on('end', function() {
      if (hash) {
        file.hash = hash.digest('hex');
        file[self.hashType] = file.hash;
      }
      file.emit('end');
      self.emit('end');
    });
  };

  function File() {
    this.type = 'file';
  }
  util.inherits(File, EventEmitter);

  File.prototype.toString = function() {
    return typeof this.fileName === 'string' ? this.fileName : '';
  };

  File.prototype.toJSON = function() {
    return {
      guid: this.guid,
      name: this.name,
      fileName: this.fileName,
      contentType: this.contentType,
      size: this.size,
      md5: this.md5,
      hash: this.hash,
      fullpath: this.fullpath,
    };
  };

  File.prototype.saveTo = function(path) {
    fs.moveFile(this.fullpath, path);
    this.fullpath = path;
  };

  //todo: remove this and use formidable.MultipartParser directly (or dicer)
  function DummyWriteStream() {}
  DummyWriteStream.prototype.write = function(data, callback) {
    callback();
  };
  DummyWriteStream.prototype.end = function(callback) {
    callback();
  };

  //Helper functions
  function isUpload(item) {
    return item instanceof File;
  }

  function getGuid() {
    var chars = '';
    for (var i = 0; i < 32; i++) {
      chars += Math.floor(Math.random() * 16).toString(16);
    }
    return chars;
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
