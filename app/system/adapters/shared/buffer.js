/*global app, define, _require */
define('buffer', function(require, exports) {
  "use strict";

  var util = require('util');
  var _super = (typeof _require != 'undefined') && _require('binary').Buffer;

  //patch for platforms supporting CommonJS Binary/F
  if (_super) {
    _super.prototype.toRaw = function() {
      var len = this.length, arr = new Array(len);
      for (var i = 0; i < len; i++) {
        arr[i] = String.fromCharCode(this[i]);
      }
      return arr.join('');
    };
    _super.fromRaw = function(str) {
      var len = str.length, b = new _super(len);
      for (var i = 0; i < len; i++) {
        b[i] = str.charCodeAt(i);
      }
      return b;
    };
  }

  var RE_NON_ASCII = /[\x80-\xFF]+/g;

  //todo: offset, inspect
  function Buffer(subject, encoding, offset) {
    if (!(this instanceof Buffer)) {
      return new Buffer(subject, encoding, offset);
    }
    var type = typeof subject;
    if (type == 'number') {
      this._raw = new Array(subject + 1).join('\x00');
    } else
    if (type == 'string') {
      encoding = encoding || 'utf8';
      if (encoding == 'utf8') {
        this._raw = unescape(encodeURI(subject));
      } else
      if (encoding == 'hex') {
        this._raw = hexToRaw(subject);
      } else
      if (encoding == 'base64') {
        this._raw = atob(subject);
      } else {
        this._raw = subject;
      }
    } else
    if (Buffer.isBuffer(subject)) {
      this._raw = subject._raw;
    } else
    if (Array.isArray(subject)) {
      this._raw = arrToRaw(subject);
    } else
    if (_super && (subject instanceof _super)) {
      this._raw = subject.toRaw();
    } else
    if (type == 'unknown') {
      //ado binary
      try {
        this._raw = adoToRaw(subject);
      } catch(e) {
        //throw new Error('Cannot create Buffer; invalid input argument');
        this._raw = '';
      }
    } else {
      throw new Error('Invalid parameters to construct Buffer')
    }
    this.length = this._raw.length;
  }

  Buffer.isBuffer = function(obj) {
    return (obj instanceof Buffer);
  };

  Buffer.byteLength = function(string, encoding) {
    //todo: optimize
    return new Buffer(string, encoding).length;
  };

  util.extend(Buffer.prototype, {
    get: function(index) {
      return this._raw.charCodeAt(index);
    },
    set: function(index, byte) {
      var s = this._raw;
      this._raw = s.slice(0, index) + String.fromCharCode(byte) + s.slice(index + 1);
      return this._raw;
    },
    write: function(data, enc, start, len) {
      data = new Buffer(data, enc)._raw;
      len = data.length;
      start = +start || 0;
      if (start + len > this.length) {
        len = this.length - start;
      }
      var s = this._raw;
      this._raw = ((start == 0) ? '' : s.slice(0, start)) + data + s.slice(start + len + 1);
      return len;
    },
    slice: function(start, end) {
      return new Buffer(this._raw.slice(start, end), 'binary');
    },
    toString: function(enc, start, end) {
      var s = this._raw;
      if (arguments.length > 1) {
        s = s.slice(start, end);
      }
      enc = enc || 'utf8';
      if (enc == 'utf8') {
        return s.replace(RE_NON_ASCII, toUtf8);
      } else
      if (enc == 'hex') {
        return rawToHex(s);
      } else
      if (enc == 'base64') {
        return btoa(s);
      }
      return s;
    },
    toBin: function() {
      return (_super) ? _super.fromRaw(this._raw) : rawToAdo(this._raw);
    },
    toJSON: function() {
      return '<Buffer ' + rawToHex(this._raw) + '>';
    }
  });

  // Helper functions

  function toUtf8(s) {
    try {
      return decodeURIComponent(escape(s));
    } catch(e) {
      //invalid byte sequence
      return '';
    }
  }

  function arrToRaw(arr) {
    var len = arr.length, out = new Array(len);
    for (var i = 0; i < len; i++) {
      out[i] = String.fromCharCode(arr[i] % 256);
    }
    return out.join('');
  }

  function rawToArr(input) {
    var len = input.length, arr = new Array(len);
    for (var i = 0; i < len; i++) {
      arr[i] = input.charCodeAt(i);
    }
    return arr;
  }

  function hexToRaw(hex) {
    var out = new Array(Math.floor(hex.length / 2));
    for(var i = 0, len = out.length; i < len; i++){
      out[i] = String.fromCharCode(parseInt(hex.substr(i * 2, 2), 16));
    }
    return out.join('');
  }

  function rawToHex(input) {
    var chars = '0123456789abcdef', out = [];
    for (var i = 0, len = input.length; i < len; i++) {
      var x = input.charCodeAt(i);
      out.push(chars.charAt((x >>> 4) & 0x0F) + chars.charAt(x & 0x0F));
    }
    return out.join('');
  }

  function adoToRaw(bin) {
    var el = new ActiveXObject('Microsoft.XMLDOM').createElement('node');
    el.dataType = 'bin.hex';
    el.nodeTypedValue = bin;
    return hexToRaw(el.text);
  }

  function rawToAdo(input) {
    var el = new ActiveXObject('Microsoft.XMLDOM').createElement('node');
    el.dataType = 'bin.hex';
    el.text = rawToHex(input);
    return el.nodeTypedValue;
  }



  // base64 atob/btoa implementation
  // based on browser shim by github.com/DavidChambers
  // with optimizations from github.com/WebReflection
  // see jsperf.com/base64-optimized

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('');
  var index = {};
  var max = Math.max;
  var re = /=+$/;
  var len = chars.length;
  var fromCharCode = String.fromCharCode;

  //populate index
  while (len--) index[chars[len]] = len;

  // decoder
  function atob(string) {
    if (string.length % 4) throw new Error('Invalid Character');
    string = string.replace(re, '').split('');
    var a, b, c, b1, b2, b3, b4, i = 0, j = 0, len = string.length, result = [];
    while (i < len) {
      b1 = index[string[i++]];
      b2 = index[string[i++]];
      b3 = index[string[i++]];
      b4 = index[string[i++]];
      a = ((b1 & 0x3F) << 2) | ((b2 >> 4) & 0x3);
      b = ((b2 & 0xF) << 4) | ((b3 >> 2) & 0xF);
      c = ((b3 & 0x3) << 6) | (b4 & 0x3F);
      result[j++] = fromCharCode(a);
      b && (result[j++] = fromCharCode(b));
      c && (result[j++] = fromCharCode(c));
    }
    return result.join('');
  }

  // encoder
  function btoa(string) {
    var a, b, c, b1, b2, b3, b4, i = 0, len = string.length, result = [];
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
  }

  exports.Buffer = Buffer;

});