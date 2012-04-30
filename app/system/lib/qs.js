define('qs', ['module'], function(module) {
  "use strict";

  var SEP = /[&\?]/;
  var CHARS = /[^\w!$'()*,-.\/:;@[\\\]^{|}~]+/g;
  var hasOwnProperty = Object.prototype.hasOwnProperty;

  var qs = module.exports = {
    escape: function(s) {
      return String(s).replace(CHARS, function(s) {
        return encodeURIComponent(s);
      });
    },
    unescape: function(s) {
      s = String(s).replace(/\+/g, ' ');
      try {
        return decodeURIComponent(s);
      } catch(e) {
        return unescape(s);
      }
    },
    stringify: function() {

    },
    parse: function(str, opts) {
      opts = opts || {};
      var obj = {};
      if (str) {
        var split = str.split(SEP);
        for (var i = 0, len = split.length; i < len; i++) {
          var part = split[i], pos = part.indexOf('=');
          if (pos < 0) {
            pos = part.length;
          }
          var key = part.slice(0, pos), val = part.slice(pos + 1);
          if (!key) continue;
          key = qs.unescape(key);
          if (opts.lcase) {
            //lowercase keys
            key = key.toLowerCase();
          }
          if (obj[key]) {
            obj[key].push(qs.unescape(val));
          } else {
            obj[key] = [qs.unescape(val)];
          }
        }
      }
      //flatten defaults to true (duplicates have their values concatenated with ,)
      if (opts.flatten !== false) {
        for (key in obj) {
          obj[key] = obj[key].join();
        }
      }
      return obj;
    }
  };

  //aliases
  qs.encode = qs.escape;
  qs.decode = qs.unescape;

});