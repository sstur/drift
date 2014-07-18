/*global adapter, app, require */
var fs = require('fs');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf'); //recursive rmdir

adapter.define('fs', function(require, exports) {
  "use strict";

  var path = require('path');

  var join = path.join;
  var basename = path.basename;

  //convenient access to mappath
  var mappath = app.mappath;

  exports.isFile_ = function(path, callback) {
    path = mappath(path);
    fs.stat(path, function(err, stat) {
      callback(null, !err && stat.isFile());
    });
  };

  exports.isDir_ = function(path, callback) {
    path = mappath(path);
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
    enc = enc || 'utf8';
    fs.readFile(path, enc, callback);
  };

  exports.writeFile_ = function(path, data, opts, callback) {
    path = mappath(path);
    writeFile(path, data, opts, callback)
  };

  exports.writeTextToFile_ = function(path, text, opts, callback) {
    path = mappath(path);
    if (typeof text !== 'string') {
      text = (text == null || typeof text.toString !== 'function') ? Object.prototype.toString.call(text) : text.toString();
    }
    writeFile(path, text, opts, callback);
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

  exports.deleteFileIfExists_ = function(path, callback) {
    path = mappath(path);
    fs.unlink(path, function(err) {
      var wasRemoved = !!err;
      if (err && err.code === 'ENOENT') {
        err = null;
      }
      callback(err, wasRemoved);
    });
  };

  exports.createDir_ = function(path, deep, callback) {
    path = mappath(path);
    if (deep) {
      mkdirp(path, callback);
    } else {
      fs.mkdir(path, callback);
    }
  };

  exports.removeDir_ = function(path, deep, callback) {
    path = mappath(path);
    rmdir(path, deep, callback);
  };

  exports.removeDirIfExists_ = function(path, deep, callback) {
    path = mappath(path);
    rmdir(path, deep, function(err) {
      var wasRemoved = !!err;
      if (err && err.code === 'ENOENT') {
        err = null;
      }
      callback(err, wasRemoved);
    });
  };

  //todo: readdir

  //todo: we should treat symlinks as their target
  exports.stat_ = function(src, deep, callback) {
    var fullPath = mappath(src);
    fs.stat(src, function(err, stats) {
      if (err) return callback(err);
      var isDirectory = stats.isDirectory();
      if (!isDirectory && !stats.isFile()) {
        return callback(null, null);
      }
      callback(null, {
        name: path.basename(fullPath),
        dateCreated: stats.ctime,
        dateLastAccessed: stats.atime,
        dateLastModified: stats.mtime,
        type: isDirectory ? 'directory' : 'file',
        size: isDirectory ? 0 : stats.size
      });
    });
  };

  //todo: walk

  //todo: createReadStream

  //todo: createWriteStream



  //helpers
  function rmdir(path, deep, callback) {
    if (deep) {
      rimraf(path, callback);
    } else {
      //todo: unlink?
      fs.rmdir(path, callback);
    }
  }

  function writeFile(path, data, opts, callback) {
    opts = opts || {};
    opts.encoding = opts.encoding || opts.enc || 'utf8';
    if (opts.overwrite) {
      fs.writeFile(path, data, opts, callback);
    } else {
      fs.appendFile(path, data, opts, callback);
    }
  }

  function copyFile(sourcePath, destPath, callback) {
    var source = fs.createReadStream(sourcePath);
    var dest = fs.createWriteStream(destPath);
    source.on('error', callback);
    source.on('close', function() {
      callback();
    });
    source.pipe(dest);
  }

});