/*global jQuery, expect, mocha, describe, it */
jQuery(function($) {
  "use strict";

  mocha.setup({
    ui: 'bdd',
    globals: ['console']
  });

  var helpers = mocha.helpers || (mocha.helpers = {});

  describe('Cookie Handling', function() {

    it('test editor init', function(done) {
      document.cookie = '';
      $.ajax({
        url: '/test/cookies',
        dataType: 'json',
        success: function(data) {
          console.log(data);
          done();
        }
      });
    });

  });


});