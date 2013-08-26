/*
 CryptoJS v3.0.2
 code.google.com/p/crypto-js
 (c) 2009-2012 by Jeff Mott. All rights reserved.
 code.google.com/p/crypto-js/wiki/License
 */
/*global define, Buffer */
define('crypto', function (require, crypto) {
  //var Buffer = require('buffer').Buffer;

  /**
   * Base object for prototypal inheritance.
   */
  var Base = (function () {
    function F() {}

    return {
      /**
       * Creates a new object that inherits from this object.
       *
       * @param {Object} overrides Properties to copy into the new object.
       *
       * @return {Object} The new object.
       *
       * @static
       *
       * @example
       *
       *   var MyType = Base.extend({
       *     field: 'value',
       *
       *     method: function () {
       *     }
       *   });
       */
      extend: function (overrides) {
        // Spawn
        F.prototype = this;
        var subtype = new F();

        // Augment
        if (overrides) {
          subtype.mixIn(overrides);
        }

        // Reference supertype
        subtype.$super = this;

        return subtype;
      },

      /**
       * Extends this object and runs the init method.
       * Arguments to create() will be passed to init().
       *
       * @return {Object} The new object.
       *
       * @static
       *
       * @example
       *
       *   var instance = MyType.create();
       */
      create: function () {
        var instance = this.extend();
        instance.init.apply(instance, arguments);

        return instance;
      },

      /**
       * Initializes a newly created object.
       * Override this method to add some logic when your objects are created.
       *
       * @example
       *
       *   var MyType = Base.extend({
       *     init: function () {
       *       // ...
       *     }
       *   });
       */
      init: function () {
      },

      /**
       * Copies properties into this object.
       *
       * @param {Object} properties The properties to mix in.
       *
       * @example
       *
       *   MyType.mixIn({
       *     field: 'value'
       *   });
       */
      mixIn: function (properties) {
        for (var propertyName in properties) {
          if (properties.hasOwnProperty(propertyName)) {
            this[propertyName] = properties[propertyName];
          }
        }

        // IE won't copy toString using the loop above
        // Other non-enumerable properties are:
        //   hasOwnProperty, isPrototypeOf, propertyIsEnumerable,
        //   toLocaleString, valueOf
        if (properties.hasOwnProperty('toString')) {
          this.toString = properties.toString;
        }
      },

      /**
       * Creates a copy of this object.
       *
       * @return {Object} The clone.
       *
       * @example
       *
       *   var clone = instance.clone();
       */
      clone: function () {
        return this.$super.extend(this);
      }
    };
  })();

  /**
   * An array of 32-bit words.
   *
   * @property {Array} words The array of 32-bit words.
   * @property {number} sigBytes The number of significant bytes in this word array.
   */
  var WordArray = Base.extend({
    /**
     * Initializes a newly created word array.
     *
     * @param {Array} words (Optional) An array of 32-bit words.
     * @param {number} sigBytes (Optional) The number of significant bytes in the words.
     *
     * @example
     *
     *   var wordArray = WordArray.create();
     *   var wordArray = WordArray.create([0x00010203, 0x04050607]);
     *   var wordArray = WordArray.create([0x00010203, 0x04050607], 6);
     */
    init: function (words, sigBytes) {
      words = this.words = words || [];

      if (sigBytes != null) {
        this.sigBytes = sigBytes;
      } else {
        this.sigBytes = words.length * 4;
      }
    },

    /**
     * Converts this word array to a string.
     *
     * @param {Encoder} encoder (Optional) The encoding strategy to use. Default: Raw
     *
     * @return {string} The stringified word array.
     *
     * @example
     *
     *   var string = wordArray + '';
     *   var string = wordArray.toString();
     *   var string = wordArray.toString(Raw);
     */
    toString: function (encoder) {
      return (encoder || Raw).stringify(this);
    },

    /**
     * Concatenates a word array to this word array.
     *
     * @param {WordArray} wordArray The word array to append.
     *
     * @return {WordArray} This word array.
     *
     * @example
     *
     *   wordArray1.concat(wordArray2);
     */
    concat: function (wordArray) {
      // Shortcuts
      var thisWords = this.words;
      var thatWords = wordArray.words;
      var thisSigBytes = this.sigBytes;
      var thatSigBytes = wordArray.sigBytes;

      // Clamp excess bits
      this.clamp();

      // Concat
      if (thisSigBytes % 4) {
        // Copy one byte at a time
        for (var i = 0; i < thatSigBytes; i++) {
          var thatByte = (thatWords[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
          thisWords[(thisSigBytes + i) >>> 2] |= thatByte << (24 - ((thisSigBytes + i) % 4) * 8);
        }
      } else if (thatWords.length > 0xffff) {
        // Copy one word at a time
        for (var i = 0; i < thatSigBytes; i += 4) {
          thisWords[(thisSigBytes + i) >>> 2] = thatWords[i >>> 2];
        }
      } else {
        // Copy all words at once
        thisWords.push.apply(thisWords, thatWords);
      }
      this.sigBytes += thatSigBytes;

      // Chainable
      return this;
    },

    /**
     * Removes insignificant bits.
     *
     * @example
     *
     *   wordArray.clamp();
     */
    clamp: function () {
      // Shortcuts
      var words = this.words;
      var sigBytes = this.sigBytes;

      // Clamp
      words[sigBytes >>> 2] &= 0xffffffff << (32 - (sigBytes % 4) * 8);
      words.length = Math.ceil(sigBytes / 4);
    },

    /**
     * Creates a copy of this word array.
     *
     * @return {WordArray} The clone.
     *
     * @example
     *
     *   var clone = wordArray.clone();
     */
    clone: function () {
      var clone = Base.clone.call(this);
      clone.words = this.words.slice(0);

      return clone;
    },

    /**
     * Creates a word array filled with random bytes.
     *
     * @param {number} nBytes The number of random bytes to generate.
     *
     * @return {WordArray} The random word array.
     *
     * @static
     *
     * @example
     *
     *   var wordArray = WordArray.random(16);
     */
    random: function (nBytes) {
      var words = [];
      for (var i = 0; i < nBytes; i += 4) {
        words.push((Math.random() * 0x100000000) | 0);
      }

      return WordArray.create(words, nBytes);
    }
  });

  /**
   * Hex encoding strategy.
   */
  var Hex = {
    /**
     * Converts a word array to a hex string.
     *
     * @param {WordArray} wordArray The word array.
     *
     * @return {string} The hex string.
     *
     * @static
     *
     * @example
     *
     *   var hexString = Hex.stringify(wordArray);
     */
    stringify: function (wordArray) {
      // Shortcuts
      var words = wordArray.words;
      var sigBytes = wordArray.sigBytes;

      // Convert
      var hexChars = [];
      for (var i = 0; i < sigBytes; i++) {
        var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        hexChars.push((bite >>> 4).toString(16));
        hexChars.push((bite & 0x0f).toString(16));
      }

      return hexChars.join('');
    },

    /**
     * Converts a hex string to a word array.
     *
     * @param {string} hexStr The hex string.
     *
     * @return {WordArray} The word array.
     *
     * @static
     *
     * @example
     *
     *   var wordArray = Hex.parse(hexString);
     */
    parse: function (hexStr) {
      // Shortcut
      var hexStrLength = hexStr.length;

      // Convert
      var words = [];
      for (var i = 0; i < hexStrLength; i += 2) {
        words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << (24 - (i % 8) * 4);
      }

      return WordArray.create(words, hexStrLength / 2);
    }
  };

  /**
   * Raw encoding strategy.
   */
  var Raw = {
    /**
     * Converts a word array to a Raw string.
     *
     * @param {WordArray} wordArray The word array.
     *
     * @return {string} The Raw string.
     *
     * @static
     *
     * @example
     *
     *   var latin1String = Raw.stringify(wordArray);
     */
    stringify: function (wordArray) {
      // Shortcuts
      var words = wordArray.words;
      var sigBytes = wordArray.sigBytes;

      // Convert
      var latin1Chars = [];
      for (var i = 0; i < sigBytes; i++) {
        var bite = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        latin1Chars.push(String.fromCharCode(bite));
      }

      return latin1Chars.join('');
    },

    /**
     * Converts a Raw string to a word array.
     *
     * @param {string} latin1Str The Raw string.
     *
     * @return {WordArray} The word array.
     *
     * @static
     *
     * @example
     *
     *   var wordArray = Raw.parse(latin1String);
     */
    parse: function (latin1Str) {
      // Shortcut
      var latin1StrLength = latin1Str.length;

      // Convert
      var words = [];
      for (var i = 0; i < latin1StrLength; i++) {
        words[i >>> 2] |= (latin1Str.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
      }

      return WordArray.create(words, latin1StrLength);
    }
  };

  /**
   * Abstract buffered block algorithm template.
   * The property blockSize must be implemented in a concrete subtype.
   *
   * @property {number} _minBufferSize The number of blocks that should be kept unprocessed in the buffer. Default: 0
   */
  var BufferedBlockAlgorithm = Base.extend({
    /**
     * Resets this block algorithm's data buffer to its initial state.
     *
     * @example
     *
     *   bufferedBlockAlgorithm.reset();
     */
    reset: function () {
      // Initial values
      this._data = WordArray.create();
      this._nDataBytes = 0;
    },

    /**
     * Adds new data to this block algorithm's buffer.
     *
     * @param {WordArray|string} data The data to append. Strings are converted to a WordArray using UTF-8.
     *
     * @example
     *
     *   bufferedBlockAlgorithm._append('data');
     *   bufferedBlockAlgorithm._append(wordArray);
     */
    _append: function (data) {
      // Convert string to WordArray, else assume WordArray already
      if (typeof data == 'string') {
        data = Raw.parse(data);
      }

      // Append
      this._data.concat(data);
      this._nDataBytes += data.sigBytes;
    },

    /**
     * Processes available data blocks.
     * This method invokes _doProcessBlock(dataWords, offset), which must be implemented by a concrete subtype.
     *
     * @param {boolean} flush Whether all blocks and partial blocks should be processed.
     *
     * @return {WordArray} The data after processing.
     *
     * @example
     *
     *   var processedData = bufferedBlockAlgorithm._process();
     *   var processedData = bufferedBlockAlgorithm._process(!!'flush');
     */
    _process: function (flush) {
      // Shortcuts
      var data = this._data;
      var dataWords = data.words;
      var dataSigBytes = data.sigBytes;
      var blockSize = this.blockSize;
      var blockSizeBytes = blockSize * 4;

      // Count blocks ready
      var nBlocksReady = dataSigBytes / blockSizeBytes;
      if (flush) {
        // Round up to include partial blocks
        nBlocksReady = Math.ceil(nBlocksReady);
      } else {
        // Round down to include only full blocks,
        // less the number of blocks that must remain in the buffer
        nBlocksReady = Math.max((nBlocksReady | 0) - this._minBufferSize, 0);
      }

      // Count words ready
      var nWordsReady = nBlocksReady * blockSize;

      // Count bytes ready
      var nBytesReady = Math.min(nWordsReady * 4, dataSigBytes);

      // Process blocks
      if (nWordsReady) {
        for (var offset = 0; offset < nWordsReady; offset += blockSize) {
          // Perform concrete-algorithm logic
          this._doProcessBlock(dataWords, offset);
        }

        // Remove processed words
        var processedWords = dataWords.splice(0, nWordsReady);
        data.sigBytes -= nBytesReady;
      }

      // Return processed words
      return WordArray.create(processedWords, nBytesReady);
    },

    /**
     * Creates a copy of this object.
     *
     * @return {Object} The clone.
     *
     * @example
     *
     *   var clone = bufferedBlockAlgorithm.clone();
     */
    clone: function () {
      var clone = Base.clone.call(this);
      clone._data = this._data.clone();

      return clone;
    },

    _minBufferSize: 0
  });

  /**
   * Abstract hasher template.
   *
   * @property {number} blockSize The number of 32-bit words this hasher operates on. Default: 16 (512 bits)
   */
  var Hasher = BufferedBlockAlgorithm.extend({
    /**
     * Initializes a newly created hasher.
     *
     * @example
     *
     *   var hasher = SHA256.create();
     */
    init: function () {
      // Set initial values
      this.reset();
    },

    /**
     * Resets this hasher to its initial state.
     *
     * @example
     *
     *   hasher.reset();
     */
    reset: function () {
      // Reset data buffer
      BufferedBlockAlgorithm.reset.call(this);

      // Perform concrete-hasher logic
      this._doReset();
    },

    /**
     * Updates this hasher with a message.
     *
     * @param {WordArray|string} messageUpdate The message to append.
     *
     * @return {Hasher} This hasher.
     *
     * @example
     *
     *   hasher.update('message');
     *   hasher.update(wordArray);
     */
    update: function (messageUpdate) {
      // Append
      this._append(messageUpdate);

      // Update the hash
      this._process();

      // Chainable
      return this;
    },

    /**
     * Finalizes the hash computation.
     * Note that the finalize operation is effectively a destructive, read-once operation.
     *
     * @param {WordArray|string} messageUpdate (Optional) A final message update.
     *
     * @return {WordArray} The hash.
     *
     * @example
     *
     *   var hash = hasher.finalize();
     *   var hash = hasher.finalize('message');
     *   var hash = hasher.finalize(wordArray);
     */
    finalize: function (messageUpdate) {
      // Final message update
      if (messageUpdate) {
        this._append(messageUpdate);
      }

      // Perform concrete-hasher logic
      this._doFinalize();

      return this._hash;
    },

    /**
     * Creates a copy of this object.
     *
     * @return {Object} The clone.
     *
     * @example
     *
     *   var clone = hasher.clone();
     */
    clone: function () {
      var clone = BufferedBlockAlgorithm.clone.call(this);
      clone._hash = this._hash.clone();

      return clone;
    },

    blockSize: 512/32

  });

  /**
   * HMAC algorithm.
   */
  var HMAC = Base.extend({
    /**
     * Initializes a newly created HMAC.
     *
     * @param {Hasher} hasher The hash algorithm to use.
     * @param {WordArray|string} key The secret key.
     *
     * @example
     *
     *     var hmacHasher = HMAC.create(SHA256, key);
     */
    init: function (hasher, key) {
      // Init hasher
      hasher = this._hasher = hasher.create();

      // Convert string to WordArray, else assume WordArray already
      if (typeof key == 'string') {
        key = Raw.parse(key);
      }

      // Shortcuts
      var hasherBlockSize = hasher.blockSize;
      var hasherBlockSizeBytes = hasherBlockSize * 4;

      // Allow arbitrary length keys
      if (key.sigBytes > hasherBlockSizeBytes) {
        key = hasher.finalize(key);
      }

      // Clone key for inner and outer pads
      var oKey = this._oKey = key.clone();
      var iKey = this._iKey = key.clone();

      // Shortcuts
      var oKeyWords = oKey.words;
      var iKeyWords = iKey.words;

      // XOR keys with pad constants
      for (var i = 0; i < hasherBlockSize; i++) {
        oKeyWords[i] ^= 0x5c5c5c5c;
        iKeyWords[i] ^= 0x36363636;
      }
      oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;

      // Set initial values
      this.reset();
    },

    /**
     * Resets this HMAC to its initial state.
     *
     * @example
     *
     *     hmacHasher.reset();
     */
    reset: function () {
      // Shortcut
      var hasher = this._hasher;

      // Reset
      hasher.reset();
      hasher.update(this._iKey);
    },

    /**
     * Updates this HMAC with a message.
     *
     * @param {WordArray|string} messageUpdate The message to append.
     *
     * @return {HMAC} This HMAC instance.
     *
     * @example
     *
     *     hmacHasher.update('message');
     *     hmacHasher.update(wordArray);
     */
    update: function (messageUpdate) {
      this._hasher.update(messageUpdate);

      // Chainable
      return this;
    },

    /**
     * Finalizes the HMAC computation.
     * Note that the finalize operation is effectively a destructive, read-once operation.
     *
     * @param {WordArray|string} messageUpdate (Optional) A final message update.
     *
     * @return {WordArray} The HMAC.
     *
     * @example
     *
     *     var hmac = hmacHasher.finalize();
     *     var hmac = hmacHasher.finalize('message');
     *     var hmac = hmacHasher.finalize(wordArray);
     */
    finalize: function (messageUpdate) {
      // Shortcut
      var hasher = this._hasher;

      // Compute HMAC
      var innerHash = hasher.finalize(messageUpdate);
      hasher.reset();
      var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));

      return hmac;
    }
  });


  /**
   * SHA256 algorithm.
   */
  var SHA256;
  (function() {
    // Initialization and round constants tables
    var H = [];
    var K = [];

    // Compute constants
    (function () {
      function isPrime(n) {
        var sqrtN = Math.sqrt(n);
        for (var factor = 2; factor <= sqrtN; factor++) {
          if (!(n % factor)) {
            return false;
          }
        }

        return true;
      }

      function getFractionalBits(n) {
        return ((n - (n | 0)) * 0x100000000) | 0;
      }

      var n = 2;
      var nPrime = 0;
      while (nPrime < 64) {
        if (isPrime(n)) {
          if (nPrime < 8) {
            H[nPrime] = getFractionalBits(Math.pow(n, 1 / 2));
          }
          K[nPrime] = getFractionalBits(Math.pow(n, 1 / 3));

          nPrime++;
        }

        n++;
      }
    })();

    // Reusable object
    var W = [];

    /**
     * SHA-256 hash algorithm.
     */
    SHA256 = crypto.Hash_SHA256 = Hasher.extend({
      _doReset: function () {
        this._hash = WordArray.create(H.slice(0));
      },

      _doProcessBlock: function (M, offset) {
        // Shortcut
        var H = this._hash.words;

        // Working variables
        var a = H[0];
        var b = H[1];
        var c = H[2];
        var d = H[3];
        var e = H[4];
        var f = H[5];
        var g = H[6];
        var h = H[7];

        // Computation
        for (var i = 0; i < 64; i++) {
          if (i < 16) {
            W[i] = M[offset + i] | 0;
          } else {
            var gamma0x = W[i - 15];
            var gamma0  = ((gamma0x << 25) | (gamma0x >>> 7))  ^
                ((gamma0x << 14) | (gamma0x >>> 18)) ^
                (gamma0x >>> 3);

            var gamma1x = W[i - 2];
            var gamma1  = ((gamma1x << 15) | (gamma1x >>> 17)) ^
                ((gamma1x << 13) | (gamma1x >>> 19)) ^
                (gamma1x >>> 10);

            W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
          }

          var ch  = (e & f) ^ (~e & g);
          var maj = (a & b) ^ (a & c) ^ (b & c);

          var sigma0 = ((a << 30) | (a >>> 2)) ^ ((a << 19) | (a >>> 13)) ^ ((a << 10) | (a >>> 22));
          var sigma1 = ((e << 26) | (e >>> 6)) ^ ((e << 21) | (e >>> 11)) ^ ((e << 7)  | (e >>> 25));

          var t1 = h + sigma1 + ch + K[i] + W[i];
          var t2 = sigma0 + maj;

          h = g;
          g = f;
          f = e;
          e = (d + t1) | 0;
          d = c;
          c = b;
          b = a;
          a = (t1 + t2) | 0;
        }

        // Intermediate hash value
        H[0] = (H[0] + a) | 0;
        H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0;
        H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0;
        H[5] = (H[5] + f) | 0;
        H[6] = (H[6] + g) | 0;
        H[7] = (H[7] + h) | 0;
      },

      _doFinalize: function () {
        // Shortcuts
        var data = this._data;
        var dataWords = data.words;

        var nBitsTotal = this._nDataBytes * 8;
        var nBitsLeft = data.sigBytes * 8;

        // Add padding
        dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
        dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 15] = nBitsTotal;
        data.sigBytes = dataWords.length * 4;

        // Hash final blocks
        this._process();
      }
    });

  })();


  /**
   * MD5 algorithm.
   */
  var MD5;
  (function() {
    // Constants table
    var T = [];

    // Compute constants
    (function () {
      for (var i = 0; i < 64; i++) {
        T[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) | 0;
      }
    })();

    /**
     * MD5 hash algorithm.
     */
    MD5 = crypto.Hash_MD5 = Hasher.extend({
      _doReset: function () {
        this._hash = WordArray.create([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]);
      },

      _doProcessBlock: function (M, offset) {
        // Swap endian
        for (var i = 0; i < 16; i++) {
          // Shortcuts
          var offset_i = offset + i;
          var M_offset_i = M[offset_i];

          // Swap
          M[offset_i] = (
              (((M_offset_i << 8)  | (M_offset_i >>> 24)) & 0x00ff00ff) |
                  (((M_offset_i << 24) | (M_offset_i >>> 8))  & 0xff00ff00)
              );
        }

        // Shortcut
        var H = this._hash.words;

        // Working variables
        var a = H[0];
        var b = H[1];
        var c = H[2];
        var d = H[3];

        // Computation
        for (var i = 0; i < 64; i += 4) {
          if (i < 16) {
            a = FF(a, b, c, d, M[offset + i],     7,  T[i]);
            d = FF(d, a, b, c, M[offset + i + 1], 12, T[i + 1]);
            c = FF(c, d, a, b, M[offset + i + 2], 17, T[i + 2]);
            b = FF(b, c, d, a, M[offset + i + 3], 22, T[i + 3]);
          } else if (i < 32) {
            a = GG(a, b, c, d, M[offset + ((i + 1) % 16)],  5,  T[i]);
            d = GG(d, a, b, c, M[offset + ((i + 6) % 16)],  9,  T[i + 1]);
            c = GG(c, d, a, b, M[offset + ((i + 11) % 16)], 14, T[i + 2]);
            b = GG(b, c, d, a, M[offset + (i % 16)],        20, T[i + 3]);
          } else if (i < 48) {
            a = HH(a, b, c, d, M[offset + ((i * 3 + 5) % 16)],  4,  T[i]);
            d = HH(d, a, b, c, M[offset + ((i * 3 + 8) % 16)],  11, T[i + 1]);
            c = HH(c, d, a, b, M[offset + ((i * 3 + 11) % 16)], 16, T[i + 2]);
            b = HH(b, c, d, a, M[offset + ((i * 3 + 14) % 16)], 23, T[i + 3]);
          } else /* if (i < 64) */ {
            a = II(a, b, c, d, M[offset + ((i * 3) % 16)],      6,  T[i]);
            d = II(d, a, b, c, M[offset + ((i * 3 + 7) % 16)],  10, T[i + 1]);
            c = II(c, d, a, b, M[offset + ((i * 3 + 14) % 16)], 15, T[i + 2]);
            b = II(b, c, d, a, M[offset + ((i * 3 + 5) % 16)],  21, T[i + 3]);
          }
        }

        // Intermediate hash value
        H[0] = (H[0] + a) | 0;
        H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0;
        H[3] = (H[3] + d) | 0;
      },

      _doFinalize: function () {
        // Shortcuts
        var data = this._data;
        var dataWords = data.words;

        var nBitsTotal = this._nDataBytes * 8;
        var nBitsLeft = data.sigBytes * 8;

        // Add padding
        dataWords[nBitsLeft >>> 5] |= 0x80 << (24 - nBitsLeft % 32);
        dataWords[(((nBitsLeft + 64) >>> 9) << 4) + 14] = (
            (((nBitsTotal << 8)  | (nBitsTotal >>> 24)) & 0x00ff00ff) |
                (((nBitsTotal << 24) | (nBitsTotal >>> 8))  & 0xff00ff00)
            );
        data.sigBytes = (dataWords.length + 1) * 4;

        // Hash final blocks
        this._process();

        // Shortcut
        var H = this._hash.words;

        // Swap endian
        for (var i = 0; i < 4; i++) {
          // Shortcut
          var H_i = H[i];

          // Swap
          H[i] = (((H_i << 8)  | (H_i >>> 24)) & 0x00ff00ff) |
              (((H_i << 24) | (H_i >>> 8))  & 0xff00ff00);
        }
      }
    });

    function FF(a, b, c, d, x, s, t) {
      var n = a + ((b & c) | (~b & d)) + x + t;
      return ((n << s) | (n >>> (32 - s))) + b;
    }

    function GG(a, b, c, d, x, s, t) {
      var n = a + ((b & d) | (c & ~d)) + x + t;
      return ((n << s) | (n >>> (32 - s))) + b;
    }

    function HH(a, b, c, d, x, s, t) {
      var n = a + (b ^ c ^ d) + x + t;
      return ((n << s) | (n >>> (32 - s))) + b;
    }

    function II(a, b, c, d, x, s, t) {
      var n = a + (c ^ (b | ~d)) + x + t;
      return ((n << s) | (n >>> (32 - s))) + b;
    }
  })();


  /**
   * createHash conforming to Node API
   */
  function Hash(hasher) {
    this._super = hasher.create();
  }

  Hash.prototype.udpate = function(data, enc) {
    data = Buffer.apply(null, arguments).toString('binary');
    this._super.udpate(data)
  };

  Hash.prototype.digest = function() {
    var wordArray = this._super.finalize();
    return new Buffer(wordArray.toString(Raw), 'binary');
  };

  crypto.createHash = function(type) {
    var hasher = crypto['Hash_' + type.toUpperCase()];
    if (!hasher) {
      throw new Error('Invalid Hashing Algorithm: ' + type);
    }
    return new Hash(hasher);
  };


  /**
   * createHmac conforming to Node API
   */
  function Hmac(hasher, key) {
    //here key is expected to be a buffer
    this._super = HMAC.create(hasher, key.toString('binary'));
  }

  Hmac.prototype.udpate = function(data, enc) {
    data = Buffer.apply(null, arguments).toString('binary');
    this._super.udpate(data)
  };

  Hmac.prototype.digest = function() {
    var wordArray = this._super.finalize();
    return new Buffer(wordArray.toString(Raw), 'binary');
  };

  crypto.createHmac = function(type, key, enc) {
    key = new Buffer(key, enc).toString('binary');
    var hasher = crypto['Hash_' + type.toUpperCase()];
    if (!hasher) {
      throw new Error('Invalid Hashing Algorithm: ' + type);
    }
    return new Hmac(hasher, key);
  };


  /**
   * .hash() and .hmac() helpers
   */
  crypto.hash = function(type, data, enc) {
    var hasher = crypto.createHash(type);
    hasher.update(data, enc);
    return hasher.digest();
  };

  crypto.hmac = function(type, data, key, enc) {
    var hasher = crypto.createHmac(type, key, enc);
    hasher.update(data, enc);
    return hasher.digest();
  };

});