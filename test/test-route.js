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
    expect(JSON.stringify(router._routes)).to.eql('[{"pattern":"/one"}]');
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
    router.addRoute('/three', fn);
    router.addRoute('/three/:opt?', fn);
    complete = false;
    router.route('GET', '/three');
    expect(count).to.equal(2);
    expect(complete).to.be(true);
  });

  it('should match named params', function() {
    var count = 0;
    var fn = function(n) {
      count += parseInt(n, 10);
      //expect(n).to.equal(req._params.n);
      expect(n).to.equal('2');
    };
    router.addRoute('/four/:n/:m?', fn);
    complete = false;
    router.route('GET', '/four/2/a');
    expect(count).to.equal(2);
    expect(complete).to.be(true);
  });
});
