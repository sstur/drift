/*global app, define */

app.route('/test/:id', function(req, res, id) {
  res.die('id: ' + id);
  var qs = app.require('qs');
  res.debug(qs.parse('a=1&&b=2&c&=3&c=4', {flatten: false}));

});

app.route('/sendfile', function(req, res) {
  res.sendFile('../assets/test.txt');
});

app.route('/cookie/:name/:value', function(req, res, name, value) {
  res.cookies(name, value);
  res.end('set cookie: ' + name);
});

app.route('/cookies', function(req, res) {
  res.die(req.cookies());
});

app.route('/liquid', function(req, res) {
  var Liquid = app.require('liquid');
  var render = function(src, ctx) {
    return Liquid.parse(src).renderWithErrors(ctx);
  };
  var markup = render("<p>{{user | capitalize}}</p>", {user: 'bob'});
  res.die('text/plain', markup);
});

app.route('/throw', function(req, res) {
  throw new Error(req.url('path') + ' threw');
});
