//for environments that don't define `global`
var global = (function() { return this; })();

var app, define;
(function() {
  "use strict";

  app = function() {
    //allow to be used as a function
    if (typeof app.fn == 'function') {
      return app.fn.apply(app, arguments);
    }
  };

  var require, definitions = {}, loading = {}, cache = {};

  define = function(name, deps, definition) {
    if (typeof name != 'string') {
      throw new Error('Invalid parameters for module definition')
    }
    if (arguments.length == 2) {
      definition = arguments[1];
      deps = [];
    }
    definition.deps = deps;
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



  /*!
   * Add basic event emitter to an object
   */
  app.eventify = function(obj) {
    obj.on = function(name, fn) {
      var events = this._events || (this._events = {})
        , list = events[name] || (events[name] = []);
      list.push(fn);
    };
    obj.emit = function(name) {
      var args = Array.prototype.slice.call(arguments, 1);
      var events = this._events || {}, list = events[name] || [];
      for (var i = 0; i < list.length; i++) {
        list[i].apply(this, args);
      }
    };
  };



  /*!
   * Basic app-level event emitter
   */
  app.eventify(app);


  /*!
   * Routing provided by seperate module, but routes
   * can be added before that module is loaded.
   */
  var routes = app._routes = [];

  app.route = function(a, b) {
    if (typeof a == 'string' || a instanceof RegExp) {
      routes.push({route: a, handler: b});
    } else {
      var router = require('router'), req = a, res = b;
      return router.route(req, res, routes);
    }
  };


  /*!
   * Global configuration
   * todo: recursive combine, xpath
   */
  var config = {};

  app.cfg = function(data) {
    if (typeof data == 'string') {
      var val = config[data];
      //todo: xpath
      return (val == null) ? '' : val;
    } else {
      data = data || {};
      for (var n in data) {
        //todo deep merge
        config[n] = data[n];
      }
    }
  };


  /*!
   * Application data (in-memory)
   * todo: move elsewhere; this is adapter/environment specific
   */
  var data = app._data = {};
  app.data = function(n, val) {
    if (arguments.length == 2) {
      (val == null) ? delete data[n] : data[n] = val;
      return val;
    } else {
      val = data[n];
      return (val == null) ? '' : val;
    }
  };


  /*!
   * Misc app-related functions
   */
  //overwridden by wsh shim
  //todo: should really be moved elsewhere
  app.mappath = function(path) {
    //global.mappath is expected to be defined by the
    //  server/environment specific adapter
    var mappath = global.mappath; //wtf?
    return mappath('app/' + path);
  };


  //module loader helpers

  function loadModule(name) {
    var module, fn = definitions[name];
    if (typeof fn == 'function') {
      //modules are cached during function call to handle cyclic recursion
      if (loading[name]) {
        module = loading[name];
        //console.warn('recursive load request for module: ' + name);
      } else {
        var path = getPath(name);
        module = loading[name] = {
          name: name,
          exports: {},
          require: require.bind(module, path)
        };
        var args = resolveDependencies(module, fn);
        fn.apply(module, args);
        delete loading[name];
      }
    }
    return module && module.exports;
  }

  function resolveDependencies(module, definition) {
    var deps = definition.deps, resolved = [];
    if (!deps || !deps.length) {
      deps = ['require', 'exports', 'module'];
    }
    var special = {module: module, require: module.require, exports: module.exports, app: app};
    for (var i = 0; i < deps.length; i++) {
      var dep = deps[i];
      if (special[dep]) {
        resolved.push(special[dep]);
      } else {
        try {
          resolved.push(module.require(dep));
        } catch(e) {
          throw new Error('Error loading dependency `' + dep + '` for module `' + module.name + '`');
        }
      }
    }
    return resolved;
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


  //some platforms do not allow iteration/manipulation of global object
  var globalIsMutable = (function() {
    try {
      for (var n in global) return true;
    } catch(e) {
      return false;
    }
  })();

  //this may become deprecated
  app.setGlobal = function(name, val) {
    if (globalIsMutable) {
      return global[name] = val;
    } else {
      return new Function('val', 'return ' + name + ' = val;')(val);
    }
  };

  //explicit globals for commonjs platforms
  if (!global.app) {
    app.setGlobal('app', app);
    app.setGlobal('define', define);
  }

})();