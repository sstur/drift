var DChambers = {}, WebReflection = {};

(function(exports) {

  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('')
    , index = {}
    , max = Math.max
    , re = /=+$/
    , len = chars.length
    , fromCharCode = String.fromCharCode;

  //populate index
  while (len--) index[chars[len]] = len;

  // decoder
  exports.atob = function atob(string) {
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
  };

  // encoder
  exports.btoa = function btoa(string) {
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
    , len = chars.length
    , fromCharCode = String.fromCharCode;

  //populate index
  while (len--) index[chars[len]] = len;

  // decoder
  exports.atob = function atob(string) {
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
  };

  // encoder
  exports.btoa = function btoa(string) {
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
  };

})(WebReflection);


//more tests at: https://github.com/davidchambers/Base64.js/blob/master/spec/base64_spec.coffee

//decode tests
function test_decode(atob) {
  var test = {
      "Zg==": "f"
      ,"Zm8=": "fo"
      ,"Zm9v": "foo"
      ,"Zm9vYg==": "foob"
      ,"Zm9vYmE=": "fooba"
      ,"Zm9vYmFy": "foobar"
      ,"MTQwYnl0ZX\n   MgcnVsZXMh": "140bytes rules!"
    }
    , errors = [];
  for (var n in test) {
    var r = atob(n);
    if (r != test[n]) {
      errors.push('Expected "' + test[n] + '" for "' + n + '" but got "' + r + '"');
    }
  }
  if (errors.length) {
    throw new Error(errors.length + ' tests failed!');
  } else {
    return 'All tests passed.';
  }
}

//encode tests
function test_encode(btoa){
  var test = {
      '': ''
      ,'AA==': '\0'
      ,'AAA=': '\0\0'
      ,'AAAA': '\0\0\0'
      ,'AAEC': '\0\1\2'
      ,"Zg==": "f"
      ,"Zm8=": "fo"
      ,"Zm9v": "foo"
      ,"Zm9vYg==": "foob"
      ,"Zm9vYmE=": "fooba"
      ,"Zm9vYmFy": "foobar"
    }
    , errors = [];
  for (var n in test) {
    var r = btoa(test[n]);
    if (r != n) {
      errors.push('Expected "' + n + '" for "' + test[n] + '" but got "' + r + '"');
    }
  }
  if (errors.length) {
    throw new Error(errors.length + ' tests failed!');
  } else {
    return 'All tests passed.';
  }
}

var decodeTests = [
  ['YW55IGNhcm5hbCBwbGVhc3VyZS4=', 'any carnal pleasure.'],
  ['YW55IGNhcm5hbCBwbGVhc3VyZQ==', 'any carnal pleasure'],
  ['YW55IGNhcm5hbCBwbGVhc3Vy', 'any carnal pleasur'],
  [Array(1e4).join('YW55IGNhcm5hbCBwbGVhc3Vy'), Array(1e4).join('any carnal pleasur')], // ~24 kb input
  ['YW55IGNhcm5hbCBwbGVhc3U=', 'any carnal pleasu'],
  ['YW55IGNhcm5hbCBwbGVhcw==', 'any carnal pleas'],
  ['YW55IGNhcm5hbCBwbGVhcw', 'any carnal pleas'],
  ['\uaaaa', null],
  ['YQ', 'a'],
  ['YR', 'a'],
  ['', ''],
  ['YQA=', 'a\u0000'],
  ['YW55IGNhcm5hbCBwbGVhcw==YW55IGNhcm5hbCBwbGVhc3VyZS4=', 'any carnal pleasany carnal pleasure.'],
  ['YW55IGNhcm5hbCBwbGVhcw==YW55IGNhcm5hbCBwbGVhc3VyZS4', 'any carnal pleasany carnal pleasure.']
];

var encodeTests = [
  ['any carnal pleasure.', 'YW55IGNhcm5hbCBwbGVhc3VyZS4='],
  ['any carnal pleasure', 'YW55IGNhcm5hbCBwbGVhc3VyZQ=='],
  ['any carnal pleasur', 'YW55IGNhcm5hbCBwbGVhc3Vy'],
  [Array(1e4).join('any carnal pleasur'), Array(1e4).join('YW55IGNhcm5hbCBwbGVhc3Vy')], // ~24 kb output
  ['any carnal pleasu', 'YW55IGNhcm5hbCBwbGVhc3U='],
  ['any carnal pleas', 'YW55IGNhcm5hbCBwbGVhcw=='],
  ['a', 'YQ=='],
  ['', ''],
  ['\uaaaa', null],
  ['a\u0000', 'YQA=']
];
