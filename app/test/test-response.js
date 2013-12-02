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
      var result = catchNull(res, 'end');
      expect(result.status).to.be('504 Gateway Time-out');
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
        res.headers('X-Powered-By', null);
        expect(res.headers()).to.eql({'Content-Type': 'text/plain'});
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
        expect(res.headers()).to.eql({'Content-Type': 'text/plain'});
      });
      it('should accept an object of keys/values', function() {
        var result = res.headers({'One': 1, 'Two': 2});
        expect([res.headers('One'), res.headers('Two')]).to.eql([1, 2]);
        expect(Object.keys(res.headers()).length).to.be(3);
        expect(result).to.be(res);
        res.headers({'One': null, 'Two': null});
        expect(res.headers()).to.eql({'Content-Type': 'text/plain'});
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
        expect(res.headers()).to.eql({'Content-Type': 'text/plain'});
      });
      it('should allow multiple Set-Cookie and concatenate on get', function() {
        res.headers('Set-Cookie', 'a');
        expect(res.headers()).to.eql({
          'Content-Type': 'text/plain',
          'Set-Cookie': 'a'
        });
        res.headers('Set-Cookie', 'b');
        expect(res.headers('Set-Cookie')).to.be('a; b');
        expect(res.headers()).to.eql({
          'Content-Type': 'text/plain',
          'Set-Cookie': ['a', 'b']
        });
        res.headers('Set-Cookie', null);
        expect(res.headers()).to.eql({'Content-Type': 'text/plain'});
      });
    },
    'res.charset()': function(it) {
      it('should append to content-type', function() {
        var res = createResponse();
        res.charset('ISO-8859-1');
        var result = catchNull(res, 'end');
        expect(result.headers['Content-Type']).to.be('text/plain; charset=ISO-8859-1');
      });
      it('should override to content-type', function() {
        var res = createResponse();
        res.charset('UTF-8');
        res.headers('Content-Type', 'text/plain; charset=ISO-8859-1');
        var result = catchNull(res, 'end');
        expect(result.headers['Content-Type']).to.be('text/plain; charset=UTF-8');
      });
    },
    'res.write()': function(it) {
      it('should write primitive values', function() {
        var res = createResponse();
        res.write(1);
        res.write(null);
        res.write(undefined);
        res.write(false);
        res.write('string');
        var result = catchNull(res, 'end');
        expect(result.body).to.be('1nullundefinedfalsestring');
      });
      it('should write unicode strings and buffers', function() {
        var res = createResponse();
        res.write('ü');
        res.write(new Buffer('î', 'utf8'));
        var result = catchNull(res, 'end');
        expect(result.body).to.be('üÃ®');
      });
      it('should stringify objects', function() {
        var res = createResponse();
        res.write({hi: 1});
        res.write([2, false]);
        var result = catchNull(res, 'end');
        expect(result.body).to.be('{"hi":1}[2,false]');
      });
      it('should not write anything for HEAD requests', function() {
        var res = createResponse({method: 'HEAD'});
        res.write('ü');
        res.write({hi: 1});
        var result = catchNull(res, 'end');
        expect(result.body).to.be('');
      });
    },
    'res.clear()': function(it) {
      var res = createResponse();
      res.write('a');
      res.clear();
      res.write('b');
      var result = catchNull(res, 'end');
      expect(result.body).to.be('b');
    },
    'res.contentType()': function(it) {
    },
    'res.cookies()': function(it) {
      var res = createResponse();
      it('should set/get', function() {
        expect(res.cookies('Sample')).to.be(undefined);
        res.cookies('Sample', 'one');
        expect(res.cookies('Sample')).to.be.an('object');
        expect(res.cookies('Sample')).to.eql({value: 'one'});
      });
      it('should set multiple', function() {
        res.cookies({'One': '1', 'Two': '2'});
        expect(res.cookies('One')).to.eql({value: '1'});
        expect(res.cookies('Two')).to.eql({value: '2'});
      });
      it('should delete', function() {
        res.cookies('Sample', null);
        expect(res.cookies('Sample')).to.be(undefined);
        res.cookies({'One': null, 'Two': null});
        expect(res.cookies()).to.eql({});
      });
      it('should overwrite', function() {
        res.cookies('Sample', 'one');
        expect(res.cookies()).to.eql({'Sample': {value: 'one'}});
        res.cookies('Sample', 'two');
        expect(res.cookies()).to.eql({'Sample': {value: 'two'}});
      });
      it('should be case-sensitive', function() {
        res.cookies('Sample', 'one');
        res.cookies('sample', 'two');
        expect(res.cookies()).to.eql({'Sample': {value: 'one'}, 'sample': {value: 'two'}});
        res.cookies({'Sample': null, 'sample': null});
        expect(res.cookies()).to.eql({});
      });
      it('should be chainable', function() {
        var result = res.cookies('Sample', 'one');
        expect(result).to.be(res);
        result = res.cookies({'One': '1', 'Sample': null});
        expect(result).to.be(res);
        expect(res.cookies()).to.eql({'One': {value: '1'}});
      });
      it('should coerce name to string', function() {
        res.cookies(1, '1');
        expect(res.cookies('1')).to.eql({value: '1'});
        res.cookies(null, 'null');
        expect(res.cookies('null')).to.eql({value: 'null'});
        res.cookies({'1': null, 'null': null})
      });
      it('should coerce value to string if not null or object', function() {
        res.cookies('One', 1);
        expect(res.cookies('One').value).to.be('1');
        res.cookies('False', false);
        expect(res.cookies('False').value).to.be('false');
        res.cookies('Nothing', undefined);
        expect(res.cookies('Nothing').value).to.be('undefined');
        res.cookies('Date', new Date());
        expect(res.cookies('Date').value).to.be('undefined');
        res.cookies({'One': null, 'False': null, 'Nothing': null, 'Date': null});
        expect(res.cookies()).to.eql({});
      });
      it('should accept options', function() {
        var date = new Date(Date.now() + 86400000);
        res.cookies('Test', {
          domain: 'example.com',
          path: '/index.html',
          expires: date,
          value: 1
        });
        expect(res.cookies('Test')).to.eql({
          domain: 'example.com',
          path: '/index.html',
          expires: date,
          value: '1'
        });
        res.cookies('Test', null);
        res.cookies('Test', {});
        expect(res.cookies()).to.eql({'Test': {value: 'undefined'}});
        res.cookies('Test', null);
      });
    },
    'res.end()': function(it) {
      it('should assume single argument is body', function() {
        var result = catchNull(createResponse(), 'end', 200);
        expect(result.body).to.be('200');
      });
      it('should not allow invalid status', function() {
        var result = catchNull(createResponse(), 'end', 10, 20);
        expect(result.body).to.be('1020');
      });
      it('should allow numeric status and body', function() {
        var result = catchNull(createResponse(), 'end', 404, 404);
        expect(result.status).to.be('404 Not Found');
        expect(result.body).to.be('404');
      });
      it('should allow status and content type', function() {
        var result = catchNull(createResponse(), 'end', 404, 'text/html', 1);
        expect(result.status).to.be('404 Not Found');
        expect(result.headers).to.eql({'Content-Type': 'text/html; charset=UTF-8'});
        expect(result.body).to.be('1');
      });
      it('should not allow invalid content type', function() {
        var result = catchNull(createResponse(), 'end', 404, 'html/', 1);
        expect(result.status).to.be('404 Not Found');
        expect(result.headers).to.eql({'Content-Type': 'text/plain; charset=UTF-8'});
        expect(result.body).to.be('html/1');
      });
      it('should allow content type without status', function() {
        var result = catchNull(createResponse(), 'end', 'text/xml', 404);
        expect(result.status).to.be('200 OK');
        expect(result.headers).to.eql({'Content-Type': 'text/xml; charset=UTF-8'});
        expect(result.body).to.be('404');
      });
    },
    'res.redirect()': function(it) {
      it('should redirect using 302 as default', function() {
        var result = catchNull(createResponse(), 'redirect', '/');
        expect(result.status).to.be('302 Moved');
        expect(result.headers).to.eql({'Content-Type': 'text/plain; charset=UTF-8', Location: '/'});
      });
      it('should allow type 301', function() {
        var result = catchNull(createResponse(), 'redirect', '/a', 301);
        expect(result.status).to.be('301 Moved Permanently');
        expect(result.headers).to.eql({'Content-Type': 'text/plain; charset=UTF-8', Location: '/a'});
      });
      it('should allow type 303', function() {
        var result = catchNull(createResponse(), 'redirect', '?', '303');
        expect(result.status).to.be('303 See Other');
        expect(result.headers).to.eql({'Content-Type': 'text/plain; charset=UTF-8', Location: '?'});
      });
      it('should allow html redirect', function() {
        var result = catchNull(createResponse(), 'redirect', '/auth/login', 'html');
        expect(result.status).to.be('200 OK');
        expect(result.headers).to.eql({'Content-Type': 'text/html; charset=UTF-8'});
        expect(result.body).to.be('<html>\r\n<head><title>Redirecting ...</title><meta http-equiv="refresh" content="0;url=/auth/login"></head>\r\n<body onload="location.replace(document.getElementsByTagName(\'meta\')[0].content.slice(6))">\r\n<noscript><p>If you are not redirected, <a href="/auth/login">Click Here</a></p></noscript>\r\n<!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING -->\r\n</body>\r\n</html>');
      });
    },
    'res.htmlRedirect()': function(it) {
      var res = createResponse();
      res.status(404);
      var result = catchNull(res, 'htmlRedirect', '/thing');
      expect(result.status).to.be('404 Not Found');
      expect(result.headers).to.eql({'Content-Type': 'text/html; charset=UTF-8'});
      expect(result.body).to.be('<html>\r\n<head><title>Redirecting ...</title><meta http-equiv="refresh" content="0;url=/thing"></head>\r\n<body onload="location.replace(document.getElementsByTagName(\'meta\')[0].content.slice(6))">\r\n<noscript><p>If you are not redirected, <a href="/thing">Click Here</a></p></noscript>\r\n<!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING --><!-- PADDING -->\r\n</body>\r\n</html>');
    },
    'res.die()': function(it) {
      it('should clear and end', function() {
        var res = createResponse();
        res.write('abc');
        var result = catchNull(res, 'die', 'text/xml', 1);
        expect(result.status).to.be('200 OK');
        expect(result.headers).to.eql({'Content-Type': 'text/xml; charset=UTF-8'});
        expect(result.body).to.be('1');
      });
    },
    'res.debug()': function(it) {
      it('should write the results of util.inspect and end', function() {
        var res = createResponse();
        var result = catchNull(res, 'debug', {a: 1});
        expect(result.body).to.be('{ a: 1 }');
      });
    },
    'res.getWriteStream()': function(it) {
      var res = createResponse();
      res.status(500);
      res.headers('X-Test', 1);
      var stream = res.getWriteStream();
      it('should produce a writeable stream', function() {
        stream.write('a');
        stream.write('b');
      });
      var result = res._super;
      it('should propogate end', function() {
        try {
          stream.end();
        } catch(e) {
          if (e !== null) throw e;
        }
        expect(result.getBody()).to.be('ab');
      });
      it('should not clear headers or status', function() {
        expect(result.status).to.be('500 Internal Server Error');
        expect(result.headers).to.eql({'Content-Type': 'text/plain; charset=UTF-8', 'X-Test': '1'});
      });
    },
    'res.sendFile()': function(it) {
      //todo
    }
  });


  function createResponse(cfg) {
    var req = new Request(new AdapterRequest(cfg));
    var res = new Response(new AdapterResponse());
    req.res = res;
    res.req = req;
    return res;
  }

  function catchNull(res, method) {
    var args = Array.prototype.slice.call(arguments, 2);
    try {
      res[method].apply(res, args);
    } catch(e) {
      if (e !== null) throw e;
    }
    var result = res._super;
    return {
      status: result.status,
      headers: result.headers,
      body: result.getBody()
    }
  }

});