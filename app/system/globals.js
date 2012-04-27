var global = (function() {
  return this.global = this;
})();
var app, define;
(function() {
  "use strict";

  app = global.app = function() {};
  define = global.define = function() {};

  console.log('globals loaded');
})();