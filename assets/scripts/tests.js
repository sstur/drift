/*global jQuery, expect, mocha, describe, it */
jQuery(function($) {
  "use strict";

  var helpers = mocha.helpers || (mocha.helpers = {});

  describe('JSON Handling', function() {
    var testData = {
      primitives: [null, 0, 1, true, false, 'string'],
      wrapped: [new String('s'), new Boolean(true), new Number(2)],
      'built-in': [new Date, /a/i, function() {}]
    };
    var stringified = JSON.stringify(testData);

    it('test json parse/stringify', function(done) {
      helpers.post('/test/json', {data: stringified}, function(err, data) {
        if (err) return done(err);
        expect(JSON.stringify(data)).to.eql(stringified);
        done();
      });
    });

  });

  describe('Cookie Handling', function() {

    it('test empty cookies', function(done) {
      helpers.clearCookies();
      helpers.get('/test/cookies', function(err, data) {
        if (err) return done(err);
        expect(data).to.eql({});
        done();
      });
    });

    it('test set cookie', function(done) {
      helpers.clearCookies();
      helpers.get('/test/cookie/one/two', function(err, data) {
        if (err) return done(err);
        expect(data).to.eql({success: true});
        helpers.get('/test/cookies', function(err, data) {
          if (err) return done(err);
          expect(data).to.eql({one: 'two'});
          done();
        });
      });
    });

  });

  describe('Session Handling', function() {

    it('test empty session', function(done) {
      helpers.clearCookies();
      helpers.get('/test/session', function(err, data) {
        if (err) return done(err);
        //console.log(this.getAllResponseHeaders());
        expect(data).to.eql({});
        done();
      });
    });

    it('test set session', function(done) {
      helpers.clearCookies();
      helpers.get('/test/session/user/123', function(err, data) {
        if (err) return done(err);
        expect(data).to.eql({success: true});
        helpers.get('/test/session', function(err, data) {
          if (err) return done(err);
          expect(data).to.eql({user: '123'});
          done();
        });
      });
    });

  });

  mocha.run();
});