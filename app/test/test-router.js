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
      //var req = new Request('/a');
      //var res = new Response();
      var i = 0;
      router.addRoute('/a', function() {
        i += 1;
      });
      router.route('GET', '/');
      expect(i).to.be(0);
      router.route('GET', '/a');
      expect(i).to.be(1);
    }
  });

});