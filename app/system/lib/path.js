/*global app, define */
define('path', function(require, exports) {
  "use strict";

  var RE_HEAD = /^(.*)\//;
  var RE_TAIL = /\/([^\/]*)$/;
  var RE_SLASHES = /\/+/g;
  var RE_DOTSLASH = /\/.\//g;
  var RE_DOTDOTSLASH = /[^\/]+\/\.\.\//g;
  var RE_TRAILING_SLASH = /\/$/;

  var slice = Array.prototype.slice;

  /*
   * Join one or more paths using forward-slash
   * path.join('assets/', 'scripts', 'file.js')
   */
  exports.join = function() {
    var a = [], args = slice.call(arguments);
    args.forEach(function(s, i) {
      if (s) a.push(s);
    });
    return exports.normalize(a.join('/'));
  };

  /*
   * Normalize a path removing '../', '//', etc
   */
  exports.normalize = function(path) {
    path = path.replace(RE_SLASHES, '/');
    path = path.replace(RE_DOTSLASH, '/');
    path = path.replace(RE_DOTDOTSLASH, '');
    path = path.replace(RE_TRAILING_SLASH, '');
    return path;
  };

  /*
   * Get the directory part of a path
   * /data/file.txt -> /data/
   */
  exports.dirname = function(path) {
    return path.replace(RE_TAIL, '');
  };

  /*
   * Get the file part of a path
   * /data/file.txt -> file.txt
   */
  exports.basename = function(path) {
    return path.replace(RE_HEAD, '');
  };

});