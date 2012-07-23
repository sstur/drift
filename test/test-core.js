/*global app, define, describe, it */
require('should');

(function() {
  "use strict";

  var core = require('../app/system/core')
    , fs = require('fs');

  describe('app', function() {

    it('should be a function', function() {
      app.should.be.a('function');
    });

    it('should call .fn', function() {
      app.fn = function() { return Array.prototype.slice.call(arguments).concat(this); };
      app(1, 's').should.eql([1, 's', app]);
    });

    it('should handle events', function() {
      var obj = {}, handler = function(obj) { obj.prop = true; };
      app.on('foo', handler);
      app._events.should.eql({foo: [handler]});
      app.emit('foo', obj);
      obj.should.eql({prop: true});
    });

  });

  describe('define', function() {
    var executed = false;
    var fn = function(require, exports) {
      executed = true;
      exports.a = 'b';
    };

    it('should define but not execute', function() {
      define('one', fn);
      executed.should.equal(false);
    });

    it('should execute upon require', function() {
      define('two', fn);
      executed.should.equal(false);
      var two = app.require('two');
      executed.should.equal(true);
      two.should.eql({a: 'b'});
    });

    it('should only execute once', function() {
      define('three', fn);
      var three = app.require('three');
      three.should.eql({a: 'b'});
      three.c = 'd';
      three = app.require('three');
      three.should.eql({a: 'b', c: 'd'});
    });

  });

})();