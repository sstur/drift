var _super = require('buffer').Buffer;
define('buffer', function(require, exports) {
  "use strict";

  function Buffer(subject, encoding, offset) {
    var type = typeof subject, args = Array.prototype.slice.call(arguments);
    if (args.length == 1 && type == 'string' && subject.slice(0, 8) == '<Buffer ') {
      //hack: revive buffer that was flattened to '<Buffer 01ab>'
      subject = args[0] = subject.slice(8, -1);
      encoding = args[1] = 'hex';
    }
    if (!(this instanceof Buffer)) {
      return new Buffer(subject, encoding, offset);
    }
    _super.apply(this, args);
  }

  Buffer.isBuffer = function(obj) {
    return (obj instanceof Buffer);
  };

  Buffer.byteLength = function() {
    return _super.byteLength.apply(_super, arguments);
  };

  Buffer.prototype = Object.create(_super.prototype);

  Buffer.prototype.valueOf = function() {
    return '<Buffer ' + this.toString('hex') + '>';
  };

  Buffer.prototype.toJSON = function() {
    return '<Buffer ' + this.toString('hex') + '>';
  };

  exports.Buffer = Buffer;

});