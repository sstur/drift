/*global jQuery, expect, mocha, describe, it */
jQuery(function($) {
  "use strict";

  var helpers = mocha.helpers || (mocha.helpers = {});

  describe('Cookie Handling', function() {

    it('test editor init', function(done) {
      helpers.clearCookies();
      helpers.get('/test/cookies', function(err, data) {
        if (err) return done(err);
        expect(data).to.eql({});
        done();
      });
    });

  });

  mocha.run();
});