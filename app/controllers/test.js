/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var util = require('util');

  app.route('/test/json', function(req, res) {
    var data = JSON.parse(req.body('data'));
    res.end(data);
  });

  app.route('/test/cookie/:name/:value', function(req, res, name, value) {
    res.cookies(name, value);
    res.end({success: true});
  });

  app.route('/test/cookies', function(req, res) {
    res.end(req.cookies());
  });

  app.route('/test/session/:name/:value', function(req, res, name, value) {
    var Session = require('session');
    var session = Session.init(req, res);
    session(name, value);
    res.end({success: true});
  });

  app.route('/test/session', function(req, res) {
    var Session = require('session');
    var session = Session.init(req, res);
    res.end(session());
  });

  app.route('/test/sendfile', function(req, res) {
    res.sendFile({
      file: 'assets/testfile.txt',
      contentType: 'text/plain',
      attachment: 1,
      filename: 'a`~!@#$%^&*()_+-={}|[]\\:";\'><?,/.txt'
    });
  });

});