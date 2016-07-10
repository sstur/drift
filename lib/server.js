/*global global, process, require, exports, module */
(function() {
  var fs = require('fs');
  var path = require('path');
  var http = require('http');
  var EventEmitter = require('events').EventEmitter;

  var utils = require('../modules/drift-server/support/utils');
  var Launcher = require('./launcher');

  var RELAUNCH_MINIMUM_MS = 3000;

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
      process.on('SIGHUP', function() {
        //prevent RELAUNCH_MINIMUM restriction for manual exit
        launcher.resetTimer();
        launcher.kill();
      });
      process.on('exit', function() {
        launcher.kill();
        fs.unlinkSync(pidFile);
      });
      var keyEmitter = utils.getKeypressEmitter(process.stdin);
      keyEmitter.on('ctrl:r', function() {
        //prevent RELAUNCH_MINIMUM restriction for manual exit
        launcher.resetTimer();
        launcher.kill();
      });
      keyEmitter.on('ctrl:l', function() {
        launcher.send({command: 'launch'});
      });
      var launcher = new Launcher({
        args: process.argv.slice(1),
        execPath: process.execPath,
        relaunchMinimum: RELAUNCH_MINIMUM_MS
      });
      launcher.on('premature-exit', function(timeSinceLastLaunch) {
        console.log('Child process exited in ' + timeSinceLastLaunch + 'ms.');
        process.exit(1);
      });
      launcher.launch();
    }
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
    var SyncServer = require('../modules/drift-server/server.js');
    return SyncServer.requestHandler;
  }

})();
