/*!
 * todo:
 *  removeFile, removeDir: consolidate to helper for ifExists
 *  throw ENOTEMPTY, rmdir 'path/to/file'
 *  removeDir(path, {recursive: true}) [or deep]
 *  moveDir, copyDir
 *  rename fs.stat -> fs.getInfo
 *  rename fs.readdir -> fs.getDirContents
 *  rename dateCreated, dateLastAccessed, dateLastModified (remove date prefix)
 *  replace eNoEnt() with new Error('ENOENT') + source transform
 */
/*global app, define */
define('fs', function(require, fs) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;
  var pathLib = require('path');

  var EXTENDED = /[\x80-\x9F]/g;
  var WIN1252 = {"80":"\u20ac","82":"\u201a","83":"\u0192","84":"\u201e","85":"\u2026","86":"\u2020","87":"\u2021",
    "88":"\u02c6","89":"\u2030","8a":"\u0160","8b":"\u2039","8c":"\u0152","8e":"\u017d","91":"\u2018","92":"\u2019",
    "93":"\u201c","94":"\u201d","95":"\u2022","96":"\u2013","97":"\u2014","98":"\u02dc","99":"\u2122","9a":"\u0161",
    "9b":"\u203a","9c":"\u0153","9e":"\u017e","9f":"\u0178"};

  var FSO = new ActiveXObject('Scripting.FileSystemObject');

  fs.moveFile = function(src, dest) {
    try {
      var fso = FSO.getFile(app.mappath(src));
    } catch(e) {
      if (isNotFound(e)) {
        throw util.extend(new Error(eNoEnt(src)), {code: 'ENOENT'});
      }
      throw new Error('Error opening file: ' + src + '\n' + e.message);
    }
    if (isDirectory(dest)) {
      dest = pathLib.join(dest, pathLib.basename(src));
    }
    try {
      fso.move(app.mappath(dest));
    } catch(e) {
      if (isNotFound(e)) {
        throw util.extend(new Error(eNoEnt(dest)), {code: 'ENOENT'});
      }
      throw new Error('Error moving file ' + src + ' to ' + dest + '\n' + e.message);
    }
  };

  fs.copyFile = function(src, dest) {
    try {
      var fso = FSO.getFile(app.mappath(src));
    } catch(e) {
      if (isNotFound(e)) {
        throw util.extend(new Error(eNoEnt(src)), {code: 'ENOENT'});
      }
      throw new Error('Error opening file: ' + src + '\n' + e.message);
    }
    if (isDirectory(dest)) {
      dest = pathLib.join(dest, pathLib.basename(src));
    }
    try {
      fso.copy(app.mappath(dest));
    } catch(e) {
      if (isNotFound(e)) {
        throw util.extend(new Error(eNoEnt(dest)), {code: 'ENOENT'});
      }
      throw new Error('Error copying file ' + src + ' to ' + dest + '\n' + e.message);
    }
  };

  fs.deleteFile = function(path, opts) {
    opts = opts || {};
    try {
      FSO.deleteFile(app.mappath(path), true);
    } catch(e) {
      if (isNotFound(e)) {
        if (opts.ifExists) return;
        throw util.extend(new Error(eNoEnt(path)), {code: 'ENOENT'});
      }
      throw new Error('Error Deleting File: ' + path + '\n' + e.message);
    }
  };

  fs.deleteFileIfExists = function(path) {
    fs.deleteFile(path, {ifExists: true});
  };

  fs.createDir = function(path, opts) {
    opts = opts || {};
    var parent = pathLib.dirname(path);
    try {
      var folder = FSO.getFolder(app.mappath(parent));
      folder.subFolders.add(pathLib.basename(path));
    } catch(e) {
      if (isNotFound(e)) {
        if (opts.deep) {
          fs.createDir(parent, opts);
          //prevent endless loop
          opts.deep = false;
          return fs.createDir(path, opts);
        }
        throw util.extend(new Error(eNoEnt(parent)), {code: 'ENOENT'});
      }
      //e.message == "File already exists"
      throw new Error('Error Creating Directory: ' + path + '\n' + e.message);
    }
  };

  fs.removeDir = function(path, opts) {
    opts = opts || {};
    try {
      FSO.deleteFolder(app.mappath(path), true);
    } catch(e) {
      if (isNotFound(e)) {
        if (opts.ifExists) return;
        throw util.extend(new Error(eNoEnt(path)), {code: 'ENOENT'});
      }
      throw new Error('Error Removing Directory: ' + path + '\n' + e.message);
    }
  };

  fs.removeDirIfExists = function(path) {
    fs.removeDir(path, {ifExists: true});
  };


  fs.readdir = function(path) {
    var fso = getFileOrDir(path);
    var children = getChildren(fso);
    return children.map(function(fso) {
      return fso.name;
    });
  };

  /**
   * Walks directory, depth-first, calling fn for each subdirectory and
   * file and passing `info` object and `prefix` which can be prepended to
   * info.name to get relative path.
   */
  fs.walk = function(src, fn) {
    var fso = FSO.getFolder(app.mappath(src));
    //todo: technically we should do all directories before the first file
    //  should we stat deep and then walk?
    walkDeep(fso, fn, '');
  };

  /**
   * Get info for a file/directory. If `deep` then directories get a non-zero
   * `size` property and a `children` array containing stat of each child.
   *
   * @param {string|FSO} path
   * @param {boolean} [deep]
   * @returns {object|null}
   */
  fs.stat = function(path, deep) {
    return getInfo(getFileOrDir(path), deep);
  };


  fs.createReadStream = function(file, opts) {
    opts = opts || {};
    return (opts.encoding) ? new TextReadStream(file, opts) : new FileReadStream(file, opts);
  };

  fs.createWriteStream = function(file, opts) {
    opts = opts || {};
    //default is to append
    opts.append = (opts.append !== false);
    //overwrite option will override append
    if (opts.overwrite === true) opts.append = false;
    return new FileWriteStream(file, opts);
  };


  fs.readTextFile = function(file, enc) {
    enc = enc || 'utf8';
    return fs.createReadStream(file, {encoding: enc}).readAll();
  };

  fs.writeTextToFile = function(file, text, opts) {
    var stream = fs.createWriteStream(file, opts);
    stream.write(text);
    stream.end();
  };

  function FileReadStream(file, opts) {
    this.file = file;
    opts = this.opts = opts || {};
    opts.chunkSize = opts.chunkSize || 1024;
    var stream = this._stream = new ActiveXObject('ADODB.Stream');
    stream.type = 1;
    stream.open();
    try {
      stream.loadFromFile(app.mappath(file));
    } catch(e) {
      if (e.message.match(/could not be opened/i)) {
        throw util.extend(new Error(eNoEnt(file)), {code: 'ENOENT'});
      }
      throw e;
    }
    this._bytesRead = 0;
    this._bytesTotal = stream.size;
  }
  app.eventify(FileReadStream.prototype);

  util.extend(FileReadStream.prototype, {
    //unsafe for multibyte encodings; use TextReadStream
    setEncoding: function(enc) {
      this.opts.encoding = enc;
    },
    _readBytes: function(bytes) {
      bytes = Math.min(bytes, this._bytesTotal - this._bytesRead);
      this._bytesRead += bytes;
      var data = new Buffer(this._stream.read(bytes));
      var enc = this.opts.encoding;
      return (enc) ? data.toString(enc) : data;
    },
    readAll: function() {
      var data = this._stream.read();
      this._stream.close();
      data = new Buffer(data);
      var enc = this.opts.encoding;
      return (enc) ? data.toString(enc) : data;
    },
    size: function() {
      return this._bytesTotal;
    },
    read: function() {
      while (this._bytesRead < this._bytesTotal) {
        this.emit('data', this._readBytes(this.opts.chunkSize));
      }
      this._stream.close();
      this.emit('end');
    }
  });


  function TextReadStream(file, opts) {
    this.file = file;
    opts = this.opts = opts || {};
    opts.chunkSize = opts.chunkSize || 1024;
    var stream = this._stream = new ActiveXObject('ADODB.Stream');
    stream.open();
    stream.type = 2;
    //todo: set encoding after we loadFromFile and get the _bytesTotal
    this.setEncoding(opts.encoding);
    try {
      stream.loadFromFile(app.mappath(file));
    } catch(e) {
      if (e.message.match(/could not be opened/i)) {
        throw util.extend(new Error(eNoEnt(file)), {code: 'ENOENT'});
      }
      throw e;
    }
  }
  app.eventify(TextReadStream.prototype);

  util.extend(TextReadStream.prototype, {
    setEncoding: function(enc) {
      this.opts.encoding = enc || 'utf8';
      this._stream.charset = parseEnc(this.opts.encoding);
    },
    readAll: function() {
      var text = this._stream.readText();
      this._stream.close();
      return text;
    },
    size: function() {
      //todo: this includes a BOM that may not actually exist
      return this._stream.size;
    },
    read: function() {
      var text;
      while (text = this._stream.readText(this.opts.chunkSize)) {
        this.emit('data', text);
      }
      this._stream.close();
      this.emit('end');
    }
  });


  function FileWriteStream(file, opts) {
    this.file = file;
    opts = this.opts = opts || {};
    opts.encoding = opts.encoding || 'utf8';
    var mode = (opts.append) ? 8 : 2;
    try {
      this._stream = FSO.openTextFile(app.mappath(file), mode, -1, 0);
    } catch(e) {
      //todo: e.message.match(/Permission denied/)
      throw new Error('Unable to open file: ' + file + '\n' + e.message);
    }
  }

  util.extend(FileWriteStream.prototype, {
    setEncoding: function(enc) {
      this.opts.encoding = enc;
    },
    write: function(data, enc) {
      if (this._finished) return;
      var bin = (Buffer.isBuffer(data)) ? data : new Buffer(data, enc || this.opts.encoding);
      this._stream.write(encodeRaw(bin.toString('binary')));
    },
    end: function() {
      if (this._finished) return;
      this._finished = true;
      this._stream.close();
    }
  });



  //todo: check isNotFound
  function getFileOrDir(path) {
    path = app.mappath(path);
    try {
      return FSO.getFolder(path);
    } catch(e) {
      try {
        return FSO.getFile(path);
      } catch(e) {
        throw util.extend(new Error(eNoEnt(path)), {code: 'ENOENT'});
      }
    }
  }

  function isDirectory(path) {
    path = app.mappath(path);
    try {
      var fso = FSO.getFolder(path);
    } catch(e) {}
    return (fso) ? true : false;
  }

  /**
   * This is essentially fs.stat but takes an fso object
   */
  function getInfo(fso, deep) {
    var info = fso2Info(fso);
    if (deep && info.type === 'directory') {
      var children = getChildren(fso);
      info.children = children.map(function(child) {
        var childInfo = getInfo(child, deep);
        info.size += childInfo.size;
        return childInfo;
      });
    }
    return info;
  }

  //Create an info object from an FSO object
  function fso2Info(fso) {
    var isDirectory = (String(fso.type).toLowerCase() === 'file folder');
    return {
      name: fso.name,
      dateCreated: new Date(fso.dateCreated),
      dateLastAccessed: new Date(fso.dateLastAccessed),
      dateLastModified: new Date(fso.dateLastModified),
      type: isDirectory ? 'directory' : 'file',
      size: isDirectory ? 0 : fso.size
    };
  }

  function walkDeep(fso, fn, prefix) {
    var info = fso2Info(fso);
    if (info.type == 'directory') {
      var children = getChildren(fso);
      children.forEach(function(child) {
        walkDeep(child, fn, prefix + info.name + '/');
      });
    }
    fn(info, prefix);
  }

  //Get children of a file-system object, folders first.
  function getChildren(fso) {
    var children = [];
    enumerate(fso.subFolders, function(i, folder) {
      children.push(folder);
    });
    enumerate(fso.files, function(i, file) {
      children.push(file);
    });
    return children;
  }


  //Replace certain extended characters with their Win1252 unicode equivalents
  function encodeRaw(raw) {
    //encode win1252 chars to multi-byte equivalents
    return raw.replace(EXTENDED, to1252);
  }

  function to1252(ch) {
    var code = ch.charCodeAt(0).toString(16);
    return (code in WIN1252) ? WIN1252[code] : ch;
  }

  function parseEnc(enc) {
    enc = String(enc).toLowerCase().replace('-', '');
    if (enc in {utf16: 1, utf16be: 1, unicode: 1}) {
      enc = 'UTF-16BE';
    } else
    if (enc == 'utf16le') {
      enc = 'UTF-16BE';
    } else
    if (enc.match(/ascii|ansi|1252|iso8859/)) {
      enc = 'Windows-1252';
    } else {
      enc = 'UTF-8';
    }
    return enc;
  }

  function enumerate(col, fn) {
    var i = 0;
    for (var e = new Enumerator(col); !e.atEnd(); e.moveNext()) {
      if (fn.call(col, i++, e.item()) === false) break;
    }
  }

  function isNotFound(e) {
    if (e && typeof e.message == 'string') {
      return !!e.message.match(/File not found|Path not found|could not be opened/);
    }
    return false;
  }

  function eNoEnt(path) {
    return "ENOENT, no such file or directory '" + path + "'";
  }

});