/*global app, require, describe, it */
(function() {
  "use strict";

  var expect = require('expect.js');

  require('../app/system/core');

  var define = app.define;

  describe('define', function() {
    var require = app.require;

    var executed = 0;
    var fn = function(require, exports) {
      executed += 1;
      exports.a = 'b';
    };

    it('should define with correct parameters', function() {
      define('thing', function(require, exports, module) {
        expect(module).to.equal(this);
        expect(exports).to.equal(module.exports);
        expect(require).to.not.equal(require);
      });
      expect(executed).to.equal(0);
    });

    it('should define but not execute', function() {
      define('one', fn);
      expect(executed).to.equal(0);
    });

    it('should execute once at first require', function() {
      define('two', fn);
      expect(executed).to.equal(0);
      var two = require('two');
      expect(executed).to.equal(1);
      expect(two).to.eql({a: 'b'});
      two.c = 'd';
      var three = require('two');
      expect(executed).to.equal(1);
      expect(three).to.eql({a: 'b', c: 'd'});
    });

  });

  describe('require', function() {
    var require = app.require;

    it('should throw on non-existent module', function() {
      expect(function() {
        require('invalid-module');
      }).to.throwError(/Module not found/);
    });

    it('should export module.exports', function() {
      var obj = {};
      define('thing', function(require, exports, module) {
        var oldExports = exports;
        var newExports = module.exports = obj;
        newExports.getOld = function() {
          return oldExports;
        };
      });
      var thing = require('thing');
      expect(thing).to.have.property('getOld');
      expect(thing).to.equal(obj);
      expect(thing).to.not.equal(thing.getOld());
    });

  });

  describe('namespace, nesting and recursive', function() {
    var require = app.require;

    it('should define nested object', function() {
      define('nest/one', function(require, exports, module) {
        exports.getTwo = function() {
          return require('two');
        };
      });
      define('nest/two', function(require, exports, module) {
        exports.name = 'two';
      });
      var one = require('nest/one'), two = one.getTwo();
      expect(two.name).to.equal('two');
    });

    it('should recursively require', function() {
      define('recurse/one', function(require, exports, module) {
        exports.two = require('two');
      });
      define('recurse/two', function(require, exports, module) {
        exports.one = require('one');
      });
      var one = require('recurse/one')
        , two = require('recurse/two');
      expect(one.two).to.equal(two);
      expect(two.one).to.equal(one);
    });

  });

})();