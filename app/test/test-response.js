/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var expect = require('expect');
  var Request = require('request');
  var Response = require('response');
  var AdapterRequest = require('mock-request');
  var AdapterResponse = require('mock-response');
  //var blob = new Array(256);
  //for (var i = 0; i < 256; i++) blob[i] = String.fromCharCode(i);
  //blob = new Buffer(blob, 'binary');
  var undefined;

  app.addTestSuite('response', {
    'res.status()': function(it) {
      var res = createResponse();
      expect(res.status()).to.be('200 OK');
      res.status(404);
      expect(res.status()).to.be('404');
      res.status('404 Not Here');
      expect(res.status()).to.be('404 Not Here');
      res.status(504);
      expect(res.end().status).to.be('504 Gateway Time-out');
    },
    'res.headers()': function(it) {
      var res = createResponse();
      it('should initially be set to defaults', function() {
        expect(res.headers()).to.eql({'Content-Type': 'text/plain'});
      });
      it('should set and get values and be chainable', function() {
        var result = res.headers('X-Powered-By', 'Me');
        expect(res.headers('x-powered-by')).to.be('Me');
        expect(result).to.be(res);
        expect(res.headers()).to.eql({
          'Content-Type': 'text/plain',
          'X-Powered-By': 'Me'
        });
      });
      it('should stringify non-string values', function() {
        res.headers('x-number', 1);
        expect(res.headers('x-number')).to.be('1');
        res.headers('x-undefined', undefined);
        expect(res.headers('x-undefined')).to.be('');
        var date = new Date();
        res.headers('x-date', date);
        expect(res.headers('x-date')).to.be(date.toString());
      });
      it('should delete a header with null', function() {
        res.headers('x-number', null);
        res.headers('x-undefined', null);
        res.headers('x-date', null);
        expect(res.headers()).to.eql({
          'Content-Type': 'text/plain',
          'X-Powered-By': 'Me'
        });
      });
      it('should accept an object of keys/values', function() {
        var result = res.headers({'One': 1, 'Two': 2});
        expect([res.headers('One'), res.headers('Two')]).to.eql([1, 2]);
        expect(Object.keys(res.headers()).length).to.be(4);
        expect(result).to.be(res);
        res.headers({'One': null, 'Two': null});
        expect(res.headers()).to.eql({
          'Content-Type': 'text/plain',
          'X-Powered-By': 'Me'
        });
      });
      it('should allow multiple keys with different case, except reserved', function() {
        res.headers('x-number', 1);
        res.headers('X-Number', 2);
        expect([res.headers('x-number'), res.headers('X-Number')]).to.eql([1, 2]);
        res.headers({'x-number': null, 'X-Number': null});
        res.headers('ETag', 'x');
        res.headers('etag', 'y');
        expect([res.headers('ETag'), res.headers('etag')]).to.eql(['y', 'y']);
        res.headers('etag', null);
        expect(res.headers()).to.eql({
          'Content-Type': 'text/plain',
          'X-Powered-By': 'Me'
        });
      });
    },
    'res.charset()': function(it) {
      it('should append to content-type', function() {
        var res = createResponse();
        res.charset('ISO-8859-1');
        var result = res.end();
        expect(result.headers['Content-Type']).to.be('text/plain; charset=ISO-8859-1');
      });
      it('should override to content-type', function() {
        var res = createResponse();
        res.charset('UTF-8');
        res.headers('Content-Type', 'text/plain; charset=ISO-8859-1');
        var result = res.end();
        expect(result.headers['Content-Type']).to.be('text/plain; charset=UTF-8');
      });
    },
    'res.write()': function(it) {
    },
    'res.contentType()': function(it) {
    },
    'res.cookies()': function(it) {
    },
    'res.end()': function(it) {
    },
    'res.clear()': function(it) {
      var res = createResponse();
      res.write('a');
      res.clear();
      res.write('b');
      var result = res.end();
      expect(result.body).to.be('b');
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