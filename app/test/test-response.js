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
    'res.clear()': function(it) {
      var res = createResponse();
      res.write('a');
      res.clear();
      res.write('b');
      var result = res.end();
      expect(result.body).to.be('b');
    },
    'res.status()': function(it) {
    },
    'res.charset()': function(it) {
    },
    'res.headers()': function(it) {
    },
    'res.write()': function(it) {
    },
    'res.contentType()': function(it) {
    },
    'res.cookies()': function(it) {
    },
    'res.end()': function(it) {
    },
    'res.die()': function(it) {
    },
    'res.debug()': function(it) {
    },
    'res.getWriteStream()': function(it) {
    },
    'res.sendFile()': function(it) {
    },
    'res.redirect()': function(it) {
    },
    'res.htmlRedirect()': function(it) {
    }
  });


  function createResponse(cfg) {
    var req = new Request(new AdapterRequest(cfg));
    var res = new Response(new AdapterResponse());
    req.res = res;
    res.req = req;
    var _end = res.end;
    res.end = function() {
      try {
        _end.apply(this, arguments);
      } catch(e) {
        if (e !== null) throw e;
      }
      var result = res._super;
      return {
        status: result.status,
        headers: result.headers,
        body: result.getBody()
      }
    };
    return res;
  }

});