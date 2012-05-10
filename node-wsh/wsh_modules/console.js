/*global app, define */
define('console', function(require, exports, module) {
  "use strict";

  var console = {
    log: function() {
      var args = toArray(arguments);
      app.messenger.send('log', args);
    }
  };

  module.exports = console;

});