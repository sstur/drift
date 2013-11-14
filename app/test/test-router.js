/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var expect = require('expect');
  var Router = require('router');
  var Request = require('mock-request');
  var Response = require('mock-response');

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
      router.addRoute('/a/:b/:c', function(b, c) {
        params = toArray(arguments);
      });
      router.route('GET', '/a');
      expect(params).to.be(null);
      router.route('GET', '/a/one/two');
      expect(params).to.eql(['one', 'two']);
      router.route('GET', '/a/s/d', null);
      expect(params).to.eql([null, 's', 'd']);
    }
  });

});