/*global app, define */
app.on('ready', function(require) {

  var fs = require('fs')
    , util = require('util')
    , Liquid = require('liquid')
    , Response = require('response');

  var defaults = app.cfg('template_defaults') || {};

  //var cache = {};
  var REG_TAG = /\{%\s*(?:assign)\s+(.*?)\s*%\}/;
  var REG_EXPR = /((?:\(?[\w\-\.\[\]]\)?)+)\s*=\s*((?:"[^"]+"|'[^']+')+)/;

  Liquid.readTemplateFile = function(path) {
    if (path.indexOf('.') < 0) path += '.liquid';
    if (path.charAt(0) != '/' && path.indexOf('views/') != 0) {
      path = 'views/' +  path;
    }
    return fs.readTextFile(path);
  };

  Liquid.getParentLayout = function(source) {
    var parent;
    source.replace(REG_TAG, function(_, $1) {
      var m = REG_EXPR.exec($1);
      if (m && m[1] == 'layout') {
        parent = m[2].slice(1, -1);
      }
    });
    return parent;
  };

  Liquid.renderTemplate = function(path, data) {
    var source = Liquid.readTemplateFile(path);
    var parent = Liquid.getParentLayout(source);
    if (parent) {
      data.content = path;
      path = 'layouts/' + parent;
      return Liquid.renderTemplate(path, data);
    }
    var parsed = Liquid.parse(source);
    return parsed.renderWithErrors(data);
  };

  Response.prototype.send = function(path, data) {
    var html = Liquid.renderTemplate(path, util.extend({}, defaults, data));
    this.end('text/html', html);
  };

});