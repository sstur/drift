/*global global, require, module, exports, app */
var _super = require('util');
app.define('inspector', function(require, exports) {
  "use strict";

  exports.inspect = _super.inspect;
  exports.isArray = _super.isArray;
  exports.isRegExp = _super.isRegExp;
  exports.isDate = _super.isDate;
  exports.isError = _super.isError;

});