/*!
 * Global Functions and Variables
 *   platforms not supporting ECMAScript 5 need ES5 shim loaded before this
 *
 * todo: Basic Date formatting
 * todo: remove global.isPrimitive, Array.prototype.exists, String.parse, Date.today
 */
/* eslint-disable one-var, no-extend-native */

var forEach, vartype, isPrimitive, toArray;

(function() {
  'use strict';

  var toString = Object.prototype.toString;
  var hasOwnProperty = Object.prototype.hasOwnProperty;

  /**
   * Iterate over an array or object
   *   similar to jQuery.each()
   *   return false will abort the loop
   */
  forEach = function(obj, fn, context) {
    var i, len, keys, key;
    if (arguments.length == 3) {
      fn = fn.bind(context);
    }
    if (Array.isArray(obj)) {
      len = obj.length;
      for (i = 0; i < len; i++) {
        if (fn.call(obj, i, obj[i], i) === false) break;
      }
      return obj;
    }
    var type = obj === null ? 'null' : typeof obj;
    if (type == 'object' || type == 'function') {
      keys = Object.keys(obj);
      len = keys.length;
      for (i = 0; i < len; i++) {
        key = keys[i];
        if (fn.call(obj, key, obj[key], i) === false) break;
      }
      return obj;
    } else {
      throw new Error('forEach called on a non-object');
    }
  };

  // eslint-disable-next-line no-unused-vars
  Object.assign = function(target, source) {
    var to = Object(target);
    var objectCount = arguments.length;
    for (var i = 1; i < objectCount; i++) {
      var from = Object(arguments[i]);
      var keys = Object.keys(from);
      for (var j = 0, len = keys.length; j < len; j++) {
        to[keys[j]] = from[keys[j]];
      }
    }
    return to;
  };

  Object.exists = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  Object.isPrimitive = function(obj) {
    return obj !== Object(obj);
  };

  Object.remove = function(obj, key) {
    var type = Object.vartype(key);
    if (type == 'array') {
      var keys = key;
      for (var i = 0, len = keys.length; i < len; i++) {
        delete obj[keys[i]];
      }
    } else if (type == 'string') {
      delete obj[key];
    }
    return obj;
  };

  Object.values = function(obj) {
    var arr = [];
    Object.keys(obj).forEach(function(key) {
      arr.push(obj[key]);
    });
    return arr;
  };

  Object.vartype = function(obj, /**String|Array=*/ list) {
    if (list) {
      list = Array.isArray(list) ? list : String(list).w();
      return list.exists(Object.vartype(obj));
    }
    var type = obj === null ? 'null' : typeof obj;
    return type == 'object'
      ? toString
          .call(obj)
          .slice(8, -1)
          .toLowerCase()
      : type;
  };

  Array.prototype.exists = function(el) {
    return this.indexOf(el) !== -1;
  };

  Array.toArray = function(obj) {
    var len = obj.length,
      arr = new Array(len);
    for (var i = 0; i < len; i++) {
      arr[i] = obj[i];
    }
    return arr;
  };

  Function.noop = function() {};

  Number.parse = function(str, /**Number=0*/ def) {
    var i = parseFloat(str);
    def = arguments.length > 1 ? def : 0;
    return isFinite(i) ? i : def;
  };

  Number.parseInt = function(str, /**Number=0*/ def) {
    var i = parseInt(str, 10);
    def = arguments.length > 1 ? def : 0;
    return isFinite(i) ? i : def;
  };

  Number.random = function(lower, upper) {
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  };

  String.prototype.replaceAll = function replaceAll(a, b) {
    if (arguments.length == 1) {
      var self = this;
      forEach(a, function() {
        self = replaceAll.apply(self, arguments); // eslint-disable-line consistent-this
      });
      return self;
    }
    return this.replace(
      new RegExp(RegExp.escape(a), 'ig'),
      b.replace(/\$/g, '$$'),
    );
  };

  String.prototype.trimLeft = function() {
    return this.replace(/^\s*/, '');
  };

  String.prototype.trimRight = function() {
    return this.replace(/\s*$/, '');
  };

  String.prototype.padLeft = function(num, str) {
    var r = String(this),
      len = r.length;
    return len < num ? new Array(num - len + 1).join(str) + r : r;
  };

  String.prototype.padRight = function(num, str) {
    var r = String(this),
      len = r.length;
    return len < num ? r + new Array(num - len + 1).join(str) : r;
  };

  String.prototype.startsWith = function(str) {
    var self = this,
      re = new RegExp('^' + RegExp.escape(str), 'i');
    return !!String(self).match(re);
  };

  String.prototype.endsWith = function(str) {
    var self = this,
      re = new RegExp(RegExp.escape(str) + '$', 'i');
    return !!String(self).match(re);
  };

  String.prototype.replaceHead = function(a, b) {
    var self = this,
      re = new RegExp('^' + RegExp.escape(a), 'i');
    return String(self).replace(re, b);
  };

  String.prototype.replaceTail = function(a, b) {
    var self = this,
      re = new RegExp(RegExp.escape(a) + '$', 'i');
    return String(self).replace(re, b);
  };

  String.prototype.words = function() {
    return this.split(/[,\s]+/);
  };
  String.prototype.w = String.prototype.words;

  String.parse = function(str, /**String=''*/ def) {
    def = arguments.length > 1 ? def : '';
    return str == null ? def : str.toString ? str.toString() : '' + str;
  };

  String.repeat = function(str, count) {
    return new Array(count + 1).join(str);
  };

  Date.prototype.toGMTString = function() {
    var a = this.toUTCString().split(' ');
    if (a[1].length == 1) a[1] = '0' + a[1];
    return a.join(' ').replace(/UTC$/i, 'GMT');
  };

  Date.prototype.add = function(parts) {
    var date = this; // eslint-disable-line consistent-this
    if (parts.years) {
      date.setYear(date.getFullYear() + Number.parseInt(parts.years)); // eslint-disable-line radix
    }
    if (parts.months) {
      date.setMonth(date.getMonth() + Number.parseInt(parts.months)); // eslint-disable-line radix
    }
    if (parts.days) {
      date.setDate(date.getDate() + Number.parseInt(parts.days)); // eslint-disable-line radix
    }
    if (parts.hours) {
      date.setHours(date.getHours() + Number.parseInt(parts.hours)); // eslint-disable-line radix
    }
    if (parts.minutes) {
      date.setMinutes(date.getMinutes() + Number.parseInt(parts.minutes)); // eslint-disable-line radix
    }
    if (parts.seconds) {
      date.setSeconds(date.getSeconds() + Number.parseInt(parts.seconds)); // eslint-disable-line radix
    }
    return date;
  };

  Date.today = function() {
    var date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  RegExp.escape = function(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  RegExp.copyAsGlobal = function(reg) {
    var flags = 'g' + (reg.ignoreCase ? 'i' : '') + (reg.multiline ? 'm' : '');
    return new RegExp(reg.source, flags);
  };

  //Shorthand
  vartype = Object.vartype;
  isPrimitive = Object.isPrimitive;
  toArray = Array.toArray;

  //export to global for CommonJS environments
  global.forEach = forEach;
  global.vartype = vartype;
  global.isPrimitive = isPrimitive;
  global.toArray = toArray;
})();
