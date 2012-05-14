var Fiber = require('fiber').Fiber;
var _super = require('../async/http');
define('http', function(require, exports, module) {
  "use strict";

  module.exports = Fiber.makeSync(_super);

});