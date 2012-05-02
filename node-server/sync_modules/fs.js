var join = require('path').join;

var _super = (function() {
  var fs = require('fs')
    , sync = global.Fiber.sync;
  return {
    stat: sync(fs.stat, fs),
    open: sync(fs.open, fs),
    write: sync(fs.write, fs),
    close: sync(fs.close, fs),
    readFile: sync(fs.readFile, fs),
    writeFile: sync(fs.writeFile, fs),
    unlink: sync(fs.unlink, fs),
    mkdir: sync(fs.mkdir, fs),
    rmdir: sync(fs.rmdir, fs)
  };
})();

/**
 * Filesystem Module
 *
 */
define('fs', function(require, exports) {
  "use strict";

  /*
   * Private Variables
   */
  var fs = exports;

  var toArray = Array.prototype.slice;

  /*
   * Path Resolution Functions
   */
  var path = fs.path = {};

  /*
   * This function translates an app-relative path into a file-system path
   */
  var mappath = fs.mappath = global.mappath;

  /*
   * Join one or more paths
   * path.join('assets/', 'scripts', 'file.js')
   */
  path.join = function() {
    var a = [], args = toArray.call(arguments);
    args.forEach(function(s, i) {
      if (s) a.push(s);
    });
    var p = a.join('/');
    p = p.replace(/\/\//g, '/');
    p = p.replace(/\/.\//g, '/');
    p = p.replace(/[^\/]+\/\.\.\//g, '');
    p = p.replace(/\/$/,'');
    return p;
  };

  /*
   * This function returns the "folder" part of a path
   * /data/file.txt -> /data/
   */
  path.parent = function(p) {
    return p.replace(/\/([^\/]*)$/, '');
  };

  /*
   * This function returns the "file" part of a path
   * /data/file.txt -> file.txt
   */
  path.member = function(p) {
    return p.replace(/^(.*)\//, '');
  };


  fs.escape = function(filename) {
    return String(filename).replace(/[^\w\d!@#$()_\-+={}[],;']/g, function(char) {
      return encodeURIComponent(char);
    });
  };

  fs.isFile = function(f) {
    var stats, result = true;
    try {
      stats = _super.stat(mappath(f));
    } catch(e) {
      return false;
    }
    return stats.isFile();
  };

  fs.isDir = function(f) {
    var stats, result = true;
    try {
      stats = _super.stat(mappath(f));
    } catch(e) {
      return false;
    }
    return stats.isDirectory();
  };

  fs.readTextFile = function(f, enc) {
    return _super.readFile(mappath(f), enc || 'utf8');
  };

  fs.writeTextToFile = function(f, text, opts) {
    if (!opts) opts = {};
    //todo: write-streams / open files?
    if (opts.overwrite) {
      _super.writeFile(mappath(f), text, opts.enc || 'utf8');
    } else {
      var fd = _super.open(mappath(f), 'a');
      _super.write(fd, text);
      _super.close(fd);
    }
  };

  fs.moveFile = function(f, d) {
    //todo
  };

  fs.copyFile = function(f, d) {
    //todo
  };

  fs.deleteFile = function(f) {
    _super.unlink(mappath(f));
  };

  fs.createDir = function(f, n) {
    var path = path.join(f, n);
    _super.mkdir(mappath(path));
  };

  fs.removeDir = function(f, r) {
    //todo: r = recursive
    _super.rmdir(mappath(f));
  };

  //todo: change to details or readdir
  fs.stat = function(f, deep) {
    var fso, stats, result = {}, getChildren;
    if (typeof f == 'string') {
      try {
        stats = fso.getFolder(mappath(f));
        getChildren = true;
      } catch(e) {
        stats = fso.getFile(mappath(f));
      }
    } else {
      stats = f;
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
    var date = Date.now().toUTCString()
      , data = args
      , p = path.join('logs', logfile.replace(/\.log$/, '') + '.log');
    data.forEach(function(line, i) {
      data[i] = (line instanceof Object) ? JSON.stringify(line) : String(line);
    });
    data.push('');
    try {
      fs.writeTextToFile(p, (date + '\n' + data.join('\n')).replace(/(\r\n|[\r\n])+/g, '\r\n') + '\r\n');
    } catch(e) {
      throw new Error('Error writing to logfile: ' + p);
    }
  };

});