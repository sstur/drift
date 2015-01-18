/*global global, process, require, exports, module */
(function() {
  var fs = require('fs');
  var path = require('path');
  var http = require('http');
  var util = require('util');
  var childProcess = require('child_process');
  var EventEmitter = require('events').EventEmitter;

  var utils = require('./node-server/support/utils');
  var optimist = require('optimist');

  var RELAUNCH_MINIMUM_MS = 3000;

  var opts = global.opts;
  if (!opts) {
    opts = global.opts = optimist
      .usage('Usage: $0 serve -p [path]')
      .alias('p', 'path')
      .default('p', process.cwd())
      .argv;
  }

  //this is used to compute relative paths
  var basePath = opts.path;
  //reference to child process if applicable
  var child;
  //used to enforce a minimum time between restarting child process
  var lastChildLaunch;

  if (process.env.IS_CHILD) {
    startServer();
    return;
  }

  //save pid so external process can send SIGHUP to restart server
  var pidFile = path.join(basePath, 'server.pid');
  fs.writeFileSync(pidFile, process.pid);
  process.on('SIGHUP', function() {
    //prevent RELAUNCH_MINIMUM restriction for manual exit
    lastChildLaunch = null;
    if (child) child.kill();
  });
  process.on('exit', function(code) {
    if (child) child.kill();
    fs.unlinkSync(pidFile);
  });
  var keyEmitter = utils.getKeypressEmitter(process.stdin);
  keyEmitter.on('ctrl:r', function() {
    //prevent RELAUNCH_MINIMUM restriction for manual exit
    lastChildLaunch = null;
    if (child) child.kill();
  });
  keyEmitter.on('ctrl:l', function() {
    if (child) child.send({command: 'launch'});
  });
  spawnChild();

  function spawnChild() {
    var args = process.argv.slice(1);
    var childOpts = {
      env: {IS_CHILD: 1},
      stdio: ['ignore', process.stdout, process.stderr, 'ipc']
    };
    child = childProcess.spawn(process.execPath, args, childOpts);
    child.on('exit', function(code, signal) {
      if (lastChildLaunch && Date.now() - lastChildLaunch < RELAUNCH_MINIMUM_MS) {
        console.log('Child process exited in less than ' + RELAUNCH_MINIMUM_MS + 'ms');
        process.exit(1);
      }
      spawnChild();
    });
    lastChildLaunch = Date.now();
  }

  function startServer() {
    var commandEmitter = new EventEmitter();
    process.on('message', function(data) {
      if (data == null || !data.command) return;
      commandEmitter.emit(data.command, data.params);
    });
    var SyncServer = require('./node-server');

    var port = 8080;
    var server = http.createServer();

    server.on('listening', function() {
      var url = 'http://localhost:' + port + '/';
      console.log('Server running at ' + url);
      console.log('Press Ctrl+L to launch in browser');
      console.log('Press Ctrl+R to restart server');
      commandEmitter.on('launch', function() {
        utils.open(url);
      });
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