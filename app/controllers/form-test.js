/*global app */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var Liquid = require('liquid');
  Liquid.render = function(tmpl, data) {
    return Liquid.parse(tmpl).renderWithErrors(data);
  };

  app.route('GET:/form-test', function(req, res) {
    var tmpl = fs.readTextFile('views/test-form.liquid');
    var markup = Liquid.render(tmpl, {name: 'test'});
    res.die('text/html', markup);
  });

  app.route('POST:/form-test', function(req, res) {
    res.die({fields: req.post(), files: req.uploads()});
  });

});