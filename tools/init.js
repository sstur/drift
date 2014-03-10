var path = require('path');
var shell = require('shelljs');

var opts = global.opts || {};
var args = opts._ || process.argv.slice(2);

var thisPath = path.join(__dirname, '.');
var basePath = path.join(thisPath, '..');
var destPath = path.join('/', opts.p, '.') || process.cwd();

shell.mkdir('-p', destPath + '/app/config');
shell.cp(thisPath + '/assets/config.js.txt', destPath + '/app/config/config.js');
shell.mkdir('-p', destPath + '/app/controllers');
shell.cp(thisPath + '/assets/controller.js.txt', destPath + '/app/controllers/main.js');
shell.mkdir('-p', destPath + '/app/init');
shell.mkdir('-p', destPath + '/app/lib');
shell.mkdir('-p', destPath + '/app/models');
shell.ln('-s', basePath + '/app/system', destPath + '/app/system');
shell.mkdir('-p', destPath + '/data/logs');
shell.mkdir('-p', destPath + '/data/sessions');
shell.mkdir('-p', destPath + '/data/temp');
shell.mkdir('-p', destPath + '/views');
shell.cp(thisPath + '/assets/layout.html', destPath + '/views/');
shell.mkdir('-p', destPath + '/build');
shell.cp(basePath + '/build/.htaccess', destPath + '/');
shell.cp(basePath + '/build/httpd.ini', destPath + '/');
shell.cp(basePath + '/build/web.config', destPath + '/');
shell.cp(thisPath + '/assets/build-conf.json.txt', destPath + '/build-conf.json');
shell.cp(thisPath + '/assets/package.json.txt', destPath + '/package.json');
