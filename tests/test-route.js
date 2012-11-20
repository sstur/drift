/*global app, require, describe, it */
(function() {
  "use strict";

  var expect = require('chai').expect;

  require('../app/system/core');

  require('../node-server/adapters/buffer');
  require('../node-server/adapters/inspector');

  require('../app/system/config/defaults');
  require('../app/config/config');
  require('../app/config/config');

  require('../app/system/lib/globals');
  require('../app/system/lib/router');
  require('../app/system/lib/qs');
  require('../app/system/lib/util');

  describe('router', function() {
    var require = app.require;
    var util = require('util')
      , Router = require('router');

    it('should add a route', function() {
      var fn = function() {};
      app.route('/one', fn);
      expect(app._routes).to.eql([{route: '/one', handler: fn}]);
    });

    it('should execute route', function() {
      var count = 0;
      var fn = function() { count++ };
      app.route('/two', fn);
      var req = dummyRequest('GET', '/two'), res = dummyResponse();
      app.route(req, res);
      expect(count).to.equal(1);
      expect(res.getData().join(', ')).to.equal('STATUS:404, DATA:No Route, END');
    });

    it('should execute verb route', function() {
      var count = 0;
      var fn = function() { count++ };
      app.route('POST:/post', fn);
      app.route('GET:/post', fn);
      var req = dummyRequest('POST', '/post'), res = dummyResponse();
      app.route(req, res);
      expect(count).to.equal(1);
      expect(res.getData().join(', ')).to.equal('STATUS:404, DATA:No Route, END');
    });

    it('should execute multiple route handlers', function() {
      var count = 0;
      var fn = function() { count++ };
      app.route('/three', fn);
      app.route('/three/:opt?', fn);
      var req = dummyRequest('GET', '/three'), res = dummyResponse();
      app.route(req, res);
      expect(count).to.equal(2);
      expect(res.getData().join(', ')).to.equal('STATUS:404, DATA:No Route, END');
    });

    it('should stop routing', function() {
      var count = 0;
      var fn1 = function() { count++; this.stop() };
      var fn2 = function() { count++ };
      app.route('/four', fn1);
      app.route('/four', fn2);
      var req = dummyRequest('GET', '/four'), res = dummyResponse();
      app.route(req, res);
      expect(count).to.equal(1);
      expect(res.getData().join(', ')).to.equal('STATUS:404, DATA:No Route, END');
    });

    it('should match named params', function() {
      var count = 0;
      var fn = function(req, res, n) {
        count += parseInt(n, 10);
        expect(n).to.equal(req._params.n);
        expect(n).to.equal(req.params('n'));
      };
      app.route('/four/:n/:m?', fn);
      var req = dummyRequest('GET', '/four/2/a'), res = dummyResponse();
      app.route(req, res);
      expect(count).to.equal(2);
      expect(res.getData().join(', ')).to.equal('STATUS:404, DATA:No Route, END');
    });

    it('should match regex', function() {
      var count = 0;
      var fn = function(req, res, p1, p2) {
        count++;
        expect(p1).to.equal('1');
        expect(p2).to.equal('a');
        expect(req._params).to.eql({$1: '1', $2: 'a'});
      };
      app.route(/\/five\/(\d+)\/([a-z]+)/, fn);
      var req = dummyRequest('GET', '/five/1/a'), res = dummyResponse();
      app.route(req, res);
      expect(count).to.equal(1);
      expect(res.getData().join(', ')).to.equal('STATUS:404, DATA:No Route, END');
    });

  });

})();