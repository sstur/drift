/*!
 * todo:
 *  rename fs.stat -> fs.getInfo
 *  rename fs.readdir -> fs.getDirContents
 */
/*global adapter, app, require */
var _fs = require('fs');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf'); //recursive rmdir

adapter.define('fs', function(require, fs) {
  "use strict";

  var path = require('path');
  var util = require('util');

  var join = path.join;
  var basename = path.basename;

  //convenient access to mappath
  var mappath = app.mappath;

  var ERROR_NO = {
    EXDEV: 52,
    EISDIR: 28, //illegal operation on a directory
    EEXIST: 47
  };

  fs.isFile_ = function(path, callback) {
    path = mappath(path);
    _fs.stat(path, function(err, stat) {
      callback(null, !err && stat.isFile());
    });
  };

  fs.isDir_ = function(path, callback) {
    path = mappath(path);
    _fs.stat(path, function(err, stat) {
      callback(null, !err && stat.isDirectory());
    });
  };

  fs.readFile_ = function(path, callback) {
    path = mappath(path);
    _fs.readFile(path, callback);
  };

  fs.readTextFile_ = function(path, enc, callback) {
    path = mappath(path);
    enc = enc || 'utf8';
    _fs.readFile(path, enc, callback);
  };

  fs.writeFile_ = function(path, data, opts, callback) {
    path = mappath(path);
    writeFile(path, data, opts, callback)
  };

  fs.writeTextToFile_ = function(path, text, opts, callback) {
    path = mappath(path);
    if (typeof text !== 'string') {
      text = (text == null || typeof text.toString !== 'function') ? Object.prototype.toString.call(text) : text.toString();
    }
    writeFile(path, text, opts, callback);
  };

  fs.copyFile_ = function(src, dest, callback) {
    src = mappath(src);
    dest = mappath(dest);
    checkCopyFile(src, dest, function(err, src, dest) {
      if (err) return callback(err);
      copyFile(src, dest, callback);
    });
  };

  fs.moveFile_ = function(src, dest, callback) {
    src = mappath(src);
    dest = mappath(dest);
    checkCopyFile(src, dest, function(err, src, dest) {
      if (err) return callback(err);
      _fs.rename(src, dest, function(err) {
        //tried to rename across devices
        if (err && err.code === 'EXDEV') {
          return moveFileSlow(src, dest, callback);
        }
        callback(err);
      });
    });
  };

  fs.deleteFile_ = function(path, callback) {
    path = mappath(path);
    _fs.unlink(path, callback);
  };

  fs.deleteFileIfExists_ = function(path, callback) {
    path = mappath(path);
    _fs.unlink(path, function(err) {
      var wasRemoved = !!err;
      if (err && err.code === 'ENOENT') {
        err = null;
      }
      callback(err, wasRemoved);
    });
  };

  fs.createDir_ = function(path, deep, callback) {
    path = mappath(path);
    if (deep) {
      mkdirp(path, callback);
    } else {
      _fs.mkdir(path, callback);
    }
  };

  fs.removeDir_ = function(path, deep, callback) {
    path = mappath(path);
    rmdir(path, deep, callback);
  };

  fs.removeDirIfExists_ = function(path, deep, callback) {
    path = mappath(path);
    rmdir(path, deep, function(err) {
      var wasRemoved = !!err;
      if (err && err.code === 'ENOENT') {
        err = null;
      }
      callback(err, wasRemoved);
    });
  };

  //todo: we should treat symlinks as their target
  fs.stat_ = function(src, deep, callback) {
    var fullPath = mappath(src);
    _fs.stat(src, function(err, stat) {
      if (err) return callback(err);
      var isDirectory = stat.isDirectory();
      if (!isDirectory && !stat.isFile()) {
        return callback(null, null);
      }
      callback(null, fileInfo(basename(fullPath), stat));
    });
  };

  fs.readdir_ = function(path, callback) {
    path = mappath(path);
    _fs.readdir(path, callback);
  };


  /**
   * Walks directory, depth-first, calling fn for each subdirectory and
   * file and passing `info` object and `prefix` which can be prepended to
   * info.name to get relative path.
   */
  fs.walk_ = function(path, fn, callback) {
    path = mappath(path);
    walkDir(path, fn, '', callback);
  };



  fs.createReadStream = function(path, opts) {
    return new FileReadStream(path, opts);
  };

  fs.createWriteStream = function(path, opts) {
    opts = opts || {};
    //default is to append
    opts.append = (opts.append !== false);
    //overwrite option will override append
    if (opts.overwrite === true) opts.append = false;
    return new FileWriteStream(path, opts);
  };


  function FileReadStream(path, opts) {
    this.path = path;
    opts = opts || {};
    this.opts = opts;
    this.init();
  }
  fs.FileReadStream = FileReadStream;
  app.eventify(FileReadStream.prototype);

  util.extend(FileReadStream.prototype, {
    setEncoding: function(enc) {
      this.opts.encoding = enc;
    },
    size: function() {
      return this._bytesTotal;
    },
    init_: function(callback) {
      var path = app.mappath(this.path);
      this._bytesRead = 0;
      _fs.stat(path, function(err, stat) {
        if (err) return callback(err);
        this._bytesTotal = stat.size;
        callback();
      }.bind(this));
    },
    read_: function(callback) {
      var path = app.mappath(this.path);
      var opts = {encoding: this.opts.encoding};
      var self = this;
      var stream = _fs.createReadStream(path, opts);
      stream.on('error', callback);
      stream.on('open', function() {
        stream.on('readable', drain);
        stream.on('end', function() {
          self.emit('end');
          callback();
        });
        drain();
      });
      //drain the bytes in the buffer (resets readable flag)
      var drain = function() {
        var chunk;
        while (null !== (chunk = stream.read())) {
          self.emit('data', chunk);
        }
      };
    },
    readAll: function() {
      if (this.opts.encoding) {
        return fs.readTextFile(this.path, this.opts.encoding);
      } else {
        return fs.readFile(this.path);
      }
    }
  });


  function FileWriteStream(path, opts) {
    this.path = path;
    this.opts = opts || {};
  }
  fs.FileWriteStream = FileWriteStream;

  util.extend(FileWriteStream.prototype, {
    setEncoding: function(enc) {
      this.opts.encoding = enc;
    },
    write_: function(data, enc, callback) {
      if (this._finished) {
        callback();
      } else
      if (this._stream) {
        this._stream.write(data, enc, callback);
      } else {
        openWriteStream(mappath(this.path), this.opts, function(err, stream) {
          if (err) return callback(err);
          this._stream = stream;
          this._stream.write(data, enc, callback);
        }.bind(this));
      }
    },
    end_: function(callback) {
      if (this._finished) return;
      this._finished = true;
      this._stream.end(callback);
    }
  });



  //helpers
  function rmdir(path, deep, callback) {
    if (deep) {
      rimraf(path, callback);
    } else {
      //todo: unlink?
      _fs.rmdir(path, callback);
    }
  }

  function walkDir(path, fn, prefix, callback) {
    _fs.readdir(path, function(err, names) {
      var files = [];
      var directories = [];
      var errors = [];
      var results = {};
      var list = new AsyncList(names);
      list.forEach(function(name, done) {
        var pathName = join(path, name);
        _fs.stat(pathName, function(err, stat) {
          if (err) {
            errors.push(name);
          } else
          if (stat.isFile()) {
            files.push(name);
          } else
          if (stat.isDirectory()) {
            directories.push(name);
          }
          results[name] = err || stat;
          done();
        });
      });
      list.on('done', function() {
        var list = new AsyncList(directories);
        list.forEach(function(name, done) {
          var pathName = join(path, name);
          walkDir(pathName, fn, prefix + name + '/', function() {
            fn(fileInfo(name, results[name]), prefix);
            done();
          });
        });
        list.on('done', function() {
          files.forEach(function(name) {
            fn(fileInfo(name, results[name]), prefix);
          });
          callback();
        });
      });
    });
  }

  function fileInfo(name, file) {
    var isDirectory = file.isDirectory();
    return {
      name: name,
      dateCreated: file.ctime,
      dateLastAccessed: file.atime,
      dateLastModified: file.mtime,
      type: isDirectory ? 'directory' : 'file',
      size: isDirectory ? 0 : file.size
    };
  }

  function openWriteStream(path, opts, callback) {
    var flags = (opts.append) ? 'a' : 'w';
    var encoding = opts.encoding || 'utf8';
    var stream = _fs.createWriteStream(path, {flags: flags, encoding: encoding});
    stream.on('error', function(err) {
      //if trying to append file, but it doesn't exist, create it
      if (opts.append && err.code === 'ENOENT') {
        openWriteStream(path, {encoding: encoding}, callback);
      } else {
        callback(err);
      }
    });
    stream.on('open', function() {
      callback(null, stream);
    });
  }

  function writeFile(path, data, opts, callback) {
    opts = opts || {};
    opts.encoding = opts.encoding || opts.enc || 'utf8';
    if (opts.overwrite) {
      _fs.writeFile(path, data, opts, callback);
    } else {
      _fs.appendFile(path, data, opts, callback);
    }
  }

  //make sure src is a file and destination either doesn't exist or is a directory
  function checkCopyFile(src, dest, callback) {
    _fs.stat(src, function(err, stat) {
      if (err) return callback(err);
      if (!stat.isFile()) {
        var errCode = stat.isDirectory() ? 'EISDIR' : 'ENOENT';
        return callback(posixError(errCode, {path: src}));
      }
      _fs.stat(dest, function(err, stat) {
        if (err && err.code !== 'ENOENT') {
          return callback(err);
        }
        if (!err) {
          //destination exists
          if (stat.isDirectory()) {
            dest = join(dest, basename(src));
          } else {
            return callback(posixError('EEXIST', {path: dest}));
          }
        }
        callback(null, src, dest);
      });
    });
  }

  function copyFile(srcPath, destPath, callback) {
    var src = _fs.createReadStream(srcPath);
    var dest = _fs.createWriteStream(destPath);
    src.on('error', callback);
    src.on('close', function() {
      callback();
    });
    src.pipe(dest);
  }

  function moveFileSlow(srcPath, destPath, callback) {
    copyFile(srcPath, destPath, function(err) {
      if (err) {
        callback(err);
      } else {
        _fs.unlink(srcPath, callback);
      }
    });
  }

  function posixError(code, opts) {
    var message = code;
    if (opts.path) {
      message += ', ' + (opts.syscall ? opts.syscall + ' ' : '') + opts.path;
    }
    var e = new Error(message);
    e.code = code;
    e.errno = ERROR_NO[code];
    if (opts.path) e.path = opts.path;
    if (opts.syscall) e.syscall = opts.syscall;
    return e;
  }

  /**
   * very simple abstraction to do a list of things in parallel and emit 'done'
   * event when all have completed
   */
  function AsyncList(list) {
    this.list = list;
  }
  app.eventify(AsyncList.prototype);
  AsyncList.prototype.forEach = function(fn) {
    var list = this.list;
    var doneCount = 0;
    var done = this.emit.bind(this, 'done');
    var defer = true; //defer the done event
    var callback = function() {
      doneCount += 1;
      if (doneCount === list.length) {
        defer ? process.nextTick(done) : done();
      }
    }.bind(this);
    list.forEach(function(item) {
      fn(item, callback);
    });
    defer = false;
  };

});
