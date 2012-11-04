 /*global global, require, app */
(function() {
  "use strict";

  //patch some built-in methods
  require('./support/patch');

  var fs = require('fs')
    , join = require('path').join
    , Fiber = require('./lib/fiber');

  //set paths as global variables
  var basePath = global.basePath || join(__dirname, '..');

  //mappath must be global to be used inside modules
  var mappath = global.mappath = function(path) {
    return join(basePath, path);
  };

  //framework files beginning with these chars are excluded
  var EXCLUDE = {'_': 1, '.': 1, '!': 1};

  //helper for loading framework files
  var loadPathSync = function(dir, callback) {
    var path = join(basePath, dir);
    var files = fs.readdirSync(path);
    files.forEach(function(file) {
      if (file.charAt(0) in EXCLUDE) return;
      var fullpath = join(path, file)
        , stat = fs.statSync(fullpath);
      if (stat.isDirectory()) {
        loadPathSync(join(dir, file));
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

  //load framework core (instantiates `app`)
  require(join(basePath, 'app/system/core'));
  app.mappath = mappath;

  //global object to hold some adapter stuff
  var adapter = global.adapter = {};

  //like app.define but fiberizes async methods upon instantiation
  adapter.define = function(name, definition) {
    app.define(name, function() {
      definition.apply(this, arguments);
      this.exports = Fiber.fiberizeModule(this.exports);
    });
  };

  //load node adapter modules
  loadPathSync('node-server/adapters');

  //load framework modules
  loadPathSync('app/system/lib');
  loadPathSync('app/config');
  loadPathSync('app/controllers');
  loadPathSync('app/helpers');

  //all modules loaded
  app.emit('ready', app.require);

  //this function only runs within a fiber
  var syncHandler = function(http) {
    var Request = app.require('adapter-request');
    var Response = app.require('adapter-response');
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

  exports.requestHandler = function(req, res) {
    console.log(req.allHeaders);
    //cross-reference request and response
    req.res = res;
    res.req = req;
    //debugging: ignore favicon request
    if (req.url.toLowerCase() == '/favicon.ico') {
      res.writeHead(404);
      res.end();
      return;
    }
    //attempt to serve static file
    res.tryStaticPath('assets/', function() {
      console.log('fibers created: ' + Fiber.fibersCreated);
      var fiber = Fiber(syncHandler);
      fiber.onError = res.sendError.bind(res);
      fiber.run({req: req, res: res});
    });
  };

})();