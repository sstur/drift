/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var qs = require('qs');
  var crypto = require('crypto');
  var expect = require('expect');
  var Request = require('request');
  var Response = require('response');
  var AdapterRequest = require('mock-request');
  var AdapterResponse = require('mock-response');
  //var blob = new Array(256);
  //for (var i = 0; i < 256; i++) blob[i] = String.fromCharCode(i);
  //blob = new Buffer(blob, 'binary');

  app.addTestSuite('response', {
    'url parsing': function() {
      var res = createResponse('/go?a=1');
      expect(res.end()).to.be('');
    }
  });


  function createResponse(cfg) {
    var req = new Request(new AdapterRequest(cfg));
    var res = new Response(new AdapterResponse());
    req.res = res;
    res.req = req;
    return res;
  }

});