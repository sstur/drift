/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var TestRunner = require('test-runner');

  app.route('/test/:suite', function(req, res, name) {
    if (!name || name == 'all') {
      var suites = app.getTestSuite();
    } else {
      var suite = app.getTestSuite(name);
      suites = [suite];
    }
    if (!suites[0]) return;
    var testRunner = new TestRunner();
    testRunner.addSuite(suites);
    res.contentType('text/html');
    testRunner.run({format: 'html', writeStream: res.getWriteStream()});
    res.end();
  });

});