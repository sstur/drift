var DChambers = {}, WebReflection = {};

// fabricate a suitable error object
var INVALID_CHARACTER_ERR = (function() { try { document.createElement('$') } catch (e) { return e } })();

(function(exports) {

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    , max = Math.max
    , re = /=+$/
    , fromCharCode = String.fromCharCode;

  // decoder
  exports.atob = function atob(string) {
    string = string.replace(re, '');
    var a, b, b1, b2, b3, b4, c, i = 0, len = string.length, result = [];
    if (len % 4 === 1) throw new Error('Invalid Character');
    while (i < len) {
      b1 = chars.indexOf(string.charAt(i++));
      b2 = chars.indexOf(string.charAt(i++));
      b3 = chars.indexOf(string.charAt(i++));
      b4 = chars.indexOf(string.charAt(i++));
      a = ((b1 & 0x3F) << 2) | ((b2 >> 4) & 0x3);
      b = ((b2 & 0xF) << 4) | ((b3 >> 2) & 0xF);
      c = ((b3 & 0x3) << 6) | (b4 & 0x3F);
      result.push(fromCharCode(a));
      b && result.push(fromCharCode(b));
      c && result.push(fromCharCode(c));
    }
    return result.join('');
  };

  // encoder
  exports.btoa = function btoa(string) {
    var a, b, b1, b2, b3, b4, c, i = 0, len = string.length, result = [];
    while (i < len) {
      a = string.charCodeAt(i++) || 0;
      b = string.charCodeAt(i++) || 0;
      c = string.charCodeAt(i++) || 0;
      if (max(a, b, c) > 0xFF) {
        throw new Error('Invalid Character');
      }
      b1 = (a >> 2) & 0x3F;
      b2 = ((a & 0x3) << 4) | ((b >> 4) & 0xF);
      b3 = ((b & 0xF) << 2) | ((c >> 6) & 0x3);
      b4 = c & 0x3F;
      if (!b) {
        b3 = b4 = 64;
      } else if (!c) {
        b4 = 64;
      }
      result.push(chars.charAt(b1) + chars.charAt(b2) + chars.charAt(b3) + chars.charAt(b4));
    }
    return result.join('');
  };

})(DChambers);

(function(exports) {

  // (C) WebReflection - Mit Style License
  // optimized version of the "official shim" by David Chambers
  // https://bitbucket.org/davidchambers/base64.js/src

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('')
    , index = {}
    , max = Math.max
    , re = /=+$/
    , len = chars.length;

  while (len--) index[chars[len]] = len;

  // fromCharCode optimization
  var _fromCharCode = String.fromCharCode
  var MAX_LENGTH = 0xFFFF; //max array length to use for fn.apply
  function fromCharCode(code) {
    var result = [], length = code.length;
    for (var i = 0; i < length; i += MAX_LENGTH) {
      result.push(_fromCharCode.apply(null, code.slice(i, i + MAX_LENGTH)));
    }
    return result.join('');
  }

  // decoder
  exports.atob = function atob(string) {
    if (string.length % 4) throw new Error('Invalid Character');
    string = string.replace(re, '').split('');
    var a, b, b1, b2, b3, b4, c, i = 0, j = 0, result = [];
    len = string.length;
    while (i < len) {
      b1 = index[string[i++]];
      b2 = index[string[i++]];
      b3 = index[string[i++]];
      b4 = index[string[i++]];
      a = ((b1 & 0x3F) << 2) | ((b2 >> 4) & 0x3);
      b = ((b2 & 0xF) << 4) | ((b3 >> 2) & 0xF);
      c = ((b3 & 0x3) << 6) | (b4 & 0x3F);
      result[j++] = a;
      b && (result[j++] = b);
      c && (result[j++] = c);
    }
    return fromCharCode(result);
  };

  // encoder
  exports.btoa = function btoa(string) {
    var a, b, b1, b2, b3, b4, c, i = 0, result = [];
    len = string.length;
    while (i < len) {
      a = string.charCodeAt(i++) || 0;
      b = string.charCodeAt(i++) || 0;
      c = string.charCodeAt(i++) || 0;
      if (0xFF < max(a, b, c)) throw new Error('Invalid Character');
      b1 = (a >> 2) & 0x3F;
      b2 = ((a & 0x3) << 4) | ((b >> 4) & 0xF);
      b3 = ((b & 0xF) << 2) | ((c >> 6) & 0x3);
      b4 = c & 0x3F;
      b ? (c ? 0 : b4 = 64) : (b3 = b4 = 64);
      result.push(chars[b1], chars[b2], chars[b3], chars[b4]);
    }
    return result.join('');
  };

})(WebReflection);


//var decoded = [], encoded;
//for (var i = 0; i < 0xFFFF; ++i) {
//  decoded[i] = String.fromCharCode(i % 0xFF);
//}
//decoded = decoded.join('');
//encoded = (window.btoa || WebReflection.btoa)(decoded);
