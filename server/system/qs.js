/**
 * todo: alt flatten function to rename keys a=1&a=2 => {a[0]: 1, a[1]: 2)
 */
/* eslint-disable one-var */
define('qs', function(require, exports, module) {
  'use strict';

  var CHARS = /[^\w!$'()*,-.\/:;@[\\\]^{|}~]+/g;
  var hasOwn = Object.hasOwnProperty;

  var qs = (module.exports = {
    escape: function(s) {
      return String(s).replace(CHARS, function(s) {
        return encodeURIComponent(s);
      });
    },
    unescape: function(s) {
      s = String(s).replace(/\+/g, ' ');
      try {
        return decodeURIComponent(s);
      } catch (e) {
        return unescape(s);
      }
    },
    stringify: function(obj) {
      var arr = [],
        keys = Object.keys(obj),
        len = keys.length;
      for (var i = 0; i < len; i++) {
        var key = keys[i],
          name = qs.escape(key),
          val = obj[key];
        if (Array.isArray(val)) {
          for (var j = 0; j < val.length; j++) {
            arr.push(name + '=' + qs.escape(val[j]));
          }
        } else {
          arr.push(name + '=' + qs.escape(val));
        }
      }
      return arr.join('&');
    },
    parse: function(str, opts) {
      opts = opts || {};
      var obj = {};
      if (typeof str == 'string') {
        if (str.charAt(0) == '?') str = str.slice(1);
        var split = str.split('&');
        for (var i = 0, len = split.length; i < len; i++) {
          var part = split[i],
            pos = part.indexOf('=');
          if (pos < 0) {
            pos = part.length;
          }
          var key = part.slice(0, pos),
            val = part.slice(pos + 1);
          if (!key) continue;
          key = qs.unescape(key);
          //default to lowercase keys
          if (opts.lcase !== false) {
            key = key.toLowerCase();
          }
          if (hasOwn.call(obj, key)) {
            obj[key].push(qs.unescape(val));
          } else {
            obj[key] = [qs.unescape(val)];
          }
        }
      }
      //flatten defaults to true (duplicates have their values concatenated with ', ')
      if (opts.flatten !== false) {
        qs.flatten(obj);
      }
      return obj;
    },
    flatten: function(obj) {
      var keys = Object.keys(obj);
      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        obj[key] = obj[key].join(', ');
      }
    },
  });

  //aliases
  qs.encode = qs.escape;
  qs.decode = qs.unescape;
});
