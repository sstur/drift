/*global global, require, app */
var util = require('util');
app.define('inspector', function(require, exports) {

  exports.inspect = util.inspect;

});