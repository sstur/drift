'use strict';

const expect = require('expect.js');

const Router = require('../src/system/router');

describe('router', function() {
  var router = new Router();
  var complete = false;
  router.on('no-route', function() {
    complete = true;
  });

  it('should add a route', function() {
    var fn = function() {};
    router.addRoute('/one', fn);
    expect(router._routes.length).to.be(1);
    var first = router._routes[0];
    expect(JSON.stringify(first)).to.eql(JSON.stringify({ method: '*' }));
    expect(typeof first.matcher).to.be('function');
    expect(typeof first.handler).to.be('function');
  });

  it('should execute route', function() {
    var count = 0;
    var fn = function() {
      count++;
    };
    router.addRoute('/two', fn);
    complete = false;
    router.route('GET', '/two');
    expect(count).to.equal(1);
    expect(complete).to.be(true);
  });

  it('should execute verb route', function() {
    var count = 0;
    var fn = function() {
      count++;
    };
    router.addRoute('POST:/post', fn);
    router.addRoute('GET:/post', fn);
    complete = false;
    router.route('POST', '/post');
    expect(count).to.equal(1);
    expect(complete).to.be(true);
  });

  it('should execute multiple route handlers', function() {
    var count = 0;
    var fn = function() {
      count++;
    };
    router.addRoute('/three/foo', fn);
    router.addRoute('/three/:opt', fn);
    complete = false;
    router.route('GET', '/three/foo');
    expect(count).to.equal(2);
    expect(complete).to.be(true);
  });

  it('should match named params', function() {
    var count = 0;
    var fn = function(n, m) {
      count += 1;
      expect(n).to.equal('2');
      expect(m).to.equal('a');
    };
    router.addRoute('/four/:n/:m', fn);
    complete = false;
    router.route('GET', '/four/2/a');
    expect(count).to.equal(1);
    expect(complete).to.be(true);
  });
});
