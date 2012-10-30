/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var util = require('util');
  var Buffer = require('buffer').Buffer;

  app.route('/test/cookie/:name/:value', function(req, res, name, value) {
    res.cookies(name, value);
    res.end({success: true});
  });

  app.route('/test/cookies', function(req, res) {
    res.end(req.cookies());
  });

  app.route('/test/json', function(req, res) {
    var fields = req.post();
    var data = JSON.parse(fields.data);
    res.end(data);
  });

});