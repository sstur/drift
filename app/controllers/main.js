/*global app, define */
app.on('ready', function(require) {
  "use strict";

  app.route('/', function(req, res) {
    res.die('Hello world!');
  });

  app.route('/rpc', function(req, res) {
    var text = app.rpc('fs.readFile', app.mappath('../assets/test.txt'), 'utf8');
    res.die(text);
  });

  app.route('/test/:id', function(req, res, id) {
    var qs = require('qs');
    res.debug(qs.parse('a=1&&b=2&c&=3&c=' + id, {flatten: false}));

  });

  app.route('/readfile', function(req, res) {
    var fs = require('fs');
    var text = fs.readTextFile('../assets/test.txt');
    res.end(text);
  });

  app.route('/sendfile', function(req, res) {
    //res.sendFile('../assets/test.txt');
    res.sendFile({file: 'data/temp/57772a58475eab182229d8b329c3cad3', ctype: 'image/jpeg', name: 'image.jpg'});

  });

  app.route('/log', function(req, res) {
    var fs = require('fs');
    fs.log('test');
    res.end('done');
  });

  app.route('/cookie/:name/:value', function(req, res, name, value) {
    res.cookies(name, value);
    res.end('set cookie: ' + name);
  });

  app.route('/cookies', function(req, res) {
    res.die(req.cookies());
  });

  app.route('/liquid', function(req, res) {
    var Liquid = require('liquid');
    var render = function(src, ctx) {
      return Liquid.parse(src).renderWithErrors(ctx);
    };
    var markup = render("<p>{{user | capitalize}}</p>", {user: 'bob'});
    res.die('text/plain', markup);
  });

  app.route('/throw', function(req, res) {
    var err = this.a.b;
  });

});