 /*global global, process, require, app */
(function() {
  "use strict";

  //patch some built-in methods
  require('./support/patch');

  var fs = require('fs');
  var join = require('path').join;
  var Fiber = require('./lib/fiber');

  var pkgConfig = require('../../package.json');

  //framework files beginning with these chars are excluded
  var EXCLUDE_FILES = {'_': 1, '.': 1, '!': 1};

  //used in modules and app.mappath
  //todo: differentiate projectPath from fxPath from modulePath
  var basePath = global.basePath || process.cwd();

  global.platform = 'node';

  //load framework core (instantiates `app`)
  require(join(basePath, 'app/system/core'));

  app.mappath = global.mappath = mappath;
  app.transformConfig = function(path, value) {
    if (typeof value !== 'string') return value;
    return value.replace(/\{\{package:(.*?)\}\}/g, function(str, key) {
      return (pkgConfig[key] == null) ? '' : pkgConfig[key];
    });
  };

  //in-memory application data
  var data = {};
  app.data = function(n, val) {
    if (arguments.length == 2) {
      if (val == null) {
        delete data[n];
      } else {
        data[n] = val;
      }
    } else {
      val = data[n];
    }
    return val;
  };

  //global object to hold some adapter stuff
  var adapter = global.adapter = {};

  //like app.define but fiberizes async methods upon instantiation
  adapter.define = function(name, definition) {
    app.define(name, function() {
      definition.apply(this, arguments);
      Fiber.fiberizeModule(this.exports);
    });
  };

  //load config
  loadPathSync('app/system/config');
  loadPathSync('app/config');
  //load node adapter modules
  //todo: use serverPath
  loadPathSync('tools/node-server/adapters');

  //load framework modules
  loadPathSync('app/system/init');
  loadPathSync('app/system/lib');
  loadPathSync('app/helpers');
  loadPathSync('app/models');
  loadPathSync('app/init');
  loadPathSync('app/lib');
  loadPathSync('app/test');
  loadPathSync('app/controllers');
  loadPathSync('app/system/test');

  //all modules loaded
  app.emit('init', app.require);
  app.emit('ready', app.require);

  //this function only runs within a fiber
  var syncHandler = function(http) {
    var Request = app.require('adapter-request');
    var Response = app.require('adapter-response');
    var req = new Request(http.req);
    var res = new Response(http.res);
    sleep(1); //for debugging
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
    //cross-reference request and response
    req.res = res;
    res.req = req;
    //attempt to serve static file
    res.tryStaticPath('assets/', function() {
      var fiber = new Fiber(syncHandler);
      fiber.onError = res.sendError.bind(res);
      fiber.run({req: req, res: res});
    });
  };


  //helpers

  function mappath(path) {
    return join(basePath, path);
  }

  //helper for loading framework files
  function loadPathSync(dir, callback) {
    var path = join(basePath, dir);
    try {
      var files = fs.readdirSync(path);
    } catch(e) {
      console.log('not found', path);
      return;
    }
    files.forEach(function(file) {
      if (file.charAt(0) in EXCLUDE_FILES) return;
      var fullpath = join(path, file);
      var stat = fs.statSync(fullpath);
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
  }

})();