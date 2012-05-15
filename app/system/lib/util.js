/*global app, define */
define('util', function(require, util) {
  "use strict";

  var Buffer = require('buffer').Buffer;
  var inspector = require('inspector');

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