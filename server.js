var http = require('http');
var utils = require('./node-sync/support/utils');
var SyncServer = require('./node-sync');

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
