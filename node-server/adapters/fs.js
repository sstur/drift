/*global global, require, app, adapter */
var fs = require('fs');
adapter.define('fs', function(require, exports) {
  "use strict";
  var slice = Array.prototype.slice;

  //this.exports = exports = {
  //  stat: fs.stat.bind(fs),
  //  open: fs.open.bind(fs),
  //  write: fs.write.bind(fs),
  //  close: fs.close.bind(fs),
  //  rename: fs.rename.bind(fs),
  //};

  //convenient access to mappath
  var mappath = app.mappath;

  var RE_HEAD = /^(.*)\//
    , RE_TAIL = /\/([^\/]*)$/
    , RE_SLASHES = /\/+/g
    , RE_DOTSLASH = /\/.\//g
    , RE_DOTDOTSLASH = /[^\/]+\/\.\.\//g
    , RE_TRAILING_SLASH = /\/$/;

  //Path Resolution Functions
  exports.path = {};

  /*
   * Join one or more paths
   * path.join('assets/', 'scripts', 'file.js')
   */
  exports.path.join = function() {
    var a = [], args = slice.call(arguments);
    args.forEach(function(s, i) {
      if (s) a.push(s);
    });
    var path = a.join('/');
    path = path.replace(RE_SLASHES, '/');
    path = path.replace(RE_DOTSLASH, '/');
    path = path.replace(RE_DOTDOTSLASH, '');
    path = path.replace(RE_TRAILING_SLASH, '');
    return path;
  };

  /*
   * Get the directory part of a path
   * /data/file.txt -> /data/
   */
  exports.path.parent = function(path) {
    return path.replace(RE_TAIL, '');
  };

  /*
   * Get the file part of a path
   * /data/file.txt -> file.txt
   */
  exports.path.member = function(path) {
    return path.replace(RE_HEAD, '');
  };


  //escape unsafe characters in a filename
  exports.escape = function(filename) {
    return String(filename).replace(/[^\w\d!@#$()_\-+={}[],;']/g, function(char) {
      return encodeURIComponent(char);
    });
  };


  var isFile = exports.isFile_ = function(path, callback) {
    fs.stat(path, function(err, stat) {
      callback(null, !err && stat.isFile());
    });
  };

  var isDir = exports.isDir_ = function(path, callback) {
    fs.stat(path, function(err, stat) {
      callback(null, !err && stat.isDirectory());
    });
  };

  var readFile = exports.readFile_ = function(file, callback) {
    file = mappath(file);
    fs.readFile(file, callback);
  };

  var readTextFile = exports.readTextFile_ = function(file, enc, callback) {
    var args = slice.call(arguments);
    callback = args.pop();
    enc = (typeof enc == 'string') ? enc : 'utf8';
    file = mappath(file);
    fs.readFile(file, enc, callback);
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

  var writeTextToFile = exports.writeTextToFile_ = function(file, text, opts, callback) {
    var args = slice.call(arguments);
    callback = args.pop();
    writeFile(file, String(text), opts, callback);
  };

  var copyFile = exports.copyFile_ = function(file, dest, callback) {
    file = mappath(file);
    dest = mappath(dest);
    fs.stat(file, function(err, stat) {
      if (err || !stat.isFile()) {
        return callback(err || new Error('Source path is not a file'));
      }
      fs.stat(dest, function(err, stat) {
        if (err) {
          return callback(err);
        }
        if (stat.isDirectory()) {
          dest = exports.path.join(dest, exports.path.member(file));
        }
        _copyFile(file, dest, callback);
      });
    });
  };

  var moveFile = exports.moveFile_ = function(file, dest, callback) {
    file = mappath(file);
    dest = mappath(dest);
    fs.stat(file, function(err, stat) {
      if (err || !stat.isFile()) {
        return callback(err || new Error('Source path is not a file'));
      }
      fs.stat(dest, function(err, stat) {
        if (err) {
          return callback(err);
        }
        if (stat.isDirectory()) {
          dest = exports.path.join(dest, exports.path.member(file));
        }
        fs.rename(file, dest, callback);
      });
    });
  };

  var deleteFile = exports.deleteFile_ = function(file, callback) {
    file = mappath(file);
    fs.unlink(file, callback);
  };

  //todo: recursive
  var createDir = exports.createDir_ = function(path, recurse, callback) {
    var args = slice.call(arguments);
    callback = args.pop();
    recurse = (recurse === true);
    path = mappath(path);
    fs.mkdir(path, callback);
  };

  //todo: recursive
  var removeDir = exports.removeDir_ = function(file, recurse, callback) {
    var args = slice.call(arguments);
    callback = args.pop();
    recurse = (recurse === true);
    file = mappath(file);
    fs.rmdir(file, callback);
  };

  var log = exports.log_ = function(data, logfile, callback) {
    var args = slice.call(arguments);
    callback = args.pop();
    if (args.length > 1) {
      logfile = args.pop();
    }
    logfile = (logfile && typeof logfile == 'string') ? logfile : 'default';
    logfile = logfile.replace(/\.log$/i, '') + '.log';
    data = args.map(function(line) {
      return (line instanceof Object) ? JSON.stringify(line) : String(line);
    });
    data.push('');
    data.unshift(new Date().toUTCString());
    data = data.join('\n').replace(/(\r\n|[\r\n])/g, '\r\n');
    var path = exports.path.join('data/logs', logfile);
    writeTextToFile(path, data, callback);
  };



  //helpers

  function _copyFile(sourcePath, destPath, callback) {
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