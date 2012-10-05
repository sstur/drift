/*global app, define */
define('fs', function(require, fs) {
  "use strict";

  var util = require('util');
  var Buffer = require('buffer').Buffer;

  var fso = new ActiveXObject('Scripting.FileSystemObject');

  function FileReadStream(file, opts) {
    this.file = file;
    opts = this.opts = opts || {};
    opts.chunkSize = opts.chunkSize || 1024;
    var stream = this._stream = new ActiveXObject('ADODB.Stream');
    stream.type = 1;
    stream.open();
    stream.loadFromFile(app.mappath(file));
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
    stream.loadFromFile(app.mappath(file));
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
    this._stream = fso.openTextFile(app.mappath(file), mode, -1, 0);
  }

  util.extend(FileWriteStream.prototype, {
    setEncoding: function(enc) {
      this.opts.encoding = enc;
    },
    write: function(data, enc) {
      if (this._finished) return; //todo: throw?
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
    return (opts.encoding) ? new TextReadStream(file, opts) : new FileReadStream(file, opts);
  };

  fs.createWriteStream = function(file, opts) {
    return new FileWriteStream(file, opts);
  };


  fs.readTextFile = function(file, enc) {
    enc = parseEnc(enc);
    if (enc == 'UTF-8' || enc == 'UTF-16BE') {
      return new TextReadStream(file, {encoding: enc}).readAll();
    } else {
      var tristate = (enc == 'UTF-16LE') ? -1 : 0;
      var stream = fso.openTextFile(app.mappath(file), 1, tristate);
      var text = stream.readAll();
      stream.close();
      return text;
    }
  };

  fs.writeTextToFile = function(file, text, opts) {
    opts = opts || {};
    //default is to append
    opts.append = (opts.append !== false);
    opts.encoding = opts.encoding || 'utf8';
    var stream = fs.createWriteStream(file, opts);
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
      , path = 'data/logs/' + logfile.replace(/\.log$/, '') + '.log';
    data.forEach(function(line, i) {
      data[i] = (line instanceof Object) ? JSON.stringify(line) : String(line);
    });
    data.unshift(new Date().toUTCString());
    data.push('');
    data = data.join('\n');
    data = data.replace(/(\r\n|[\r\n])+/g, '\r\n');
    fs.writeTextToFile(path, data + '\r\n');
  };


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

});