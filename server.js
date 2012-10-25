var path = require('path');
var http = require('http');

//this is used by the modules below
global.basePath = path.dirname(process.argv[1]);

var utils = require('./node-server/support/utils');
var SyncServer = require('./node-server');

var server = http.createServer(SyncServer.requestHandler);

server.listen(8080, function() {
  var url = 'http://localhost:8080/';
  console.log('Server running at ' + url);

  utils.handleKeypress(process.stdin, function(key) {
    if (key.ctrl && key.name == 'l') {
      console.log('Launching ' + url);
      utils.open(url);
    }
  });
  console.log('Press Ctrl+L to launch in browser');

});
