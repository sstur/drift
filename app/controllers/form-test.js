app.on('ready', function(require) {
  var fs = require('fs');
  var Liquid = require('liquid');
  Liquid.render = function(tmpl, data) {
    return Liquid.parse(tmpl).renderWithErrors(data);
  };

  app.route('GET:/form-test', function(req, res) {
    var markup = Liquid.render(fs.readTextFile('views/test-form.liquid'), {name: 'test'});
    res.die('text/html', markup);
  });

  app.route('POST:/form-test', function(req, res) {
    res.die(req.post());
  });

});