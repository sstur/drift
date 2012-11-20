var app, define;
(function() {
  "use strict";

  app = function() {
    //allow to be used as a function
    if (typeof app.fn == 'function') {
      return app.fn.apply(app, arguments);
    }
  };

  //List of environment(s), such as the os and web server or platform that we are running on
  var environments = app.environments = (global.platform || '').split(' ');

  var require, definitions = {}, loading = {}, cache = {};

  define = app.define = function(name, deps, definition) {
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
   * Basic Event Emitter
   */

  var emitter = {
    on: function(name, fn) {
      var events = this._events || (this._events = {})
        , list = events[name] || (events[name] = []);
      list.push(fn);
    },
    emit: function(name) {
      var args = Array.prototype.slice.call(arguments, 1);
      var events = this._events || {}, list = events[name] || [];
      for (var i = 0; i < list.length; i++) {
        list[i].apply(this, args);
      }
    }
  };

  //Make an object into a basic Event Emitter
  app.eventify = function(obj) {
    obj.on = emitter.on;
    obj.emit = emitter.emit;
  };



  //Global `app` should be able to emit events
  app.eventify(app);


  /*!
   * Routing
   *
   * provided by separate module, but routes can be
   * added before that module is loaded.
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


  /*!
   * Configuration
   */
  var config = app._cfg = {};
  app.cfg = function() {
    var args = Array.prototype.slice.call(arguments);
    if (args.length == 1 && typeof args[0] == 'string') {
      //get config
      return getCfg(args[0].split('/'));
    }
    var data = args.pop();
    if (data !== Object(data)) {
      throw new Error('Invalid arguments to app.cfg');
    }
    if (args.length) {
      var env = args[0];
      if (environments.indexOf(env) < 0) {
        return;
      }
    }
    mergeCfg(data, []);
  };

  function mergeCfg(data, stack) {
    Object.keys(data).forEach(function(key) {
      var value = data[key], path = stack.concat(key.split('/'));
      if (value === Object(value)) {
        mergeCfg(value, path);
      } else {
        setCfg(path, value);
      }
    });

  }

  function setCfg(path, value) {
    var obj = config;
    for (var i = 0; i < path.length - 1; i++) {
      var key = path[i];
      obj = obj[key] || (obj[key] = {});
    }
    obj[path[i]] = value;
  }

  function getCfg(path) {
    var obj = config;
    for (var i = 0; i < path.length - 1; i++) {
      var key = path[i];
      obj = obj[key] || {};
    }
    return obj[path[i]];
  }


  /*!
   * Helpers
   */

  function addRoute(route, handler) {
    routes.push({route: route, handler: handler});
    if (router) {
      router.addRoute(route, handler);
    }
  }

  function routeRequest(_req, _res) {
    var util = require('util')
      , Router = require('router')
      , Request = require('request')
      , Response = require('response');
    var req = new Request(_req);
    var res = new Response(_res);
    //cross-reference request and response
    req.res = res;
    res.req = req;
    req.__init = Date.now();
    app.emit('request', req, res);
    router = new Router(routes);
    var method = req.method(), url = req.url();
    url = url.split('?')[0]; //strip query from raw (encoded) url
    util.propagateEvents(router, req, 'pre-route match-route no-route');
    //so routes an access `this.params` with combined request params
    req.on('match-route', function(routeData, params) {
      //todo: parse body params?
      routeData.params = util.extend({}, req.query(), params);
    });
    //todo: move to request lib?
    req.on('no-route', function(routeData) {
      var response = routeData.response || app.cfg('response_404');
      if (response) {
        res.end(response.status || '404', response.type, response.body);
      } else {
        res.end('404', 'Not Found');
      }
    });
    return router.route(method, url, req, res);
  }

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

  //export to global (but remove when compiled)
  /*@remove{*/
  global.app = app;
  global.define = define;
  /*}@*/

})();