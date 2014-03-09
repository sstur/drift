/*global process, global, require, exports, module */
var path = require('path');

var opts = require('optimist')
  .usage('Usage: $0 init|build|serve -p [path]')
  .alias('p', 'path')
  .default('p', process.cwd())
  .argv;

var DIRECTIVES = {
  init: 1,
  build: 1,
  serve: 1
};

var args = opts._;
var directive = args.shift();
if (!(directive in DIRECTIVES)) {
  console.error('You must specify one of the following directives: ' + Object.keys(DIRECTIVES).join(', '));
  process.exit(1);
}

global.opts = opts;

if (directive == 'init') {
  //require('./init.js');
  console.error('not implemented');
} else
if (directive == 'build') {
  require('./build.js');
} else
if (directive == 'serve') {
  require('./server.js');
}
