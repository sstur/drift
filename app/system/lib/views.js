/*global app, define, global */
define('views', function(require, exports) {
  "use strict";
  var fs = require('fs');

  //todo: change global.viewCache to cachedFiles ?
  var fileCache = global.viewCache || {};
  var compiledViews;

  var filters = exports.filters = {};

  var tmplEngineName = app.cfg('template/engine') || 'tmpl';
  var tmplEngine;

  try {
    tmplEngine = require(tmplEngineName);
  } catch(e) {
    throw new Error('Template engine "' + tmplEngineName + '" could not be loaded');
  }

  tmplEngine.readTemplateFile = getTemplateText;
  var canCompile = (typeof tmplEngine.compile == 'function');

  function getTemplateText(name) {
    var file = (~name.indexOf('.')) ? name : name + '.html';
    file = 'views/' + file;
    if (file in fileCache) {
      return fileCache[file];
    }
    return fileCache[file] = fs.readTextFile(file, 'utf8');
  }

  function getCompiledTemplate(name) {
    compiledViews = compiledViews || tmplEngine.compiled || {};
    var file = (name.match(/\.js$/)) ? name : name + '.html.js';
    file = 'views/' + file;
    if (file in compiledViews) {
      return compiledViews[file];
    }
    try {
      var source = fs.readTextFile(file, 'utf8');
      var compiled = new Function('require', 'return (' + source + ')')(require);
    } catch(e) {
      if (e.code !== 'ENOENT') throw e;
    }
    //if (typeof compiled == 'function') {
    //  //allows template engine to revive from serialized form
    //  compiled = compiled(tmplEngine);
    //}
    if (!source) {
      var text = getTemplateText(name);
      compiled = tmplEngine.compile(text);
    }
    //compiled should now have a .render() method
    return compiledViews[file] = compiled;
  }

  exports.addFilter = function(name, filter) {
    filters[name] = filter;
  };

  exports.addFilters = function(filters) {
    forEach(filters, function(name, filter) {
      exports.addFilter(name, filter);
    });
  };

  exports.render = function(name, context, opts) {
    context = context || {};
    opts = opts || {};
    if (canCompile) {
      var tmpl = getCompiledTemplate(name);
      var rendered = tmpl.render(context, {filters: filters});
    } else {
      var text = getTemplateText(name);
      rendered = tmplEngine.render(text, context, {filters: filters});
    }
    if (opts.trim !== false) {
      rendered = rendered.trim();
    }
    return rendered;
  };

});