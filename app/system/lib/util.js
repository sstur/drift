/*global app, define, Buffer */
define('util', function(require, util) {
  "use strict";

  var inspector = require('inspector');

  var slice = Array.prototype.slice;

  util.inspect = inspector.inspect;

  util.extend = function() {
    var args = Array.toArray(arguments), dest = args.shift();
    args.forEach(function(src) {
      if (!src) return;
      Object.keys(src).forEach(function(key) {
        dest[key] = src[key];
      });
    });
    return dest;
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
        dest.emit.apply(dest, [event].concat(slice.call(arguments)));
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


  //log to the filesystem: util.log([logLevel], line1, [line2..], [logfile])
  util.log = function() {
    var fs = require('fs');
    //todo: logLevel
    var logfile, args = toArray(arguments), logLevel = 1;
    if (typeof args[0] == 'number' && +args[0] == args[0] && args[0] > 0) {
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
    data.push('', ''); //add two extra line feeds at end
    data = data.join('\n');
    data = data.replace(/(\r\n|[\r\n])+/g, '\r\n');
    fs.writeTextToFile(path, data);
  };


  //parse a set of HTTP headers
  util.parseHeaders = function(raw) {
    var headers = {}, all = raw.split('\r\n');
    for (var i = 0; i < all.length; i++) {
      var header = all[i], pos = header.indexOf(':');
      if (pos < 0) continue;
      var n = header.slice(0, pos), val = header.slice(pos + 1).trim(), key = n.toLowerCase();
      headers[key] = headers[key] ? headers[key] + ', ' + val : val;
    }
    return headers;
  };

  //parse a header value (e.g. Content-Disposition) accounting for
  // various formats such as rfc5987: field*=UTF-8'en'a%20b
  util.parseHeaderValue = function(str) {
    //replace quoted strings with encoded contents
    str = String(str).replace(/"(.*?)"/g, function(_, s) {
      return encodeURIComponent(pctDec(s));
    });
    return str.split(';').reduce(function(obj, pair) {
      var split = pair.trim().split('=');
      var name = split[0], value = split[1] || '';
      if (name.slice(-1) == '*') {
        name = name.slice(0, -1);
        value = value.replace(/^[\w-]+'.*?'/, '');
      }
      if (name) obj[name] = pctDec(value);
      return obj
    }, {});
  };


  //strip a filename to be ascii-safe
  util.stripFilename = function(filename, ch, map) {
    ch = ch || '';
    var safe = String(filename);
    //optional map of pre-substitutions (e.g. " -> ')
    Object.keys(map || {}).forEach(function(ch) {
      safe = safe.split(ch).join(map[ch]);
    });
    //control characters
    safe = safe.replace(/[\x00-\x1F]/g, ch);
    //these are generally unsafe at the OS level
    safe = safe.replace(/[\\\/:*?<>|&]/g, ch);
    //these have special meaning in Content-Disposition header
    safe = safe.replace(/[%",]/g, ch);
    //non-ascii / extended characters
    safe = safe.replace(/[\u007E-\uFFFF]/g, ch);
    if (ch) {
      //replace duplicate separators
      while (~safe.indexOf(ch + ch)) {
        safe = safe.replace(ch + ch, ch);
      }
    }
    return safe;
  };


  util.htmlEnc = function(str, /**Boolean=true*/ attr) {
    str = String(str);
    str = str.replace(/&/g, '&amp;');
    str = str.replace(/>/g, '&gt;');
    str = str.replace(/</g, '&lt;');
    if (attr !== false) {
      str = str.replace(/"/g, '&quot;');
    }
    str = str.replace(/\u00a0/g, '&nbsp;');
    return str;
  };

  var REG_ENT_DEC = /&#(\d+);/g;
  var REG_ENT_HEX = /&#x((?:[\dA-F]{2}){1,2});/ig;
  var REG_ENT_OTHER = /&([a-z]+);/ig;

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



  //extended JSON.stringify to handle special cases (Error, Date, Buffer)
  util.stringify = function(obj) {
    var str = JSON.stringify(obj, replacer);
    return str.replace(REG_CHARS, encodeChars);
  };

  //extended JSON.parse to handle special cases (Error, Date, Buffer)
  //  * this is unsafe to use with untrusted JSON as it uses eval!
  util.parse = function(str) {
    return JSON.parse(str, reviver);
  };

  //we require Buffer *after* defining util methods because Buffer will require util
  var Buffer = require('buffer').Buffer;

  var REG_CHARS = /[^\x20-\x7E]/g;
  var REG_CONSTR = /^new Error\(.*\)$/;
  var REG_ISODATE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)Z$/;

  function replacer(key, val) {
    //this function runs after .toJSON()
    if (!val || typeof val != 'object') {
      return val;
    }
    var type = Object.prototype.toString.call(val).slice(8, -1);
    if (type == 'Error') {
      return 'new Error(' + JSON.stringify(val.message) + ')';
    } else {
      return val;
    }
  }

  function reviver(key, val) {
    if (typeof val == 'string') {
      var date = val.match(REG_ISODATE);
      if (date) {
        val = new Date(val) || new Date(Date.UTC(+date[1], +date[2] - 1, +date[3], +date[4], +date[5], +date[6]));
      }
      if (val.slice(0, 8) == '<Buffer ' && val.slice(-1) == '>') {
        return new Buffer(val.slice(8, -1), 'hex');
      }
      if (REG_CONSTR.test(val)) {
        return new Function('return ' + val)();
      }
    }
    return val;
  }

  function encodeChars(ch) {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  }

  //percent-decode (similar to qs.decode or urlDecode)
  function pctDec(s) {
    return s.replace(/(%[0-9a-f]{2})+/ig, function(s) {
      try {
        return decodeURIComponent(s);
      } catch(e) {
        return unescape(s);
      }
    });
  }


});