/*global app, define, describe, it */
require('should');

(function() {
  "use strict";

  var core = require('../app/system/core');

  require('../app/system/lib/liquid');
  var liquid = app.require('liquid');

  describe('liquid', function() {

    it('should be an object', function() {
      liquid.should.be.a('object');
    });

    it('should have 4 properties', function() {
      liquid.utils.should.be.a('object');
      liquid.parser.should.be.a('object');
      liquid.filters.should.be.a('object');
      liquid.template.should.be.a('object');
    });

  });

})();