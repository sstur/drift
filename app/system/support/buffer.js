define('buffer', function(require, exports) {
  "use strict";

  var RE_NON_ASCII = /[\x80-\xFF]+/g;

  //todo: offset, inspect, base64
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
    if (type == 'unknown') {
      //ado binary
      this._raw = adoToRaw(subject);
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

  Buffer.prototype = {
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
      }
      return s;
    },
    toADO: function() {
      return rawToAdo(this._raw);
    },
    toJSON: function() {
      return '<Buffer ' + rawToHex(this._raw) + '>';
    }
  };

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


  exports.Buffer = Buffer;

});