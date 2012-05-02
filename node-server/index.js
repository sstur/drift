/*global app, define */
(function() {
  "use strict";

  //patch some built-in methods
  require('./support/patch');

  var fs = require('fs')
    , join = require('path').join
    , Fiber = require('sync-fiber');

  var Request = require('./lib/request.js');
  var Response = require('./lib/response.js');

  //set paths as global variables
  var basePath = global.basePath = join(__dirname, '..');
  console.log('basePath', basePath);
  var mappath = global.mappath = function(path) {
    return join(basePath, path);
  };

  //helpers for app and framework
  var loadPath = function(dir) {
    var path = join(basePath, dir);
    var files = fs.readdirSync(path);
    files.forEach(function(file) {
      if (file.charAt(0) == '_') return;
      var fullpath = join(path, file)
        , stat = fs.statSync(fullpath);
      if (stat.isDirectory()) {
        loadPath(fullpath);
      } else
      if (stat.isFile() && file.match(/\.js$/i)) {
        console.log('load module', file);
        require(fullpath);
      }
    });
  };

  //load framework core (instantiates `app` and `define`)
  require(join(basePath, 'app/system/core'));

  //load sync modules
  loadPath('node-server/sync_modules');

  //load framework modules
  loadPath('app/system/lib');
  loadPath('app/routes');

  //this function only runs within a fiber
  var syncHandler = function(http) {
    var req = new Request(http.req)
      , res = new Response(http.res);
    var pathname = req.getURLParts().path;
    //debugging: ignore favicon request
    if (pathname.match(/\/favicon\.ico$/i)) {
      res.status('404 Favicon Disabled');
      res.end();
    }
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
    //attempt to serve static file
    res.tryStaticPath('assets/', function() {
      console.log('fibers created: ' + Fiber.fibersCreated);
      var fiber = Fiber(syncHandler);
      fiber.onError = res.sendError.bind(res);
      fiber.run({req: req, res: res});
    });
  };

})();