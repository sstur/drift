/*global app, define */
app.on('ready', function(require) {
  "use strict";


  var fs = require('fs');
  var util = require('util');

  app.route('/', function(req, res) {
    res.end('Hello World');
  });

  app.route('/favicon.ico', function(req, res) {
    res.sendFile('assets/favicon.ico');
  });

  //app.route('/redir/:i?', function(req, res, i) {
  //  var count = (+i || 0) + 1;
  //  util.log('redirecting ' + count);
  //  //redirect 3 times (two intermediary and one final)
  //  res.redirect((count < 3) ? '../redir/' + count : '/dump');
  //});

  //app.route('/dump', function(req, res) {
  //  var data = {method: req.method(), url: req.url(), headers: req.headers()};
  //  res.debug(data);
  //});

  //app.route('/:one/:two', function(req, res) {
  //  res.end({params: this.params, args: Array.prototype.slice.call(arguments, 2)});
  //});

  //app.route('/test-get-redir', function(req, res) {
  //  var http = require('http'), host = req.headers('host');
  //  var response = http.get({
  //    url: 'http://' + host + '/redir',
  //    maxRedirects: 4,
  //    headers: {'Authorization': 'Basic dXI6djBc3N0uMWIw'}
  //  });
  //  res.write(response.status + '\r\n');
  //  res.write(util.inspect(response.headers, false, 4) + '\r\n\r\n');
  //  res.write(response.body.toString('utf8'));
  //  res.end();
  //});

  //app.route('/test-get', function(req, res) {
  //  var http = require('http'), host = req.headers('host');
  //  var response = http.get({
  //    url: 'http://' + host + '/dump',
  //    headers: {'Authorization': 'Basic dXI6djBc3N0uMWIw'}
  //  });
  //  res.write(response.status + '\r\n');
  //  res.write(util.inspect(response.headers, false, 4) + '\r\n\r\n');
  //  res.write(response.body.toString('utf8'));
  //  res.end();
  //});

  //app.route('/get', function(req, res) {
  //  var http = require('http');
  //  var response = http.get({
  //    url: 'https://www.google.com/',
  //    headers: {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_4) AppleWebKit/536.5 (KHTML, like Gecko) Chrome/19.0.1084.54 Safari/536.5'}
  //  });
  //  res.end(response.body.toString('utf8'));
  //});

  //app.route('/buffer', function(req, res) {
  //  var buffer = new Buffer('4749463839610100010080FF00C0C0C000000021F90401000000002C00000000010001000002024401003B', 'hex');
  //  res.end('image/gif', buffer);
  //});

  //app.route('/readfile', function(req, res) {
  //  var fs = require('fs');
  //  var text = fs.readTextFile('assets/test.txt');
  //  res.end(text);
  //});

  //app.route('/writefile', function(req, res) {
  //  var data = new Buffer('4749463839610100010080FF00C0C0C000000021F90401000000002C00000000010001000002024401003B', 'hex');
  //  fs.writeFile('image.gif', data);
  //  res.end('success');
  //});

  //app.route('/sendfile', function(req, res) {
  //  res.sendFile({file: 'data/temp/57772a58475eab182229d8b329c3cad3', contentType: 'image/jpeg', filename: 'image.jpg'});

  //});

  //app.route('/log', function(req, res) {
  //  var fs = require('fs');
  //  util.log('test');
  //  res.end('done');
  //});

  //app.route('/cc', function(req, res) {
  //  res.write('is' /*@remove{*/ + ' not' /*}@*/ + ' compiled\n');
  //  res.end('is' /*@add{ + ' not' }@*/ + ' dev');
  //});

  //app.route('/db-test', function(req, res) {
  //  var localdb = require('localdb');
  //  var db = localdb.open('test');
  //  try {
  //    db.createTable('test', {name: ['TEXT', 'NOT NULL']});
  //  } catch(e) {
  //    if (e.message.indexOf('already exists') < 0) throw e;
  //  }
  //  console.log('created table');
  //  db.insert('test', {name: new Date().toJSON()});
  //  console.log('inserted record');
  //  var result = db.fetchAll('select * from test');
  //  console.log('finished query');
  //  res.die(result);
  //});

});