/*global global, process, require, exports, module */
(function() {
  var fs = require('fs');
  var path = require('path');
  var http = require('http');
  var util = require('util');
  var childProcess = require('child_process');
  var EventEmitter = require('events').EventEmitter;

  var utils = require('drift-server/support/utils');
  var optimist = require('optimist');

  var RELAUNCH_MINIMUM_MS = 3000;
  //reference to child process if applicable
  var child;

  var opts = global.opts || (global.opts = {});
  opts.fxPath = path.join(module.filename, '../..');

  if (opts.cli) {
    startDevServer();
  } else {
    exports.startServer = startServer;
    exports.getRequestHandler = getRequestHandler;
  }


  function startDevServer() {
    if (process.env.IS_CHILD) {
      startServer({}, function() {
        var bind = this.address();
        var host = bind.address;
        if (host === '127.0.0.1' || host === '0.0.0.0') {
          host = 'localhost';
        }
        var url = 'http://' + host + ':' + bind.port + '/';
        console.log('Server running at ' + url);
        console.log('Press Ctrl+L to launch in browser');
        console.log('Press Ctrl+R to restart server');
        var commandEmitter = new EventEmitter();
        process.on('message', function(data) {
          if (data == null || !data.command) return;
          commandEmitter.emit(data.command, data.params);
        });
        commandEmitter.on('launch', function() {
          utils.open(url);
        });
      });
    } else {
      //save pid so external process can send SIGHUP to restart server
      var pidFile = path.join(process.cwd(), 'server.pid');
      fs.writeFileSync(pidFile, process.pid);
      spawnChild();
    }
  }


  function spawnChild() {
    var args = process.argv.slice(1);
    var childOpts = {
      env: {IS_CHILD: 1},
      stdio: ['ignore', process.stdout, process.stderr, 'ipc']
    };
    var lastChildLaunch = child ? child.launchedAt : null;
    child = childProcess.spawn(process.execPath, args, childOpts);
    //used to enforce a minimum time between restarting child process
    child.launchedAt = Date.now();
    child.on('exit', function(code, signal) {
      if (lastChildLaunch && child.launchedAt - lastChildLaunch < RELAUNCH_MINIMUM_MS) {
        console.log('Child process exited in less than ' + RELAUNCH_MINIMUM_MS + 'ms');
        process.exit(1);
      }
      spawnChild();
    });
  }

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
    var SyncServer = require('drift-server');
    return SyncServer.requestHandler;
  }

})();