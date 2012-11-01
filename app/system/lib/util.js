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


  //strip a filename to be safe in Content-Disposition header
  // according to rfc5987 extended chars can be encoded using:
  // "filename*=UTF-8''" + encodeURIComponent(filename)
  // but support is not consistent
  util.stripFilename = function(filename, ch) {
    ch = ch || '';
    var safe = String(filename);
    //control characters
    safe = safe.replace(/[\x00-\x1F]/g, ch);
    //these are generally unsafe at the OS level
    safe = safe.replace(/[\\\/:*?<>|&]/g, ch);
    //these have special meaning in headers
    safe = safe.replace(/[%",]/g, ch);
    //non-ascii / extended characters
    safe = safe.replace(/[\u007E-\uFFFF]/g, ch);
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


});