/*!
 * Global Functions and Variables
 *   platforms not suporting ECMAScript 5 need ES5 shim loaded before this
 *
 * todo: htmlEnc/htmlDec; Date library; deprecate isSet
 * todo: make list of removed functions for importing libraries
 */

var forEach, vartype, isPrimitive, isSet, toArray;

(function() {
  "use strict";

  /**
   * Shorthand to iterate an array or object
   *   similar to jQuery.each()
   */
  forEach = function(obj, fn, context) {
    if (arguments.length == 3) {
      fn = fn.bind(context);
    }
    if (Array.isArray(obj)) {
      return Array.prototype.each.call(obj, fn);
    } else {
      return Object.each(obj, fn);
    }
  };

  //Append properties from one or more objects into the first (overwriting)
  Object.append = function() {
    var args = Array.toArray(arguments), ret = args.shift();
    for (var i = 0; i < args.length; i++) {
      var obj = args[i];
      for (var n in obj) {
        ret[n] = obj[n];
      }
    }
    return ret;
  };

  //Extend an object so it "inherits" from parent but contains the given properties as its own
  //todo: deprecate and make alias of Object.append
  Object.extend = function(parent, ext) {
    var obj = Object.create(parent);
    if (typeof ext == 'function') {
      Object.append(obj, ext.call(parent, parent));
    } else {
      Object.append(obj, ext)
    }
    return obj;
  };

  Object.each = function(obj, fn) {
    var i = 0;
    for (var n in obj) {
      if (fn.call(obj, n, obj[n], (i++)) === false) break;
    }
    return obj;
  };

  Object.exists = function(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  };

  Object.isPrimitive = function(obj) {
    if (obj == null) {
      return true;
    }
    var type = typeof obj;
    return (type == 'boolean' || type == 'number' || type == 'string') ? true : false;
  };

  Object.isSet = function(obj) {
    return !(obj === null || typeof obj == 'undefined');
  };

  Object.remove = function(obj, key) {
    var type = Object.vartype(key);
    if (type == 'array') {
      for (var i = 0; i < key.length; i++)
        Object.remove(obj, key[i]);
    } else
    if (type == 'string' && Object.exists(obj, key)) {
      delete obj[key];
    }
    return obj;
  };

  Object.values = function(obj) {
    var arr = [];
    for (var n in obj) {
      arr.push(obj[n]);
    }
    return arr;
  };

  Object.vartype = function(obj, /**String|Array=*/ list) {
    if (list) {
      list = (Array.isArray(list)) ? list : String(list).w();
      return list.exists(Object.vartype(obj));
    }
    var type = (obj === null) ? 'null' : typeof obj;
    if (obj && obj.hasOwnProperty) {
      return Object.prototype.toString.call(obj).slice(8, -1).toLowerCase();
    }
    return (type == 'object') ? 'unknown' : type;
  };

  Array.prototype.each = function(fn) {
    var arr = this, len = arr.length;
    for (var i = 0; i < len; i++) {
      if (fn.call(arr, i, arr[i]) === false) break;
    }
    return arr;
  };

  Array.prototype.exists = function(el) {
    return (this.indexOf(el) >= 0);
  };

  Array.toArray = function(obj) {
    var len = obj.length, arr = new Array(len);
    for (var i = 0; i < len; i++) {
      arr[i] = obj[i];
    }
    return arr;
  };

  Function.noop = function() {};

  Number.parse = function(str, /**Number=0*/ def) {
    var i = parseFloat(str);
    def = (arguments.length > 1) ? def : 0;
    return isFinite(i) ? i : def;
  };

  Number.parseInt = function(str, /**Number=0*/ def) {
    var i = parseInt(str, 10);
    def = (arguments.length > 1) ? def : 0;
    return isFinite(i) ? i : def;
  };

  Number.random = function(lower, upper) {
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  };

  String.prototype.replaceAll = function(a, b) {
    if (arguments.length == 1) {
      var self = this;
      Object.each(a, function() {
        self = String.prototype.replaceAll.apply(self, arguments);
      });
      return self;
    }
    return String.prototype.replace.call(this, new RegExp(RegExp.escape(a), 'ig'), b);
  };

  String.prototype.trimLeft = function() {
    return String.prototype.replace.call(this, /^\s*/, '');
  };

  String.prototype.trimRight = function() {
    return String.prototype.replace.call(this, /\s*$/, '');
  };

  String.prototype.padLeft = function(num, str) {
    var r = String(this), len = r.length;
    return (len < num) ? new Array(num - len + 1).join(str) + r : r;
  };

  String.prototype.padRight = function(num, str) {
    var r = String(this), len = r.length;
    return (len < num) ? r + new Array(num - len + 1).join(str) : r;
  };

  String.prototype.startsWith = function(str) {
    var self = this, re = new RegExp('^' + RegExp.escape(str), 'i');
    return !!String(self).match(re);
  };

  String.prototype.endsWith = function(str) {
    var self = this, re = new RegExp(RegExp.escape(str) + '$', 'i');
    return !!String(self).match(re);
  };

  String.prototype.replaceHead = function(a, b) {
    var self = this, re = new RegExp('^' + RegExp.escape(a), 'i');
    return String(self).replace(re, b);
  };

  String.prototype.replaceTail = function(a, b) {
    var self = this, re = new RegExp(RegExp.escape(a) + '$', 'i');
    return String(self).replace(re, b);
  };

  String.prototype.words = function() {
    return String.prototype.split.call(this, /[,\s]+/);
  };
  String.prototype.w = String.prototype.words;

  String.parse = function(str, /**String=''*/ def) {
    def = (arguments.length > 1) ? def : '';
    return (str == null) ? def : String(str);
  };

  String.repeat = function(str, count) {
    return new Array(count + 1).join(str);
  };

  Date.prototype.toGMTString = function() {
    var a = Date.prototype.toUTCString.call(this).split(' ');
    if (a[1].length == 1) a[1] = '0' + a[1];
    return a.join(' ').replace(/UTC$/i, 'GMT');
  };

  Date.prototype.add = function(parts) {
    var date = this;
    if (parts.years) {
      date.setYear(date.getFullYear() + Number.parseInt(parts.years));
    }
    if (parts.months) {
      date.setMonth(date.getMonth() + Number.parseInt(parts.months));
    }
    if (parts.days) {
      date.setDate(date.getDate() + Number.parseInt(parts.days));
    }
    if (parts.hours) {
      date.setHours(date.getHours() + Number.parseInt(parts.hours));
    }
    if (parts.minutes) {
      date.setMinutes(date.getMinutes() + Number.parseInt(parts.minutes));
    }
    if (parts.seconds) {
      date.setSeconds(date.getSeconds() + Number.parseInt(parts.seconds));
    }
    return date;
  };

  Date.today = function() {
    var date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  RegExp.escape = function(str) {
    return String(str).replace(/([.?*+^$[\]\\(){}-])/g, '\\$1');
  };

  RegExp.copyAsGlobal = function(reg) {
    var m = 'g' + ((reg.ignoreCase) ? 'i' : '') + ((reg.multiline) ? 'm' : '');
    return new RegExp(reg.source, m);
  };

  //Shorthand Globals
  vartype = Object.vartype;
  isPrimitive = Object.isPrimitive;
  isSet = Object.isSet;
  toArray = Array.toArray;

  //explicit globals for commonjs platforms
  if (!global.vartype) {
    global.vartype = vartype;
    global.isPrimitive = isPrimitive;
    global.isSet = isSet;
    global.toArray = toArray;
  }

})();