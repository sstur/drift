/*global app, define */
define('util', function(require, util) {
  "use strict";

  var Buffer = require('buffer').Buffer;
  var inspector = require('inspect');

  util.inspect = inspector.inspect;

  util.extend = function() {
    var args = Array.toArray(arguments), dest = args.shift();
    for (var i = 0; i < args.length; i++) {
      var obj = args[i];
      for (var n in obj) {
        dest[n] = obj[n];
      }
    }
    return dest;
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


  var REG_CHARS = /[^\x20-\x7E]/g;
  var REG_CONSTR = /^new (Error|Date|Buffer)\(.*\)$/;

  function replacer(key, val) {
    if (!val || typeof val != 'object') {
      return val;
    }
    var type = Object.prototype.toString.call(val).slice(8, -1);
    if (type == 'Error') {
      return 'new Error(' + JSON.stringify(val.message) + ')';
    } else
    if (type == 'Date') {
      return 'new Date(' + val.valueOf() + ')';
    } else
    if (Buffer.isBuffer(val)) {
      return 'new Buffer("' + val.toString('hex') + '","hex")';
    } else {
      return val;
    }
  }

  function reviver(key, val) {
    if (typeof val == 'string') {
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