/*global app, define, Buffer */
define('util', function(require, util) {
  "use strict";

  var toString = Object.prototype.toString;

  var dataPath = app.cfg('data_dir') || 'data/';
  //0: log all, 1: errors only, 2: warnings, 3: trace
  var logVerbosity = app.cfg('logging/verbosity');

  //48-bit integer max
  var INT_48 = Math.pow(2, 48);
  //regex for json helpers
  var REG_CHARS = /[\u007F-\uFFFF]/g;
  var REG_ERROR = /^new Error\((.*)\)$/;
  var REG_ISODATE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)Z$/;

  //regex for html decoding
  var REG_ENT_DEC = /&#(\d+);/g;
  var REG_ENT_HEX = /&#x((?:[\dA-F]{2}){1,2});/ig;
  var REG_ENT_OTHER = /&([a-z]+);/ig;

  //regex for decoding percent-encoded strings
  var PCT_SEQUENCE = /(%[0-9a-f]{2})+/ig;

  //type-specific clone helpers
  var CLONE = {
    'Array': function(clone) {
      return Array.prototype.map.call(this, clone);
    },
    'Date': function() {
      return new Date(this.valueOf());
    },
    'String': String.prototype.valueOf,
    'Number': Number.prototype.valueOf,
    'Boolean': Boolean.prototype.valueOf
  };

  util.inspect = function() {
    var inspector = require('inspector');
    return inspector.inspect.apply(inspector, arguments);
  };

  util.extend = Object.assign;

  //deep-copy an object, similar to calling JSON.parse(JSON.stringify(obj))
  // but preserves dates and undefined
  util.clone = function clone(obj) {
    if (isPrimitive(obj)) return obj;
    var type = toString.call(obj).slice(8, -1);
    if (type in CLONE) {
      return CLONE[type].call(obj, clone);
    }
    if (typeof obj.clone == 'function') {
      return obj.clone();
    }
    if (typeof obj.toJSON == 'function') {
      return obj.toJSON();
    }
    var copy = {};
    var keys = Object.keys(obj);
    for (var i = 0, len = keys.length; i < len; i++) {
      var key = keys[i];
      copy[key] = clone(obj[key]);
    }
    return copy;
  };

  util.inherits = function(ctor, parent) {
    ctor.super_ = parent;
    ctor.prototype = Object.create(parent.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };

  util.propagateEvents = function(src, dest, events) {
    events = (Array.isArray(events)) ? events : String(events).split(' ');
    events.forEach(function(event) {
      src.on(event, function() {
        dest.emit.apply(dest, [event].concat(Array.from(arguments)));
      });
    });
  };

  util.pipe = function(src, dest) {
    src.on('data', function(data) {
      dest.write(data);
    });
    src.on('end', function() {
      dest.end();
    });
  };

  //returns a unique hex string starting with a timestamp
  util.getUniqueHex = function(numBytes) {
    if (typeof numBytes != 'number' || !isFinite(numBytes) || numBytes < 5) {
      numBytes = 16;
    }
    var timestamp = Math.floor(Date.now() / 1000) % 0xFFFFFFFF;
    return (timestamp.toString(16) + util.hexBytes(numBytes - 4)).slice(0, numBytes * 2);
  };

  //returns random bytes as hex
  util.hexBytes = function(numBytes) {
    if (typeof numBytes != 'number' || !isFinite(numBytes) || numBytes < 1) {
      numBytes = 16;
    }
    //seed should give us the first 6 bytes
    var seed = util.getSeed();
    var hex = ('000000000000' + seed.toString(16)).slice(-12);
    var n = numBytes * 2;
    while (hex.length < n) {
      hex += Math.floor(Math.random() * 16).toString(16);
    }
    return hex.slice(0 - n);
  };

  //returns a seed which is always a number between 0 and 2^48
  util.getSeed = function() {
    var seed = app.data('seed') || Math.floor(Math.random() * INT_48);
    var newSeed = seed + Math.floor(Math.random() * (INT_48 - 1));
    app.data('seed', newSeed % INT_48);
    return seed;
  };

  //log to the filesystem: util.log([logLevel], line1, [line2..], [logfile])
  // if logLevel is specified, it will log only if logVerbosity is set at least that high
  util.log = function() {
    var args = toArray(arguments);
    var logLevel = 1;
    if (typeof args[0] == 'number' && args[0] > 0) {
      logLevel = args.shift();
    }
    if (logVerbosity && logLevel > logVerbosity) {
      return;
    }
    if (args.length > 1 && typeof args[args.length - 1] == 'string') {
      var logfile = args.pop();
    }
    logfile = logfile || 'default';
    var data = args;
    var path = dataPath + 'logs/' + logfile.replace(/\.log$/i, '') + '.log';
    data.forEach(function(line, i) {
      data[i] = (isPrimitive(line)) ? String(line) : util.stringify(line);
    });
    data.unshift(new Date().toUTCString());
    data.push('', ''); //add two extra line feeds at end
    data = data.join('\n');
    data = data.replace(/(\r\n|\r|\n)+/g, '\r\n');
    var fs = require('fs');
    fs.writeTextToFile(path, data);
  };


  //parse a set of HTTP headers
  // todo: multi-line headers
  util.parseHeaders = function(input) {
    //input = input.replace(/[ \t]*(\r\n)[ \t]+/g, ' ');
    var headers = {};
    var lines = input.split('\r\n').join('\n').split('\n');
    for (var i = 0, len = lines.length; i < len; i++) {
      var line = lines[i];
      var index = line.indexOf(':');
      //discard lines without a :
      if (index < 0) continue;
      var key = line.slice(0, index).trim().toLowerCase();
      // no empty keys
      if (!key) continue;
      var value = line.slice(index + 1).trim();
      headers[key] = headers[key] ? headers[key] + ', ' + value : value;
    }
    return headers;
  };

  //parse a header value (e.g. Content-Disposition) accounting for
  // various formats such as rfc5987: field*=UTF-8'en'a%20b
  // todo: something like: ["multipart/alternative", {"boundary": "eb663d73ae0a4d6c9153cc0aec8b7520"}]
  util.parseHeaderValue = function(str) {
    //replace quoted strings with encoded contents
    str = String(str).replace(/"(.*?)"/g, function(_, str) {
      return encodeURIComponent(str.replace(PCT_SEQUENCE, decode));
    });
    var results = {};
    str.split(';').forEach(function(pair) {
      var split = pair.trim().split('=');
      var name = split[0], value = split[1] || '';
      if (name.slice(-1) == '*') {
        name = name.slice(0, -1);
        value = value.replace(/^[\w-]+'.*?'/, '');
      }
      if (name) {
        results[name] = value.replace(PCT_SEQUENCE, decode);
      }
    });
    return results;
  };


  //strip a filename to be ascii-safe
  // used in Content-Disposition header
  // will not encode space or: !#$'()+-.;=@[]^_`{}
  util.stripFilename = function(filename, ch, map) {
    ch = ch || '';
    var safe = String(filename);
    //optional map of pre-substitutions (e.g. " -> ')
    Object.keys(map || {}).forEach(function(ch) {
      safe = safe.split(ch).join(map[ch]);
    });
    //control characters
    safe = safe.replace(/[\x00-\x1F]+/g, ch);
    //these are generally unsafe at the OS level
    safe = safe.replace(/[\\\/:*?<>|&]+/g, ch);
    //these have special meaning in Content-Disposition header
    safe = safe.replace(/[%",]+/g, ch);
    //ascii "del" and unicode characters
    safe = safe.replace(/[\u007E-\uFFFF]+/g, ch);
    if (ch) {
      //replace duplicate separators
      while (~safe.indexOf(ch + ch)) {
        safe = safe.replace(ch + ch, ch);
      }
    }
    return safe.trim();
  };


  util.htmlEnc = function(str, /**Boolean=true*/ isAttr) {
    str = String(str);
    str = str.replace(/&/g, '&amp;');
    str = str.replace(/>/g, '&gt;');
    str = str.replace(/</g, '&lt;');
    if (isAttr !== false) {
      str = str.replace(/"/g, '&quot;');
    }
    str = str.replace(/\u00a0/g, '&nbsp;');
    return str;
  };

  util.htmlDec = function(str) {
    str = String(str);
    str = str.replace(REG_ENT_DEC, function(ent, n) {
      var i = parseInt(n, 10);
      return (i < 65536) ? String.fromCharCode(i) : ent;
    });
    str = str.replace(REG_ENT_HEX, function(ent, n) {
      return String.fromCharCode(parseInt(n, 16));
    });
    //optionally specify entities in config
    var entities = app.cfg('html_entities') ||
      {amp: '&', gt: '>', lt: '<', quot: '"', apos: '\'', nbsp: '\u00a0'};
    str = str.replace(REG_ENT_OTHER, function(ent, n) {
      var c = entities[n.toLowerCase()];
      return c || ent;
    });
    return str;
  };



  //extend JSON.stringify to special case Error
  //and always encode extended characters to ascii
  util.stringify = function(obj, opts) {
    var result = JSON.stringify(obj, replacer, opts);
    //JSON.stringify(undefined) is undefined
    return String(result).replace(REG_CHARS, escapeNonAscii);
  };

  //extend JSON.parse to handle Date, Buffer and Error
  util.parse = function(str) {
    return JSON.parse(str, reviver);
  };


  /*!
   * Helpers
   */

  function replacer(key, val) {
    //this function runs after .toJSON() so Buffer instances are already stringified
    if (toString.call(val) == '[object Error]') {
      return 'new Error(' + JSON.stringify(val.message) + ')';
    }
    return val;
  }

  function reviver(key, val) {
    if (typeof val == 'string') {
      var date, error;
      if ((date = val.match(REG_ISODATE))) {
        return new Date(val) || new Date(Date.UTC(+date[1], +date[2] - 1, +date[3], +date[4], +date[5], +date[6]));
      } else
      if (val.slice(0, 8) == '<Buffer ' && val.slice(-1) == '>') {
        return new Buffer(val.slice(8, -1), 'hex');
      } else
      if ((error = val.match(REG_ERROR))) {
        return new Error(JSON.parse(error[1]));
      }
    }
    return val;
  }

  //escape control/extended/unicode characters
  function escapeNonAscii(ch) {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  }

  //decode a sequence of percent-encoded entities
  // (similar to qs.decode or urlDecode)
  function decode(str) {
    try {
      return decodeURIComponent(str);
    } catch(e) {
      return unescape(str);
    }
  }

});