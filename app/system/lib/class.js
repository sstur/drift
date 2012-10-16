/*global app, define */
/**
 * Simple JavaScript Inheritance
 * By John Resig http://ejohn.org/
 * MIT Licensed.
 */
define('class', function(require, exports, module) {
  "use strict";

  var fnTest = /xyz/.test(function() {var xyz;}) ? /\b_super\b/ : /.*/;

  var F = function() {};
  var create = Object.create || function(o) { F.prototype = o; return new F(); };

  // The base Class implementation (does nothing)
  function Class() {}

  // Create a new Class that inherits from this class
  Class.extend = function extend(prop) {
    var _super = this.prototype;

    // Instantiate a base class without executing the constructor
    var prototype = create(this.prototype);

    // Copy the properties over onto the new prototype
    for (var name in prop) {
      // Check if we're overwriting an existing function
      prototype[name] = typeof prop[name] == "function" &&
        typeof _super[name] == "function" && fnTest.test(prop[name]) ?
        (function(name, fn) {
          return function() {
            var tmp = this._super;

            // Add a new ._super() method that is the same method
            // but on the super-class
            this._super = _super[name];

            // The method only need to be bound temporarily, so we
            // remove it when we're done executing
            var ret = fn.apply(this, arguments);
            this._super = tmp;

            return ret;
          };
        })(name, prop[name]) :
        prop[name];
    }

    // The dummy class constructor
    // All construction is actually done in the init method
    function Class() {
      this.init && this.init.apply(this, arguments);
    }

    //hacky: a constructor with a 'name' property makes for better debugging and stack traces
    if (typeof prop['name'] == 'string' && prop['name'].match(/^[a-z_\$][\w\$]*$/i)) {
      Class = new Function('return function ' + prop['name'] + '() { this.init && this.init.apply(this, arguments); }')();
    }

    // Populate our constructed prototype object
    Class.prototype = prototype;

    // Force the constructor to be what is generally expected
    if (Object.defineProperty)
      Object.defineProperty(prototype, 'constructor', {
        value: Class,
        enumerable: false,
        writable: true,
        configurable: true
      });
    else
      Class.prototype.constructor = Class;

    // And make this class extensible
    Class.extend = extend;

    return Class;
  };

  module.exports = Class;

});