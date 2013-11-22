/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var NATIVE = /\[(native code)\]/;
  if (String(Object.create).match(NATIVE)) {
    return;
  }

  var expect = require('expect');

  app.addTestSuite('polyfills', {
    //'Object.create(null)': function() {
    //  var o = Object.create(null);
    //  expect(o.toString).to.be(null);
    //},
    'Object.create()': function() {
      var a = {type: 1};
      var b = Object.create(a);
      expect(b.type).to.be(1);
      b.type = 2;
      expect(b.type).to.be(2);
      delete b.type;
      expect(b.type).to.be(1);
    }
  });

});