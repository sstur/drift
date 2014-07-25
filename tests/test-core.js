/*global app, require, describe, it */
(function() {
  "use strict";

  var expect = require('expect.js');

  require('../app/system/core');

  describe('app', function() {
    var require = app.require;

    it('should be a function', function() {
      expect(app).to.be.a('function');
    });

    it('should call .fn', function() {
      app.fn = function() { return Array.prototype.slice.call(arguments).concat(this); };
      expect(app(1, 's')).to.eql([1, 's', app]);
    });

    it('should handle events', function() {
      var obj = {}, handler = function(obj) { obj.prop = true; };
      app.on('foo', handler);
      expect(app._events).to.eql({foo: [handler]});
      app.emit('foo', obj);
      expect(obj).to.eql({prop: true});
    });

    it('should add event-handling to an object', function() {
      var obj = {}, count = 0, fn = function(i) { count += i; };
      app.eventify(obj);
      expect(obj).to.have.property('on').and.have.property('emit');
      expect(obj.on).to.be.a('function');
      expect(obj.emit).to.be.a('function');
      obj.on('foo', fn);
      expect(obj._events).to.eql({foo: [fn]});
      obj.emit('foo', 2);
      expect(count).to.equal(2);
      //add a second handler for same event
      obj.on('foo', function() { count++; });
      obj.emit('foo', 1);
      expect(count).to.equal(4);
    });

    it('should get and set config options', function() {
      //add a test platform
      app.platforms.test1 = 1;
      app.cfg('test1', {a: {a: 1, b: false}});
      app.cfg('test1', {a: {a: 1, b: false}});
      app.cfg({a: {d: 'test'}});
      expect(app.cfg('a/a')).to.be(1);
      expect(app.cfg('a/b')).to.be(false);
      expect(app.cfg('a/c')).to.be(undefined);
      expect(app.cfg('a')).to.eql({a: 1, b: false, d: 'test'});
    });

  });

})();