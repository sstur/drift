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

})();