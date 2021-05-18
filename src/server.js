'use strict';
var fs = require('fs');
var path = require('path');
var hook = require('node-hook');
var utils = require('./utils');

var join = path.join;

//framework files beginning with these chars are excluded
var EXCLUDE_FILES = { _: 1, '.': 1, '!': 1 }; // eslint-disable-line quote-props

//this is the project path; used in patch and app.mappath
var basePath = (global.basePath = process.cwd());

var pkgConfig = require('./package-config.js');

//patch some built-in methods
require('./support/patch');

var Fiber = require('./lib/fiber');

//patch `require()` to handle source transformation based on babel.
hook.hook('.js', function(source, filename) {
  return utils.transformSourceFile(source, filename, {
    pkgConfig: pkgConfig,
  });
});
hook.hook('.ts', function(source, filename) {
  return utils.transformSourceFile(source, filename, {
    pkgConfig: pkgConfig,
  });
});

//load framework core (instantiates `app`)
require('./core.js');

app.mappath = join.bind(null, basePath);

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
var adapter = (global.adapter = {});

//like app.define but fiberizes async methods upon instantiation
adapter.define = function(name, definition) {
  app.define(name, function() {
    definition.apply(this, arguments);
    Fiber.fiberizeModule(this.exports);
  });
};

//load config
loadPathSync('./config');
loadPathSync('app/config');
loadPathSync('src/config');
//load node adapter modules
loadPathSync('./adapters');

//load framework modules
loadPathSync('./system');
loadPathSync('app/models');
loadPathSync('src/models');
loadPathSync('app/init');
loadPathSync('src/init');
loadPathSync('app/lib');
loadPathSync('src/lib');
loadPathSync('app/controllers');
loadPathSync('src/controllers');

//all modules loaded
app.emit('init', app.require);
app.emit('ready', app.require);

var AdapterRequest = app.require('adapter-request');
var AdapterResponse = app.require('adapter-response');

//this function only runs within a fiber
var syncHandler = function(http) {
  var req = new AdapterRequest(http.req);
  var res = new AdapterResponse(http.res);
  //cross-reference adapter-request and adapter-response
  req.res = res;
  res.req = req;
  // sleep(1); //for debugging
  app.route(req, res);
  throw new Error('Router returned without handling request.');
};

//for debugging
// var sleep = function(ms) {
//   var fiber = Fiber.current;
//   setTimeout(function() {
//     fiber.run();
//   }, ms);
//   Fiber.yield();
// };

exports.requestHandler = function(req, res) {
  //cross-reference request and response
  req.res = res;
  res.req = req;
  //attempt to serve static file
  var staticPaths = pkgConfig.static_assets || '/assets/';
  res.tryStaticPath(staticPaths, function() {
    var fiber = new Fiber(syncHandler);
    fiber.onError = res.sendError.bind(res);
    fiber.run({ req: req, res: res });
  });
};

//helper for loading framework files
function loadPathSync(dir) {
  //note: kinda hacky
  var isSystem = dir.charAt(0) === '.';
  var srcPath = isSystem ? __dirname : basePath;
  var path = join(srcPath, dir);
  try {
    var files = fs.readdirSync(path);
  } catch (e) {
    // console.log('not found', path);
    return;
  }
  files.forEach(function(file) {
    if (file.charAt(0) in EXCLUDE_FILES) return;
    var fullpath = join(path, file);
    var stat = fs.statSync(fullpath);
    if (stat.isDirectory()) {
      loadPathSync(join(dir, file));
    } else if (stat.isFile() && file.match(/\.(js|ts)$/i)) {
      console.log('load file', join(dir, file));
      require(join(srcPath, dir, file));
    }
  });
}
