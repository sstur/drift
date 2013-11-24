/*!
 * todo: make sure all not-found errors comply with ENOENT
 */
/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var expect = require('expect');

  var undefined = void 0;
  var dataPath = app.cfg('data_dir') || 'data/';

  app.addTestSuite('fs', {
    '': function() {
    }
  });

});