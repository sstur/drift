/*global global, process, require, exports, module */
(function() {
  var fs = require('fs');
  var path = require('path');
  var http = require('http');
  var childProcess = require('child_process');

  var args = process.argv;

  //this is used to compute relative paths
  var basePath = global.basePath || process.cwd();

  if (args[2] == 'keepalive') {
    spawnChild();
  } else {
    startServer();
  }

  function spawnChild() {
    var child = childProcess.fork(args[1], args.slice(3));
    var pidFile = path.join(basePath, 'server.pid');
    fs.writeFile(pidFile, child.pid, function() {
      console.log('Spawned child process ' + child.pid);
      child.on('exit', function() {
        spawnChild();
      });
    });
    child.disconnect();
  }

  function startServer() {
    var utils = require('./node-server/support/utils');
    var SyncServer = require('./node-server');

    var port = 8080;
    var server = http.createServer();

    server.on('listening', function() {
      var url = 'http://localhost:' + port + '/';
      console.log('Server running at ' + url);
      utils.handleKeypress(process.stdin, function(key) {
        if (key.ctrl && key.name == 'l') {
          console.log('Launching ' + url);
          utils.open(url);
        }
      });
      console.log('Press Ctrl+L to launch in browser');
    });

    server.on('request', SyncServer.requestHandler);

    server.on('error', function(e) {
      if (e.code === 'EADDRINUSE') {
        port++;
        server.listen(port);
      } else {
        throw e;
      }
    });

    server.listen(port);
  }

})();