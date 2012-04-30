//for environments that don't have global
var global = (function() {
  return this.global = this;
})();

var app, define;
(function() {
  "use strict";

  app = global.app = function() {};

  var require, definitions = {}, loading = {}, cache = {};

  define = global.define = function(name, definition) {
    definitions[name] = (typeof definition == 'function') ? definition : function() {};
  };

  //expose definitions
  define.definitions = definitions;

  require = app.require = function(namespace, name) {
    //account for more than two arguments (use last two)
    name = arguments[arguments.length - 1];
    namespace = arguments[arguments.length - 2] || '';
    var module, fullname = require.resolve(namespace, name);
    if (fullname) {
      module = cache[fullname] || (cache[fullname] = loadModule(fullname));
    }
    if (!module) {
      var errMsg = 'Module not found: ' + name;
      throw new Error(errMsg);
    }
    return module;
  };

  require.resolve = function(namespace, name) {
    var found, path = joinPath(namespace, getPath(name));
    name = name.replace(/.*\//, '');
    while (path && !found) {
      if (definitions[path + '/' + name]) {
        found = path + '/' + name;
      } else {
        if (definitions[path + '/lib/' + name]) {
          found = path + '/lib/' + name;
        }
      }
      path = getPath(path);
    }
    //global modules
    if (!found && definitions[name]) {
      found = name;
    }
    if (!found && definitions[name + '/' + name]) {
      found = name + '/' + name;
    }
    return found;
  };

  //expose module cache
  require.cache = cache;


  //helper functions

  function loadModule(name, args) {
    var module, fn = definitions[name];
    if (typeof fn == 'function') {
      //modules are cached during function call to handle cyclic recursion
      if (loading[name]) {
        module = loading[name];
        //console.warn('recursive load request for module: ' + name);
      } else {
        var path = getPath(name);
        module = loading[name] = {
          exports: {},
          require: require.bind(module, path),
          filename: name,
          dirname: path
        };
        fn.apply(module, args || [module.require, module.exports, module]);
        delete loading[name];
      }
    }
    return module && module.exports;
  }

  function getPath(name) {
    return (name && ~name.indexOf('/')) ? name.replace(/\/[^\/]*$/, '') : '';
  }

  function joinPath() {
    var resolved = '/' + Array.prototype.join.call(arguments, '/') + '/';
    resolved = resolved.replace(/\/+/g, '/');
    while(~resolved.indexOf('/./')) {
      resolved = resolved.replace(/\/\.\//g, '/');
    }
    while(~resolved.indexOf('/../')) {
      resolved = resolved.replace(/([^\/]*)\/\.\.\//g, '');
    }
    return resolved.replace(/^\/|\/$/g, '');
  }

})();