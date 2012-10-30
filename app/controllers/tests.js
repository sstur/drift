/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var util = require('util');
  var Buffer = require('buffer').Buffer;

  app.route('/test/cookie/:name/:value', function(req, res, name, value) {
    res.cookies(name, value);
    res.end('set cookie: ' + name);
  });

  app.route('/test/cookies', function(req, res) {
    res.end(req.cookies());
  });

  app.route('/test/json', function(req, res) {
    res.end(JSON.stringify([new Date, new String(1), new Boolean(0), new Number(2)]));
  });

});