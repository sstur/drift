var http = require('http');
var WSHServer = require('./node-wsh');

var server = http.createServer(WSHServer.requestHandler);
server.listen(8080, function() {
  console.log('Server running at http://localhost:8080/');
});
