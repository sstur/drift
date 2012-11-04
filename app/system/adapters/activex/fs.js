/*global app, define */
define('fs', function(require, fs) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;

  var FSO = new ActiveXObject('Scripting.FileSystemObject');

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
        throw util.extend(new Error(eNoEnt(file)), {code: 'ENOENT', errno: 34});
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
      var data = new Buffer(this._stream.read(bytes)), enc = this.opts.encoding;
      return (enc) ? data.toString(enc) : data;
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
    this.setEncoding(opts.encoding);
    try {
      stream.loadFromFile(app.mappath(file));
    } catch(e) {
      if (e.message.match(/could not be opened/i)) {
        throw util.extend(new Error(eNoEnt(file)), {code: 'ENOENT', errno: 34});
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
    this._stream = FSO.openTextFile(app.mappath(file), mode, -1, 0);
  }

  util.extend(FileWriteStream.prototype, {
    setEncoding: function(enc) {
      this.opts.encoding = enc;
    },
    write: function(data, enc) {
      if (this._finished) return;
      var bin = (Buffer.isBuffer(data)) ? data : new Buffer(data, enc || this.opts.encoding);
      this._stream.write(encodeBin(bin.toString('binary')));
    },
    end: function() {
      if (this._finished) return;
      this._finished = true;
      this._stream.close();
    }
  });


  fs.createReadStream = function(file, opts) {
    opts = opts || {};
    return (opts.encoding) ? new TextReadStream(file, opts) : new FileReadStream(file, opts);
  };

  fs.createWriteStream = function(file, opts) {
    return new FileWriteStream(file, opts);
  };


  fs.readTextFile = function(file, enc) {
    return new TextReadStream(file, {encoding: enc}).readAll();
  };

  fs.writeTextToFile = function(file, text, opts) {
    opts = opts || {};
    //default is to append
    opts.append = (opts.append !== false);
    var stream = new FileWriteStream(file, opts);
    stream.write(text);
    stream.end();
  };

  fs.log = function() {
    var logfile, args = toArray(arguments), logLevel = 1;
    if (typeof args[0] == 'number' && args[0] > 0 && +args[0] == args[0]) {
      logLevel = args.shift();
    }
    if (args.length > 1) {
      logfile = args.pop();
    }
    if (!logfile) logfile = 'default';
    var data = args
      , path = 'data/logs/' + logfile.replace(/\.log$/i, '') + '.log';
    data.forEach(function(line, i) {
      data[i] = (isPrimitive(line)) ? String(line) : util.stringify(line);
    });
    data.unshift(new Date().toUTCString());
    data.push('');
    data = data.join('\n');
    data = data.replace(/(\r\n|[\r\n])+/g, '\r\n');
    fs.writeTextToFile(path, data + '\r\n');
  };


  fs.readdir = function(path) {
    var items = [];
    var fso = (typeof path == 'string') ? getFileOrDir(path) : path;
    walkChildren(fso, function(child) {
      items.push(child.name);
    });
    return items;
  };

  /**
   * Walks a directory in a depth-first fashion calling fn for
   * each subdirectory and file and passing the "prefix" that
   * can be appended to path to get the child's path.
   */
  fs.walk = function(path, fn) {
    var fso = (typeof path == 'string') ? getFileOrDir(path) : path;
    walkChildren(fso, function walker(child, prefix) {
      var stat = statFSO(child);
      prefix = prefix || '';
      if (stat.type == 'directory') {
        walkChildren(child, walker, prefix + stat.name + '/');
      }
      fn(stat, prefix);
    });
  };

  /**
   * Produce a stat of a file-system object. If `deep` then
   * directories get a non-zero `size` property and a
   * `children` array containing deep stat of each child.
   */
  fs.stat = function(path, deep) {
    var fso = (typeof path == 'string') ? getFileOrDir(path) : path;
    var stat = statFSO(fso);
    if (deep && stat.type == 'directory') {
      stat.children = [];
      walkChildren(fso, function(child) {
        var childStat = fs.stat(child, deep);
        stat.size += childStat.size;
        stat.children.push(childStat);
      });
    }
    return stat;
  };

  /**
   * Creates a 'stat' object from a file-system object.
   */
  function statFSO(fso) {
    var stat = {};
    stat.name = fso.name;
    stat.dateCreated = new Date(fso.dateCreated);
    stat.dateLastAccessed = new Date(fso.dateLastAccessed);
    stat.dateLastModified = new Date(fso.dateLastModified);
    if (fso.type.toLowerCase() == 'file folder') {
      stat.type = 'directory';
      stat.size = 0;
    } else {
      stat.type = 'file';
      stat.size = fso.size;
    }
    return stat;
  }

  /**
   * Walk children of a file-system object, folders first,
   * calling fn on each object with any additional args
   * passed to walkChildren.
   */
  function walkChildren(fso, fn) {
    var args = toArray(arguments).slice(2);
    enumerate(fso.subFolders, function(i, item) {
      fn.apply(null, [item].concat(args));
    });
    enumerate(fso.files, function(i, item) {
      fn.apply(null, [item].concat(args));
    });
  }


  //helpers

  var WIN1252_REV = {"80":"\u20AC","82":"\u201A","83":"\u0192","84":"\u201E","85":"\u2026","86":"\u2020","87":"\u2021",
    "88":"\u02C6","89":"\u2030","8A":"\u0160","8B":"\u2039","8C":"\u0152","8E":"\u017D","91":"\u2018","92":"\u2019",
    "93":"\u201C","94":"\u201D","95":"\u2022","96":"\u2013","97":"\u2014","98":"\u02DC","99":"\u2122","9A":"\u0161",
    "9B":"\u203A","9C":"\u0153","9E":"\u017E","9F":"\u0178"};
  //var INVALID = {"81":1,"8D":1,"8F":1,"90":1,"9D":1};

  function encodeBin(text) {
    //remove all multi-byte characters
    text = text.replace(/[\u0100-\uFFFF]/g, '');
    //encode win1252 chars to multibyte equivalents
    return text.replace(/[\x80-\x9F]/g, function(ch) {
      var code = ch.charCodeAt(0).toString(16).toUpperCase();
      return (code in WIN1252_REV) ? WIN1252_REV[code] : ch;
    });
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

  function getFileOrDir(path) {
    try {
      return FSO.getFolder(app.mappath(path));
    } catch(e) {
      try {
        return FSO.getFile(app.mappath(path));
      } catch(e) {
        throw util.extend(new Error(eNoEnt(path)), {code: 'ENOENT', errno: 34});
      }
    }
  }

  function enumerate(col, fn) {
    var i = 0;
    for(var e = new Enumerator(col); !e.atEnd(); e.moveNext()) {
      if (fn.call(col, i++, e.item()) === false) break;
    }
  }

  function eNoEnt(path) {
    return "ENOENT, no such file or directory '" + path + "'";
  }

});