/*global app, define */
app.on('ready', function(require) {
  'use strict';

  var expect = require('expect');
  var Router = require('router');
  //var Request = require('mock-request');
  //var Response = require('mock-response');

  var router;

  app.addTestSuite('router', {
    setup: function() {
      router = new Router();
    },
    'basic route': function() {
      var count = 0;
      router.addRoute('/a', function() {
        count += 1;
      });
      router.route('GET', '/');
      expect(count).to.be(0);
      router.route('GET', '/a');
      expect(count).to.be(1);
    },
    'route with params': function() {
      this.setup();
      var params = null;
      router.addRoute('/a/:b/:c', function() {
        params = toArray(arguments);
      });
      router.route('GET', '/a');
      expect(params).to.be(null);
      router.route('GET', '/a/one/two');
      expect(params).to.eql(['one', 'two']);
      router.route('GET', '/a/s/d', null);
      expect(params).to.eql([null, 's', 'd']);
    },
    'optional params': function() {
      this.setup();
      var params = null;
      router.addRoute('/a/:b/:c?', function() {
        params = toArray(arguments);
      });
      router.route('GET', '/a');
      expect(params).to.be(null);
      router.route('GET', '/a/test', 1);
      expect(params).to.eql([1, 'test', '']);
      router.route('GET', '/a/b/c', 'req', 'res');
      expect(params).to.eql(['req', 'res', 'b', 'c']);
    },
    'this params': function() {
      this.setup();
      router.addRoute('/a/:b/:c?', function(b, c) {
        expect(this.opts).to.eql({});
        expect(this.values).to.eql([b, c]);
        expect(this.params).to.eql({b: b, c: c});
      });
      router.route('GET', '/a/b/c');
    },
    'route options': function() {
      this.setup();
      router.addRoute('/a/:b/:c?', function() {
        expect(this.opts).to.eql({noAuth: 1});
        expect(this.values).to.eql(['1', '2']);
        expect(this.params).to.eql({b: '1', c: '2'});
      }, {noAuth: 1});
      router.route('GET', '/a/1/2');
    },
    'route stop': function() {
      this.setup();
      var count = 0;
      router.addRoute('/a', function() {
        count += 1;
        this.stop();
      });
      router.addRoute('/a', function() {
        count += 1;
      });
      router.route('GET', '/a');
      expect(count).to.be(1);
    },
    'route get/post': function() {
      this.setup();
      var result = [];
      router.addRoute('/a', function() {
        result.push('all');
      });
      router.addRoute('GET:/a', function() {
        result.push('get');
      });
      router.addRoute('POST:/a', function() {
        result.push('post');
      });
      router.route('GET', '/a');
      expect(result.join('|')).to.be('all|get');
      result.length = 0;
      router.route('POST', '/a');
      expect(result.join('|')).to.be('all|post');
    },
    'route regex': function() {
      this.setup();
      router.addRoute(/\/(user|users)\/(\d+)/, function(callback, type, id) {
        callback.call(this, type, id);
      });
      var done;
      router.route('GET', '/user/1', function(type, id) {
        expect(type).to.be('user');
        expect(this.params.$1).to.be('user');
        expect(id).to.be('1');
        expect(this.params.$2).to.be('1');
        done = true;
      });
      expect(done).to.be(true);
    },
    'route events': function() {
      this.setup();
      var results = [];
      router.on('pre-route', function() {
        results.push('a');
      });
      router.on('match-route', function() {
        results.push('b');
      });
      router.on('no-route', function() {
        results.push('c');
      });
      router.addRoute('/go', function() {
        results.push('route');
      });
      router.route('GET', '/go');
      expect(results.join('|')).to.be('a|b|route|c');
      results.length = 0;
      router.route('GET', '/no');
      expect(results.join('|')).to.be('a|c');
    }
  });

});
