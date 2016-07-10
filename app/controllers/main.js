/** @es6 */
/*global app */
app.on('ready', () => {
  'use strict';

  app.route('/', (req, res) => {
    res.end('Hello World');
  });

  app.route('/favicon.ico', (req, res) => {
    res.sendFile('assets/favicon.ico');
  });

  app.route('/version', (req, res) => {
    res.end('Application version: ' + app.cfg('version'));
  });

  //app.route('/test-get-redir', (req, res) => {
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

  //app.route('/test-get', (req, res) => {
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

});
