/*global global, process, require, exports, module */
(function() {
  var fs = require('fs');
  var path = require('path');
  var http = require('http');
  var util = require('util');
  var childProcess = require('child_process');
  var EventEmitter = require('events').EventEmitter;

  var opts = global.opts || (global.opts = {});
  opts.fxPath = path.join(module.filename, '../..');

  //if required as a module, set the framework path and exit
  if (!opts.cli) {
    exports.startServer = startServer;
    return;
  }

  var utils = require('drift-server/support/utils');
  var optimist = require('optimist');

  var RELAUNCH_MINIMUM_MS = 3000;

  //this is used to compute relative paths
  var basePath = opts.path;
  //reference to child process if applicable
  var child;
  //used to enforce a minimum time between restarting child process
  var lastChildLaunch;

  if (process.env.IS_CHILD) {
    var serverOpts = {
      port: 8080,
      address: '127.0.0.1',
      autoIncrement: true
    };
    startServer(serverOpts, function() {
      var listen = this.address();
      var address = (listen.address === '127.0.0.1' || listen.address === '0.0.0.0') ? 'localhost' : listen.address;
      var url = 'http://' + address + ':' + listen.port + '/';
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

  function startServer(opts, callback) {
    var SyncServer = require('drift-server');

    var port = opts.port || 8080;
    var address = opts.address || '127.0.0.1';
    var server = http.createServer();

    server.on('listening', function() {
      if (callback) callback.apply(this, arguments);
    });

    server.on('request', SyncServer.requestHandler);

    if (opts.autoIncrement) {
      server.on('error', function(e) {
        if (e.code === 'EADDRINUSE') {
          port++;
          server.listen(port, address);
        } else {
          throw e;
        }
      });
    }

    server.listen(port, address);

    return server;
  }

})();