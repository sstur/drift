/* eslint-disable one-var */
'use strict';
const expect = require('expect.js');

const { eventify } = require('../src/eventify');

require('../src/core');

describe('app', function() {
  it('should be an object', function() {
    expect(app).to.be.an('object');
  });

  it('should handle events', function() {
    var obj = {};
    var handler = function(obj) {
      obj.prop = true;
    };
    app.on('foo', handler);
    expect(app._events).to.eql({ foo: [handler] });
    app.emit('foo', obj);
    expect(obj).to.eql({ prop: true });
  });

  it('should add event-handling to an object', function() {
    var obj = {},
      count = 0;
    var fn = function(i) {
      count += i;
    };
    eventify(obj);
    expect(obj)
      .to.have.property('on')
      .and.have.property('emit');
    expect(obj.on).to.be.a('function');
    expect(obj.emit).to.be.a('function');
    obj.on('foo', fn);
    expect(obj._events).to.eql({ foo: [fn] });
    obj.emit('foo', 2);
    expect(count).to.equal(2);
    //add a second handler for same event
    obj.on('foo', function() {
      count++;
    });
    obj.emit('foo', 1);
    expect(count).to.equal(4);
  });
});
