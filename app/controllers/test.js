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
    var output = testRunner.run({format: 'html'});
    res.contentType('text/html');
    res.end(output);
  });

  //app.route('/test/cookie/:name/:value', function(req, res, name, value) {
  //  res.cookies(name, value);
  //  res.end({success: true});
  //});

  //app.route('/test/cookies', function(req, res) {
  //  res.end(req.cookies());
  //});

  //app.route('/test/session/:name/:value', function(req, res, name, value) {
  //  var Session = require('session');
  //  var session = Session.init(req, res);
  //  session(name, value);
  //  res.end({success: true});
  //});

  //app.route('/test/session', function(req, res) {
  //  var Session = require('session');
  //  var session = Session.init(req, res);
  //  res.end(session());
  //});

  //app.route('/test/sendfile', function(req, res) {
  //  res.sendFile({
  //    file: 'assets/testfile.txt',
  //    contentType: 'text/plain',
  //    attachment: 1,
  //    filename: 'a`~!@#$%^&*()_+-={}|[]\\:";\'><?,/.txt'
  //  });
  //});

});