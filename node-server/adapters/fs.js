/*global global, require, app, adapter */
var fs = require('fs');
adapter.define('fs', function(require, exports) {
  "use strict";

  var path = require('path');
  var Buffer = require('buffer').Buffer;

  var slice = Array.prototype.slice;
  var join = path.join;
  var basename = path.basename;

  //convenient access to mappath
  var mappath = app.mappath;

  exports.isFile_ = function(path, callback) {
    fs.stat(path, function(err, stat) {
      callback(null, !err && stat.isFile());
    });
  };

  exports.isDir_ = function(path, callback) {
    fs.stat(path, function(err, stat) {
      callback(null, !err && stat.isDirectory());
    });
  };

  exports.readFile_ = function(path, callback) {
    path = mappath(path);
    fs.readFile(path, callback);
  };

  exports.readTextFile_ = function(path, enc, callback) {
    path = mappath(path);
    var args = slice.call(arguments);
    callback = args.pop();
    enc = (typeof enc == 'string') ? enc : 'utf8';
    fs.readFile(path, enc, callback);
  };

  var writeFile = exports.writeFile_ = function(path, data, opts, callback) {
    var args = slice.call(arguments);
    callback = args.pop();
    opts = (opts && typeof opts == 'object') ? opts : {};
    opts.mode = opts.mode || (opts.overwrite ? 'w' : 'a');
    opts.encoding = opts.encoding || opts.enc || 'utf8';
    path = mappath(path);
    fs.open(path, opts.mode, 438 /*=0666*/, function(err, fd) {
      if (err) {
        if (callback) callback(err);
      } else {
        var buffer = Buffer.isBuffer(data) ? data : new Buffer('' + data, opts.encoding);
        writeAll(fd, buffer, 0, buffer.length, callback);
      }
    });
  };

  exports.writeTextToFile_ = function(path, text, opts, callback) {
    path = mappath(path);
    callback = slice.call(arguments).pop();
    writeFile(path, String(text), opts, callback);
  };

  exports.copyFile_ = function(path, dest, callback) {
    //todo: ENOENT error
    path = mappath(path);
    dest = mappath(dest);
    fs.stat(path, function(err, stat) {
      if (err || !stat.isFile()) {
        return callback(err || new Error('Source path is not a file'));
      }
      fs.stat(dest, function(err, stat) {
        if (err) {
          return callback(err);
        }
        if (stat.isDirectory()) {
          dest = join(dest, basename(path));
        }
        copyFile(path, dest, callback);
      });
    });
  };

  exports.moveFile_ = function(path, dest, callback) {
    //todo: ENOENT error
    path = mappath(path);
    dest = mappath(dest);
    fs.stat(path, function(err, stat) {
      if (err || !stat.isFile()) {
        return callback(err || new Error('Source path is not a file'));
      }
      fs.stat(dest, function(err, stat) {
        if (err) {
          return callback(err);
        }
        if (stat.isDirectory()) {
          dest = join(dest, basename(path));
        }
        fs.rename(path, dest, callback);
      });
    });
  };

  exports.deleteFile_ = function(path, callback) {
    path = mappath(path);
    fs.unlink(path, callback);
  };

  //todo: recursive
  exports.createDir_ = function(path, recurse, callback) {
    var args = slice.call(arguments);
    callback = args.pop();
    recurse = (recurse === true);
    path = mappath(path);
    fs.mkdir(path, callback);
  };

  //todo: recursive
  exports.removeDir_ = function(path, recurse, callback) {
    var args = slice.call(arguments);
    callback = args.pop();
    recurse = (recurse === true);
    path = mappath(path);
    fs.rmdir(path, callback);
  };



  //helpers

  function copyFile(sourcePath, destPath, callback) {
    var source = fs.createReadStream(sourcePath);
    var dest = fs.createWriteStream(destPath);
    source.on('error', callback);
    source.on('close', function() {
      callback();
    });
    source.pipe(dest);
  }

  function writeAll(fd, buffer, offset, length, callback) {
    fs.write(fd, buffer, offset, length, offset, function(err, written) {
      if (err) {
        fs.close(fd, function() {
          callback(err);
        });
      } else
      if (written === length) {
        fs.close(fd, callback);
      } else {
        writeAll(fd, buffer, offset + written, length - written, callback);
      }
    });
  }

});