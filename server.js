/*global process, require, module, exports */
(function() {
  var fs = require('fs');
  var path = require('path');
  var http = require('http');
  var child_process = require('child_process');

  var args = process.argv;

  //this is used by modules reading relative paths
  var basePath = global.basePath = path.dirname(args[1]);

  if (args[2] == 'keepalive') {
    spawnChild();
  } else {
    startServer();
  }

  function spawnChild() {
    var child = child_process.fork(args[1], args.slice(3));
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
  }

})();