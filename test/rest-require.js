/*global app, define, describe, it */
require('should');

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
        module.should.equal(this);
        exports.should.equal(module.exports);
        require.should.not.equal(app.require);
      });
      executed.should.equal(0);
    });

    it('should define but not execute', function() {
      define('one', fn);
      executed.should.equal(0);
    });

    it('should execute once at first require', function() {
      define('two', fn);
      executed.should.equal(0);
      var two = app.require('two');
      executed.should.equal(1);
      two.should.eql({a: 'b'});
      two.c = 'd';
      var three = app.require('two');
      executed.should.equal(1);
      three.should.eql({a: 'b', c: 'd'});
    });

  });

  describe('require', function() {

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
      thing.should.have.property('getOld');
      thing.should.equal(obj);
      thing.should.not.equal(thing.getOld());
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
      two.name.should.equal('two');
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
      one.two.should.equal(two);
      two.one.should.equal(one);
    });

  });

})();