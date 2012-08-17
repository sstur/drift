/*global app, define, describe, it */
var expect = require('chai').expect;

(function() {
  "use strict";

  var core = require('../app/system/core')
    , fs = require('fs');

  describe('app', function() {

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

  });

})();