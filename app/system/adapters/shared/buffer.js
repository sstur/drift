/*global app, define, _require */
/*jshint -W084 */
define('buffer', function(require, exports) {
  "use strict";

  var C_Buffer = (typeof _require != 'undefined') && _require('binary').Buffer;

  var SHOW_MAX = 51;

  //patch for platforms supporting CommonJS Binary/F
  if (C_Buffer) {
    C_Buffer.prototype.toRaw = function() {
      var len = this.length, arr = new Array(len);
      for (var i = 0; i < len; i++) {
        arr[i] = String.fromCharCode(this[i]);
      }
      return arr.join('');
    };
    C_Buffer.fromRaw = function(str) {
      var len = str.length, b = new C_Buffer(len);
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
    if (C_Buffer && (subject instanceof C_Buffer)) {
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
      throw new Error('Invalid parameters to construct Buffer');
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

  Object.assign(Buffer.prototype, {
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
      this._raw = ((start === 0) ? '' : s.slice(0, start)) + data + s.slice(start + len + 1);
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
      return (C_Buffer) ? C_Buffer.fromRaw(this._raw) : rawToAdo(this._raw);
    },
    toJSON: function() {
      return '<Buffer ' + rawToHex(this._raw) + '>';
    },
    inspect: function() {
      if (this.length > SHOW_MAX) {
        return '<Buffer ' + rawToHex(this.slice(0, SHOW_MAX)._raw) + '...>';
      } else {
        return '<Buffer ' + rawToHex(this._raw) + '>';
      }
    },
    clone: function() {
      return new Buffer(this._raw, 'binary');
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
  // based on browser shim: github.com/davidchambers/Base64.js
  // see jsperf.com/base64-optimized

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  // Base64 encoder
  // [https://gist.github.com/999166] by [https://github.com/nignag]
  function btoa(input) {
    for (
      // initialize result and counter
        var block, charCode, idx = 0, map = chars, output = '';
      // if the next input index does not exist:
      //   change the mapping table to "="
      //   check if d has no fractional digits
        input.charAt(idx | 0) || (map = '=', idx % 1);
      // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
        output += map.charAt(63 & block >> 8 - idx % 1 * 8)
        ) {
      charCode = input.charCodeAt(idx += 3 / 4);
      if (charCode > 0xFF) {
        throw new Error('Invalid Character');
      }
      block = block << 8 | charCode;
    }
    return output;
  }

  // Base64 decoder
  // [https://gist.github.com/1020396] by [https://github.com/atk]
  function atob(input) {
    input = input.replace(/=+$/, '');
    if (input.length % 4 == 1) {
      throw new Error('Invalid Base64 String');
    }
    for (
      // initialize result and counters
        var bc = 0, bs, buffer, idx = 0, output = '';
      // get next character
        buffer = input.charAt(idx++);
      // character found in table? initialize bit storage and add its ascii value;
        ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
          // and if not first of each 4 characters,
          // convert the first 8 bits to one ascii character
            bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
        ) {
      // try to find character in table (0-63, not found => -1)
      buffer = chars.indexOf(buffer);
    }
    return output;
  }

  exports.Buffer = Buffer;

});