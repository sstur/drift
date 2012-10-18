/*global app, define, Buffer */
define('util', function(require, util) {
  "use strict";

  var inspector = require('inspector');

  var slice = Array.prototype.slice;

  util.inspect = inspector.inspect;

  util.extend = function() {
    var args = Array.toArray(arguments), dest = args.shift();
    args.forEach(function(src) {
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