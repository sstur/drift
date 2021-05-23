'use strict';
const fs = require('fs');
const { join } = require('path');
const hook = require('node-hook');
const { transformSourceFile } = require('./utils');

//framework files beginning with these chars are excluded
const EXCLUDE_FILES = { _: 1, '.': 1, '!': 1 }; // eslint-disable-line quote-props

//this is the project path; used in tryStaticPath, app.mappath and loadPathSync
const basePath = process.cwd();

//patch some built-in methods
require('./support/patch');

const Fiber = require('./lib/fiber');

//patch `require()` to handle source transformation based on babel.
hook.hook('.js', (source, filename) => {
  return transformSourceFile(source, filename);
});
hook.hook('.ts', (source, filename) => {
  return transformSourceFile(source, filename);
});

//load framework core (instantiates `app`)
require('./core.js');

app.mappath = join.bind(null, basePath);

//like app.define but fiberizes async methods upon instantiation
app.defineAsync = (name, definition) => {
  app.define(name, function() {
    definition.apply(this, arguments);
    Fiber.fiberizeModule(this.exports);
  });
};

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

const AdapterRequest = app.require('adapter-request');
const AdapterResponse = app.require('adapter-response');

//this function only runs within a fiber
function syncHandler(http) {
  let req = new AdapterRequest(http.req);
  let res = new AdapterResponse(http.res);
  //cross-reference adapter-request and adapter-response
  req.res = res;
  res.req = req;
  // sleep(1); //for debugging
  app.route(req, res);
  throw new Error('Router returned without handling request.');
}

//for debugging
// var sleep = function(ms) {
//   var fiber = Fiber.current;
//   setTimeout(function() {
//     fiber.run();
//   }, ms);
//   Fiber.yield();
// };

exports.requestHandler = (req, res) => {
  //cross-reference request and response
  req.res = res;
  res.req = req;
  //attempt to serve static file
  let staticPaths = ['/assets/'];
  res.tryStaticPath(basePath, staticPaths, () => {
    let fiber = new Fiber(syncHandler);
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
