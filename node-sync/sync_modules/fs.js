var Fiber = require('fiber').Fiber;
var _super = require('../async/fs');
define('fs', function(require, exports) {
  "use strict";

  _super = Fiber.makeSync(_super);

  /*
   * Private Variables
   */
  var fs = exports;

  var toArray = Array.prototype.slice;

  //Quick access to map paths
  var mappath = app.mappath;

  //Path Resolution Functions
  fs.path = {};

  /*
   * Join one or more paths
   * path.join('assets/', 'scripts', 'file.js')
   */
  fs.path.join = function() {
    var a = [], args = toArray.call(arguments);
    args.forEach(function(s, i) {
      if (s) a.push(s);
    });
    var p = a.join('/');
    p = p.replace(/\/\//g, '/');
    p = p.replace(/\/.\//g, '/');
    p = p.replace(/[^\/]+\/\.\.\//g, '');
    p = p.replace(/\/$/, '');
    return p;
  };

  /*
   * This function returns the "folder" part of a path
   * /data/file.txt -> /data/
   */
  fs.path.parent = function(p) {
    return p.replace(/\/([^\/]*)$/, '');
  };

  /*
   * This function returns the "file" part of a path
   * /data/file.txt -> file.txt
   */
  fs.path.member = function(p) {
    return p.replace(/^(.*)\//, '');
  };


  fs.escape = function(filename) {
    return String(filename).replace(/[^\w\d!@#$()_\-+={}[],;']/g, function(char) {
      return encodeURIComponent(char);
    });
  };

  fs.isFile = function(path) {
    var stats, result = true;
    try {
      stats = _super.stat(mappath(path));
    } catch(e) {
      return false;
    }
    return stats.isFile();
  };

  fs.isDir = function(path) {
    var stats, result = true;
    try {
      stats = _super.stat(mappath(path));
    } catch(e) {
      return false;
    }
    return stats.isDirectory();
  };

  fs.readTextFile = function(file, enc) {
    return _super.readFile(mappath(file), enc || 'utf8');
  };

  fs.writeTextToFile = function(file, text, opts) {
    if (!opts) opts = {};
    _super.writeFile(mappath(file), String(text), {
      mode: opts.overwrite ? 'w' : 'a',
      encoding: (typeof opts.enc == 'string') ? opts.enc : 'utf8'
    });
  };

  fs.moveFile = function(file, dest) {
    //todo: if dest is directory?
    _super.rename(mappath(file), mappath(dest));
  };

  fs.copyFile = function(file, dest) {
    //todo: if dest is directory?
    _super.copyFile(mappath(file), mappath(dest));
  };

  fs.deleteFile = function(file) {
    _super.unlink(mappath(file));
  };

  fs.createDir = function(path, name) {
    var fullpath = fs.path.join(path, name);
    _super.mkdir(mappath(fullpath));
  };

  fs.removeDir = function(file, recurse) {
    //todo: recursive
    _super.rmdir(mappath(file));
  };

  //todo: change to details or readdir
  fs.stat = function(path, deep) {
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
          result._folders.push(fs.stat(item, deep));
          result.children.push(result._folders[i]);
        });
        result.files = [];
        result._files = [];
        stats.files.forEach(function(item, i) {
          result.files.push(item.name);
          result._files.push(fs.stat(item, deep));
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
  fs.log = function() {
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
      , path = fs.path.join('logs', logfile.replace(/\.log$/i, '') + '.log');
    data.forEach(function(line, i) {
      data[i] = (line instanceof Object) ? JSON.stringify(line) : String(line);
    });
    data.push('');
    fs.writeTextToFile(path, (date + '\n' + data.join('\n')).replace(/(\r\n|[\r\n])+/g, '\r\n') + '\r\n');
  };

});