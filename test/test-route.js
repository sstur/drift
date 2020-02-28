/*global app, require, describe, it */
(function() {
  'use strict';

  var expect = require('expect.js');

  require('../server/core');

  require('../server/adapters/buffer');

  require('../server/config/defaults');

  require('../server/system/globals');
  require('../server/system/router');
  require('../server/system/qs');
  require('../server/system/util');

  describe('router', function() {
    var require = app.require;

    var Router = require('router');

    var router = new Router();
    var complete = false;
    router.on('no-route', function() {
      complete = true;
    });

    it('should add a route', function() {
      var fn = function() {};
      router.addRoute('/one', fn);
      expect(JSON.stringify(router._routes)).to.eql('[{"route":"/one","paramNames":[]}]');
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

    it('should stop routing', function() {
      var count = 0;
      var fn1 = function() {
        count++;
        this.stop();
      };
      var fn2 = function() {
        count++;
      };
      router.addRoute('/four', fn1);
      router.addRoute('/four', fn2);
      complete = false;
      router.route('GET', '/four');
      expect(count).to.equal(1);
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

    it('should match regex', function() {
      var count = 0;
      var fn = function(p1, p2) {
        count++;
        expect(p1).to.equal('1');
        expect(p2).to.equal('a');
      };
      router.addRoute(/\/five\/(\d+)\/([a-z]+)/, fn);
      complete = false;
      router.route('GET', '/five/1/a');
      expect(count).to.equal(1);
      expect(complete).to.be(true);
    });

  });

})();
