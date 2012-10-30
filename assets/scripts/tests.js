/*global jQuery, expect, mocha, describe, it */
jQuery(function($) {
  "use strict";

  var helpers = mocha.helpers || (mocha.helpers = {});

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

  mocha.run();
});