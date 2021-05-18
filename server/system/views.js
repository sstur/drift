/*jshint -W054 */
define('views', function(require, exports, module) {
  'use strict';
  var fs = require('fs');

  var tmplEngineName = app.cfg('template/engine') || 'tmpl';
  try {
    var tmplEngine = require(tmplEngineName);
  } catch (e) {
    throw new Error(
      'Template engine "' + tmplEngineName + '" could not be loaded',
    );
  }

  module.exports = tmplEngine;

  tmplEngine.defaultDateFormat = app.cfg('template/defaults/date_format');

  var filters = tmplEngine.filters || (tmplEngine.filters = {});
  var views = tmplEngine.source || (tmplEngine.source = {});
  var compiledViews = tmplEngine.compiled || (tmplEngine.compiled = {});
  Object.assign(compiledViews, global.compiledViews || {});

  tmplEngine.readTemplateFile = getTemplateText;
  var canCompile = typeof tmplEngine.compile == 'function';

  function getTemplateText(name) {
    //default to .html extension if none specified
    var file = ~name.indexOf('.') ? name : name + '.html';
    file = 'views/' + file;
    if (file in views) {
      return views[file];
    }
    return (views[file] = fs.readTextFile(file, 'utf8'));
  }

  function getCompiledTemplate(name) {
    var file = name.match(/\.js$/) ? name : name + '.html.js';
    file = 'views/' + file;
    if (file in compiledViews) {
      return compiledViews[file];
    }

    try {
      //pre-compiled template on file-system ?
      var code = fs.readTextFile(file, 'utf8');
      var compiled = new Function('require', 'return ' + code)(require); // eslint-disable-line no-new-func
    } catch (e) {
      //file not found is ok; continue
      if (e.code !== 'ENOENT') throw e;
    }
    if (!compiled) {
      //if not pre-compiled, compile from source
      var source = getTemplateText(name);
      compiled = tmplEngine.compile(source);
    }
    //compiled should now have a .render() method
    return (compiledViews[file] = compiled);
  }

  //override render function
  var _render = tmplEngine.render;

  tmplEngine.render = function(name, context, opts) {
    context = context || {};
    opts = opts || {};
    if (canCompile) {
      var tmpl = getCompiledTemplate(name);
      var rendered = tmpl.render(context, { filters: filters });
    } else {
      var text = getTemplateText(name);
      rendered = _render.call(tmplEngine, text, context, { filters: filters });
    }
    if (opts.trim !== false) {
      rendered = rendered.trim();
    }
    return rendered;
  };
});
