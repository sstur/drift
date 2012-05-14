var _super = require('fs');
define('fs', function(require, exports) {
  "use strict";

  var toArray = Array.prototype.slice;

  //Quick access to map paths
  var mappath = app.mappath;

  //Path Resolution Functions
  exports.path = {};

  var RE_HEAD = /^(.*)\//
    , RE_TAIL = /\/([^\/]*)$/
    , RE_SLASHES = /\/+/g
    , RE_DOTSLASH = /\/.\//g
    , RE_DOTDOTSLASH = /[^\/]+\/\.\.\//g
    , RE_TRAILING_SLASH = /\/$/;

  /*
   * Join one or more paths
   * path.join('assets/', 'scripts', 'file.js')
   */
  exports.path.join = function() {
    var a = [], args = toArray.call(arguments);
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
  exports.path.join.sync = true;

  /*
   * Get the directory part of a path
   * /data/file.txt -> /data/
   */
  exports.path.parent = function(path) {
    return path.replace(RE_TAIL, '');
  };
  exports.path.parent.sync = true;

  /*
   * Get the file part of a path
   * /data/file.txt -> file.txt
   */
  exports.path.member = function(path) {
    return path.replace(RE_HEAD, '');
  };
  exports.path.member.sync = true;


  //escape unsafe characters in a filename
  exports.escape = function(filename) {
    return String(filename).replace(/[^\w\d!@#$()_\-+={}[],;']/g, function(char) {
      return encodeURIComponent(char);
    });
  };
  exports.escape.sync = true;


  exports.isFile = function(path, callback) {
    _super.stat(path, function(err, stat) {
      //todo: if exists but error
      callback(null, !err && stat.isFile());
    });
  };

  exports.isDir = function(path, callback) {
    _super.stat(path, function(err, stat) {
      //todo: if exists but error
      callback(null, !err && stat.isDirectory());
    });
  };

  exports.readTextFile = function(file, enc, callback) {
    var args = toArray.call(arguments);
    callback = args.pop();
    enc = (typeof enc == 'string') ? enc : 'utf8';
    _super.readFile(mappath(file), enc, callback);
  };

  exports.writeTextToFile = function(file, text, opts) {
    if (!opts) opts = {};
    _super.writeFile(mappath(file), String(text), {
      mode: opts.overwrite ? 'w' : 'a',
      encoding: (typeof opts.enc == 'string') ? opts.enc : 'utf8'
    });
  };

  exports.moveFile = function(file, dest) {
    //todo: if dest is directory?
    _super.rename(mappath(file), mappath(dest));
  };

  exports.copyFile = function(file, dest) {
    //todo: if dest is directory?
    _super.copyFile(mappath(file), mappath(dest));
  };

  exports.deleteFile = function(file) {
    _super.unlink(mappath(file));
  };

  exports.createDir = function(path, name) {
    var fullpath = exports.path.join(path, name);
    _super.mkdir(mappath(fullpath));
  };

  exports.removeDir = function(file, recurse) {
    //todo: recursive
    _super.rmdir(mappath(file));
  };

  //todo: change to details or readdir
  exports.stat = function(path, deep) {
    var fso, stats, result = {}, getChildren;
    if (typeof path == 'string') {
      try {
        stats = fso.getFolder(mappath(path));
        getChildren = true;
      } catch(e) {
        stats = fso.getFile(mappath(path));
      }
    } else {
      stats = path;
    }
    result.name = stats.name;
    result.size = stats.size;
    result.dateCreated = new Date(stats.dateCreated);
    result.dateLastAccessed = new Date(stats.dateLastAccessed);
    result.dateLastModified = new Date(stats.dateLastModified);
    if (stats.type == 'File Folder') {
      result.type = 'folder';
      result.children = [];
      if (getChildren || deep) {
        result.folders = [];
        result._folders = [];
        stats.subFolders.forEach(function(item, i) {
          result.folders.push(item.name);
          result._folders.push(exports.stat(item, deep));
          result.children.push(result._folders[i]);
        });
        result.files = [];
        result._files = [];
        stats.files.forEach(function(item, i) {
          result.files.push(item.name);
          result._files.push(exports.stat(item, deep));
          result.children.push(result._files[i]);
        });
      }
    } else {
      result.type = 'file';
      result._delete = function() {
        stats['delete']();
      };
      result._move = function(p) {
        stats.move(mappath(p));
      };
      result.fileType = stats.type;
    }
    return result;
  };


  /*
   * Logging / Debugging
   */
  exports.log = function() {
    var logfile, args = toArray.call(arguments), logLevel = 1;
    if (typeof args[0] == 'number' && args[0] > 0 && parseInt(args[0], 10) == args[0]) {
      logLevel = args.shift();
    }
    if (args.length > 1) {
      logfile = args.pop();
    }
    if (!logfile) logfile = 'default';
    var date = new Date().toUTCString()
      , data = args
      , path = exports.path.join('logs', logfile.replace(/\.log$/i, '') + '.log');
    data.forEach(function(line, i) {
      data[i] = (line instanceof Object) ? JSON.stringify(line) : String(line);
    });
    data.push('');
    exports.writeTextToFile(path, (date + '\n' + data.join('\n')).replace(/(\r\n|[\r\n])+/g, '\r\n') + '\r\n');
  };

});