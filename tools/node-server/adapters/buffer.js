/*global global, require, app */
var Buffer = require('buffer').Buffer;
app.define('buffer', function(require, exports) {

  //serialize nicely to JSON
  Buffer.prototype.toJSON = function() {
    return '<Buffer ' + this.toString('hex') + '>';
  };

  //work with util.clone
  Buffer.prototype.clone = function() {
    return this.slice(0);
  };

  exports.Buffer = Buffer;
  exports.nativeImplementation = true;

});