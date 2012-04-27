var http = require('http');
var SyncServer = require('sync-server');

var server = http.createServer(SyncServer.requestHandler);
server.listen(8080, function() {
  console.log('Server running at http://localhost:8080/');
});
