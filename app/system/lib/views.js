/*global app, define, global */
define('views', function(require, exports) {
  "use strict";
  var fs = require('fs');
  //todo: separate vewCache from comiledViews
  var viewCache = global.viewCache || {};

  var tmplEngineName = app.cfg('template/engine') || 'tmpl';
  var tmplEngine;

  try {
    tmplEngine = require(tmplEngineName);
  } catch(e) {
    throw new Error('Template engine "' + tmplEngineName + '" could not be loaded');
  }
  var canCompile = (typeof tmplEngine.compile == 'function');

  function loadTemplate(name) {
    var tmpl;
    try {
      tmpl = fs.readTextFile('views/' + name + '.js', 'utf8');
    } catch(e) {
      if (e.code != 'ENOENT') {
        throw e;
      }
      return fs.readTextFile('views/' + name + '.html', 'utf8');
    }
    return new Function('return (' + tmpl + ')')();
  }

  function getRenderer(name) {
    var tmpl = viewCache[name];
    if (!tmpl) {
      tmpl = loadTemplate(name);
    }
    if (typeof tmpl.render == 'function') {
      return tmpl;
    }
    if (typeof tmpl == 'function') {
      //revive template object
      return (viewCache[name] = tmpl(tmplEngine));
    }
    tmpl = String(tmpl);
    //todo: preprocess(tmpl) [resolve blocks and includes]
    if (canCompile) {
      return (viewCache[name] = tmplEngine.compile(tmpl));
    }
    return {
      render: function(context) {
        tmplEngine.render(tmpl, context);
      }
    }
  }

  exports.render = function(name, context) {
    var tmpl = getRenderer(name);
    return tmpl.render(context);
  };

});