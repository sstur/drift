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
      throw new Error('Invalid module name');
    }
    if (arguments.length == 2) {
      definition = arguments[1];
      deps = [];
    }
    if (typeof definition !== 'function') {
      var module = definition;
      definition = function() { this.exports = module; };
    }
    definition.deps = deps;
    definitions[name] = definition;
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
   * App-level event emitter
   */
  app.eventify(app);


  /*!
   * Routing provided by separate module, but routes
   * can be added before that module is loaded.
   */
  var router, routes = app._routes = [];

  //shortcut method for addRoute or routeRequest
  app.route = function(a, b) {
    if (typeof a == 'string' || a instanceof RegExp) {
      return addRoute(a, b);
    } else {
      return routeRequest(a, b);
    }
  };

  function addRoute(route, handler) {
    routes.push({route: route, handler: handler});
    if (router) {
      router.addRoute(route, handler);
    }
  }

  function routeRequest(req, res) {
    var util = require('util')
      , Router = require('router')
      , Request = require('request')
      , Response = require('response');
    req = new Request(req);
    res = new Response(res);
    //cross-reference request and response
    req.res = res;
    res.req = req;
    app.emit('request', req, res);
    router = new Router(routes);
    var method = req.method(), url = req.url();
    url = url.split('?')[0]; //strip query from raw (encoded) url
    util.propagateEvents(router, req, 'pre-route match-route no-route');
    //todo: fix this, it's kind of hacky
    var qsParams = req.params();
    req.on('match-route', function(params) {
      req._params = util.extend({}, qsParams, params || {});
    });
    //todo: move to request lib?
    req.on('no-route', function(routeData) {
      var response = routeData.response || app.cfg('res_404');
      if (response) {
        res.end(response.status || '404', response.type, response.body);
      } else {
        res.end('404', 'No Route');
      }
    });
    return router.route(method, url, req, res);
  }


  /*!
   * Global configuration
   * todo: recursive combine, xpath
   */
  var config;

  app.cfg = function(data) {
    config = config || require('config');
    if (typeof data == 'string') {
      var val = config[data];
      //todo: xpath
      return (val == null) ? '' : val;
    } else {
      data = data || {};
      for (var n in data) {
        //todo deep merge?
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

  //export to global (except when compiled)
  /*@remove{*/
  global.app = app;
  global.define = define;
  /*}@*/

})();