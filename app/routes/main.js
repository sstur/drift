/*global app, define */
app.route('/test/:id', function(req, res, id) {
  res.die('id: ' + id);

  var qs = require('qs');
  res.debug(qs.parse('a=1&&b=2&c&=3&c=4', {flatten: false}));

});

app.route('/liquid', function(req, res) {
  var util = require('util');
  var liquid = app.require('liquid');
  res.die(util.inspect(liquid));
});

app.route('/throw', function(req, res) {
  throw new Error(req.url('path') + ' threw');
});
