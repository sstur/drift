/*global global, require, module */
//todo: extend, parseHeaderValue
(function() {
  "use strict";

  var qs = require('./qs');
  var fs = require('fs');
  var path = require('path'), join = path.join;
  var basename = path.basename;
  var crypto = require('crypto');
  var formidable = require('formidable');
  var EventEmitter = require('events').EventEmitter;

  var savePath = 'app/data/temp';

  var RequestBody = function(req, res, opts) {
    EventEmitter.call(this);
    this.req = req;
    this.res = res;
    this.opts = opts || {};
    this.files = {};
    this.fields = {};
    this.on('end', function() {
      this._finished = true;
    });
  };

  RequestBody.prototype = Object.create(EventEmitter.prototype);

  //todo: this should take a method, headers and readStream
  //  in place of responseStream, it should emit errors
  RequestBody.prototype.parse = function() {
    var req = this.req, res = this.res, headers = req.headers;
    if (req.method !== 'POST' && req.method !== 'PUT') {
      //nothing to parse
      this.emit('end');
      return;
    }
    this.length = parseInt(headers['content-length'], 10);
    if (isNaN(this.length)) {
      //todo: this.emit('error', '411 Length Required')
      res.httpError(411);
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
      //todo: this.emit('error', '415 Content-Type Required')
      res.httpError(415);
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
  };

  //todo: this should be moved to adapter: req.parseReqBody() [async wrapped]
  RequestBody.prototype.getParsed = function(callback) {
    var self = this;
    if (this._finished) {
      callback(null, {fields: self.fields, files: self.files});
    } else {
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
      extend(self.fields, qs.parse(body));
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
      extend(self.fields, fields);
      self.emit('end');
    });

  };

  RequestBody.prototype.processMultiPartBody = function() {
    var req = this.req, res = this.res, opts = this.opts, self = this;
    var form = new formidable.IncomingForm();
    form.uploadDir = global.mappath(savePath);
    //calculate md5 hash for each uploaded file
    form.on('fileBegin', function(name, file) {
      file._hash = crypto.createHash('md5');
      var _write = file.write;
      file.write = function(buffer, cb) {
        file._hash.update(buffer);
        _write.apply(file, arguments);
      };
      file.on('end', function() {
        file.hash = file._hash.digest('hex');
      });
    });
    form.parse(req, function(err, fields, files) {
      Object.keys(files).forEach(function(n) {
        var file = files[n];
        if (file.size == 0) {
          fs.unlink(file.path);
          return;
        }
        self.files[n] = {
          path: savePath + '/' +  basename(file.path),
          name: file.name,
          type: file.type,
          size: file.size,
          hash: file.hash,
          fieldName: n
        }
      });
      extend(self.fields, fields);
      self.emit('end');
    });
  };

  RequestBody.prototype.processBinaryBody = function() {
    var self = this, req = self.req, headers = req.headers;
    var contentDisp = parseHeaderValue(headers['content-disposition'] || '');
    var fieldName = contentDisp.name || headers['x-name'] || 'file';

    var file = self.files[fieldName] = {size: 0, fieldName: fieldName};
    file.name = contentDisp.filename || headers['x-file-name'] || 'upload';
    file.type = headers['content-description'] || headers['x-content-type'] || self.type;
    file.path = join(global.mappath(savePath), generateName());

    var hash = crypto.createHash('md5');

    //todo: self.emit('file', file)
    var outStream = fs.createWriteStream(file.path);
    outStream.on('error', function(err) {
      //todo: self.emit('error', err);
      console.log('write stream error', err);
    });
    req.pipe(outStream);
    req.on('data', function(data) {
      hash.update(data);
      file.size += data.length;
      //todo: file.emit('data', data)
    });
    req.on('end', function() {
      file.hash = hash.digest('hex');
      //todo: file.emit('end')
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