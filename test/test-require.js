/*global app, define, describe, it */
var expect = require('chai').expect;

(function() {
  "use strict";

  var core = require('../app/system/core');

  describe('define', function() {
    var executed = 0;
    var fn = function(require, exports) {
      executed += 1;
      exports.a = 'b';
    };

    it('should define with correct parameters', function() {
      define('thing', function(require, exports, module) {
        expect(module).to.equal(this);
        expect(exports).to.equal(module.exports);
        expect(require).to.not.equal(app.require);
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
      var two = app.require('two');
      expect(executed).to.equal(1);
      expect(two).to.eql({a: 'b'});
      two.c = 'd';
      var three = app.require('two');
      expect(executed).to.equal(1);
      expect(three).to.eql({a: 'b', c: 'd'});
    });

  });

  describe('require', function() {

    it('should throw on non-existent module', function() {
      expect(function() {
        app.require('invalid-module');
      }).to.throw(/Module not found/);
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
      var thing = app.require('thing');
      expect(thing).to.have.property('getOld');
      expect(thing).to.equal(obj);
      expect(thing).to.not.equal(thing.getOld());
    });

  });

  describe('namespace, nesting and recursive', function() {

    it('should define nested object', function() {
      define('nest/one', function(require, exports, module) {
        exports.getTwo = function() {
          return require('two');
        };
      });
      define('nest/two', function(require, exports, module) {
        exports.name = 'two';
      });
      var one = app.require('nest/one'), two = one.getTwo();
      expect(two.name).to.equal('two');
    });

    it('should recursively require', function() {
      define('recurse/one', function(require, exports, module) {
        exports.two = require('two');
      });
      define('recurse/two', function(require, exports, module) {
        exports.one = require('one');
      });
      var one = app.require('recurse/one')
        , two = app.require('recurse/two');
      expect(one.two).to.equal(two);
      expect(two.one).to.equal(one);
    });

  });

})();