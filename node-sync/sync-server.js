/*global app */
(function() {
  "use strict";

  //patch some built-in methods
  require('./support/patch');

  var fs = require('fs')
    , join = require('path').join
    , Fiber = require('./lib/sync-fiber')
    , RequestBody = require('./lib/request_body');

  var Request = require('./lib/request.js');
  var Response = require('./lib/response.js');

  //set paths as global variables
  var basePath = global.basePath = join(__dirname, '..');
  //should mappath be global?
  var mappath = global.mappath = function(path) {
    return join(basePath, path);
  };

  //helpers for app and framework
  var loadPath = function(dir, callback) {
    var path = join(basePath, dir);
    var files = fs.readdirSync(path);
    files.forEach(function(file) {
      if (file.charAt(0) == '_') return;
      var fullpath = join(path, file)
        , stat = fs.statSync(fullpath);
      if (stat.isDirectory()) {
        loadPath(join(dir, file));
      } else
      if (stat.isFile() && file.match(/\.js$/i)) {
        console.log('load file', join(dir, file));
        var module = require(fullpath);
        if (callback) {
          callback(file, module);
        }
      }
    });
  };

  //load framework core (instantiates `app` and `define`)
  require(join(basePath, 'app/system/core'));

  //load async modules into define system as sync
  loadPath('node-sync/async_modules', function(file, _super) {
    var name = file.replace(/\.js$/, '');
    define(name, function(require, exports, module) {
      module.exports = Fiber.makeSync(_super);
    });
  });

  //load sync modules
  loadPath('node-sync/sync_modules');

  //load framework modules
  loadPath('app/system/lib');
  loadPath('app/controllers');

  //all modules loaded
  app.emit('ready', app.require);

  //this function only runs within a fiber
  var syncHandler = function(http) {
    var req = new Request(http.req)
      , res = new Response(http.res);
    sleep(100); //for debugging
    app.route(req, res);
    throw new Error('Router returned without handling request.');
  };

  //for debugging
  var sleep = function(ms) {
  	var fiber = Fiber.current;
  	setTimeout(function() {
  		fiber.run();
  	}, ms);
    Fiber.yield();
  };

  exports.requestHandler = function (req, res) {
    //cross-reference request and response
    req.res = res;
    res.req = req;
    //debugging: ignore favicon request
    if (req.url.match(/\/favicon\.ico$/i)) {
      res.writeHead(404);
      res.end();
      return;
    }
    //instantiate request body parser
    req.body = new RequestBody(req, res);
    //attempt to serve static file
    res.tryStaticPath('assets/', function() {
      console.log('fibers created: ' + Fiber.fibersCreated);
      var fiber = Fiber(syncHandler);
      fiber.onError = res.sendError.bind(res);
      fiber.run({req: req, res: res});
    });
  };

})();