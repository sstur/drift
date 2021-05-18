var http = require('http');

var opts = global.opts || (global.opts = {});
opts.fxPath = __dirname;

function startServer(opts, callback) {
  var port = opts.port || 8080;
  var address = opts.address || '127.0.0.1';
  var server = http.createServer();

  server.on('listening', function() {
    if (callback) callback.apply(this, arguments);
  });

  server.on('request', getRequestHandler());

  server.on('error', function(e) {
    if (e.code === 'EADDRINUSE') {
      port++;
      server.listen(port, address);
    } else {
      throw e;
    }
  });

  server.listen(port, address);

  return server;
}

function getRequestHandler() {
  var SyncServer = require('./src/server.js');
  return SyncServer.requestHandler;
}

exports.startServer = startServer;
exports.getRequestHandler = getRequestHandler;
