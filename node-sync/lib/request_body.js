(function() {
  "use strict";

  var qs = require('./qs');
  var fs = require('fs');
  var path = require('path');
  var join = path.join;
  var basename = path.basename;
  var formidable = require('formidable');
  var EventEmitter = require('events').EventEmitter;

  var savePath = 'app/data/temp';

  var RequestBody = function(req, res, opts) {
    EventEmitter.call(this);
    this.req = req;
    this.res = res;
    this.opts = opts || {};
    this.init();
  };

  RequestBody.prototype = Object.create(EventEmitter.prototype);

  RequestBody.prototype.init = function() {
    var req = this.req, res = this.res;
    if (req.method == 'GET' || req.method == 'HEAD') {
      this.files = {};
      this.fields = {};
      this._finished = true;
      return;
    }
    var type = req.headers['content-type'] || '';
    type = type.toLowerCase().split(';')[0];
    switch(type) {
      case 'application/x-www-form-urlencoded':
        this.processFormBody();
        break;
      case 'application/json':
        this.processJSONBody();
        break;
      case 'multipart/form-data':
        this.processMultiPartBody();
        break;
      case 'application/octet-stream':
        this.processBinaryBody();
        break;
      default:
        res.httpError(415);
        break;
    }
  };

  RequestBody.prototype.getParsed = function(callback) {
    if (this._finished) {
      callback(null, {fields: this.fields, files: this.files});
    } else {
      var self = this;
      this.on('end', function() {
        callback(null, {fields: self.fields, files: self.files});
      });
    }
  };

  RequestBody.prototype.bufferReqBody = function(callback) {
    var req = this.req, res = this.res, opts = this.opts, self = this;
    var body = [], size = 0, maxSize = opts.maxSize || 1048576; //1MB
    req.on('data', function(data) {
      if (size < maxSize) {
        body.push(data.toString(opts.encoding || 'utf8'));
        size += data.length;
      }
    });
    req.on('error', function(err) {
      callback(err);
    });
    req.on('end', function() {
      callback(null, body.join(''));
    });
  };

  RequestBody.prototype.processFormBody = function() {
    var req = this.req, res = this.res, opts = this.opts, self = this;
    this.bufferReqBody(function(err, body) {
      if (err) {
        return res.sendError(err);
      }
      self.files = {};
      self.fields = qs.parse(body);
      self._finished = true;
      self.emit('end');
    });
  };

  RequestBody.prototype.processJSONBody = function() {
    var req = this.req, res = this.res, opts = this.opts, self = this;
    this.bufferReqBody(function(err, body) {
      var fields = {};
      try {
        fields = JSON.parse(body);
      } catch(e) {
        res.httpError(400);
      }
      if (typeof fields != 'object') {
        fields = {data: fields};
      }
      self.files = {};
      self.fields = fields;
      self._finished = true;
      self.emit('end');
    });

  };

  RequestBody.prototype.processMultiPartBody = function() {
    var req = this.req, res = this.res, opts = this.opts, self = this;
    var form = new formidable.IncomingForm();
    form.uploadDir = global.mappath(savePath);
    form.parse(req, function(err, fields, files) {
      self.files = {};
      for (var n in files) {
        var file = files[n];
        if (file.size == 0) {
          fs.unlink(file.path);
          continue;
        }
        self.files[n] = {
          path: savePath + '/' +  basename(file.path),
          name: file.name,
          type: file.type,
          size: file.size,
          fieldName: n
        }
      }
      self.fields = fields;
      self._finished = true;
      self.emit('end');
    });
  };

  RequestBody.prototype.processBinaryBody = function() {
    var req = this.req, res = this.res, opts = this.opts, self = this;
    var uploadDir = global.mappath(savePath);
    var mimeType = req.headers['x-content-type'] || 'application/octet-stream';
    var fileName = req.headers['x-file-name'] || 'upload';
    var fileSize = 0;
    var fieldName = req.headers['x-field-name'] || 'upload';
    var filePath = join(uploadDir, generateName());
    var outStream = fs.createWriteStream(filePath);
    outStream.on('error', function(err) {
      console.log('write stream error', err);
    });
    req.pipe(outStream);
    req.on('data', function(data) {
      fileSize += data.length;
    });
    req.on('end', function() {
      self.files = {};
      self.files[fieldName] = {
        path: savePath + '/' +  basename(filePath),
        name: fileName,
        type: mimeType,
        size: fileSize,
        fieldName: fieldName
      };
      self.fields = {};
      self._finished = true;
      self.emit('end');
    });
  };

  function generateName() {
    var name = '';
    for (var i = 0; i < 32; i++) {
      name += Math.floor(Math.random() * 16).toString(16);
    }
    return name;
  }

  module.exports = RequestBody;

})();