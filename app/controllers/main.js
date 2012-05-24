/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var Buffer = require('buffer').Buffer;

  app.route('/', function(req, res) {
    res.end('Hello world!');
  });

  app.route('/get', function(req, res) {
    var http = require('http');
    var response = http.get('http://www.google.com/');
    res.debug(response);
  });

//  app.route('/form-post', function(req, res) {
//    var headers = req.headers();
//    for (var n in headers) {
//      res.write(n + ': ' + headers[n] + '\r\n');
//    }
//    res.write('\r\n');
//    var len = +headers['content-length'] || 0;
//    var buffer = req.req.read(len);
//    var text = buffer.toString('binary');
//    text = JSON.stringify(text).slice(1, -1).replace(/\\"/g, '"');
//    res.end(text);
//  });

  app.route('/form-post', function(req, res) {
    res.debug({fields: req.post(), files: req.uploads()});
  });

  app.route('/md5', function(req, res) {
    var md5 = require('md5').create();
    md5.update('4749463839610100010080FF00C0C0C000000021F9', 'hex');
    md5.update('0401000000002C00000000010001000002024401003B', 'hex');
    var hash = md5.digest('hex');
    res.end(hash);
  });

  app.route('/buffer', function(req, res) {
    var buffer = new Buffer('4749463839610100010080FF00C0C0C000000021F90401000000002C00000000010001000002024401003B', 'hex');
    res.end('image/gif', buffer);
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

  app.route('/writefile', function(req, res) {
    var data = new Buffer('4749463839610100010080FF00C0C0C000000021F90401000000002C00000000010001000002024401003B', 'hex');
    fs.writeFile('image.gif', data);
    res.end('success');
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
    res.end(req.cookies());
  });

  app.route('/liquid', function(req, res) {
    var Liquid = require('liquid');
    var render = function(src, ctx) {
      return Liquid.parse(src).renderWithErrors(ctx);
    };
    var markup = render("<p>{{user | capitalize}}</p>", {user: 'bob'});
    res.end('text/plain', markup);
  });

  app.route('/throw', function(req, res) {
    var err = this.a.b;
  });

});