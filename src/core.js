/* eslint-disable one-var */
'use strict';

var join = Array.prototype.join;
var slice = Array.prototype.slice;
var toString = Object.prototype.toString;

var app = {};

var require,
  definitions = {},
  loading = {},
  cache = {};

var define = (app.define = function(name, deps, definition) {
  if (typeof name !== 'string') {
    throw new Error('Invalid module name');
  }
  if (arguments.length === 2) {
    definition = arguments[1];
    deps = [];
  }
  if (typeof definition !== 'function') {
    var module = definition;
    definition = function() {
      this.exports = module;
    };
  }
  definition.deps = deps;
  definitions[name] = definition;
});

//expose definitions
define.definitions = definitions;

require = app.require = function(namespace, name) {
  //account for more than two arguments (use last two)
  name = arguments[arguments.length - 1];
  name = name.replace(/^_/, '');
  namespace = arguments[arguments.length - 2] || '';
  var module,
    fullname = require.resolve(namespace, name);
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
  // for shared modules that use browserify on client
  if (!namespace && (name.slice(0, 2) === './' || name.slice(0, 3) === '../')) {
    name = name.split('/').pop();
  }
  if (namespace && name.slice(0, namespace.length + 1) === namespace + '/') {
    //if name starts with namespace, assume explicit path
    namespace = '';
  }
  var found,
    path = joinPath(namespace, getPath(name));
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
  if (!found) {
  }
  //global modules
  if (!found && definitions[name]) {
    found = name;
  }
  if (!found) {
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
    var events = this._events || (this._events = {});
    var list = events[name] || (events[name] = []);
    list.push(fn);
  },
  emit: function(name) {
    var args = slice.call(arguments, 1);
    var events = this._events || {},
      list = events[name] || [];
    for (var i = 0; i < list.length; i++) {
      list[i].apply(this, args);
    }
  },
};

//Make an object into a basic Event Emitter
app.eventify = function(obj) {
  obj.on = emitter.on;
  obj.emit = emitter.emit;
  return obj;
};

//Global `app` should be able to emit events
app.eventify(app);

/*!
 * Routing
 *
 * provided by separate module, but routes can be
 * added before that module is loaded.
 */
var routes = (app._routes = []);

//shortcut method for addRoute or routeRequest
app.route = function(route) {
  if (typeof route === 'string' || route instanceof RegExp) {
    return addRoute.apply(null, arguments);
  } else {
    return routeRequest.apply(null, arguments);
  }
};

/*!
 * Configuration
 */
var config = (app._cfg = {});
app.cfg = function() {
  var args = Array.from(arguments);
  if (args.length === 1 && typeof args[0] === 'string') {
    //get config
    return getCfg(args[0].split('/'));
  }
  var data = args.pop();
  if (data !== Object(data)) {
    if (typeof args[0] === 'string') {
      setCfg(args[0].split('/'), data);
      return;
    }
    throw new Error('Invalid arguments to app.cfg');
  }
  mergeCfg(data);
};

function mergeCfg(data, stack) {
  stack = stack || [];
  Object.keys(data).forEach(function(key) {
    var value = data[key];
    //in some JS engines toString of null|undefined === '[object Object]'
    var type = value == null ? 'empty' : toString.call(value);
    var path = stack.concat(key.split('/'));
    if (type === '[object Object]') {
      mergeCfg(value, path);
    } else if (type === '[object Array]') {
      setCfg(path, value.slice(0));
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

function addRoute(route, handler, opts) {
  routes.push({ route: route, handler: handler, opts: opts });
}

function routeRequest(adapterRequest, adapterResponse) {
  var util = require('util');
  var Router = require('router');
  var Request = require('request');
  var Response = require('response');
  var req = new Request(adapterRequest);
  var res = new Response(adapterResponse);
  //cross-reference request and response
  req.res = res;
  res.req = req;
  req.__init = Date.now();
  app.emit('request', req, res);
  var router = new Router(routes);
  util.propagateEvents(router, req, 'pre-route match-route no-route');
  //so routes can access `this.params` with combined request params
  req.on('match-route', function(route) {
    //we use Object.create so we don't actually mutate the query params object
    var queryParams = Object.create(req.query());
    var routeParams = route.params;
    route.params = Object.assign(queryParams, routeParams);
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
  //get raw (encoded) path
  var path = req.url('rawPath');
  return router.route(req.method(), path, req, res);
}

function loadModule(name) {
  var module,
    fn = definitions[name];
  if (typeof fn === 'function') {
    //modules are cached during function call to handle cyclic recursion
    if (loading[name]) {
      module = loading[name];
      //console.warn('recursive load request for module: ' + name);
    } else {
      var path = getPath(name);
      module = loading[name] = {
        name: name,
        exports: {},
        require: require.bind(module, path),
      };
      var args = resolveDependencies(module, fn);
      fn.apply(module, args);
      delete loading[name];
    }
  }
  return module && module.exports;
}

function resolveDependencies(module, definition) {
  var deps = definition.deps,
    resolved = [];
  if (!deps || !deps.length) {
    deps = ['require', 'exports', 'module'];
  }
  var special = {
    module: module,
    require: module.require,
    exports: module.exports,
    app: app,
  };
  for (var i = 0; i < deps.length; i++) {
    var dep = deps[i];
    if (special[dep]) {
      resolved.push(special[dep]);
    } else {
      try {
        resolved.push(module.require(dep));
      } catch (e) {
        throw new Error(
          'Error loading dependency `' +
            dep +
            '` for module `' +
            module.name +
            '`',
        );
      }
    }
  }
  return resolved;
}

function getPath(name) {
  return name && ~name.indexOf('/') ? name.replace(/\/[^\/]*$/, '') : '';
}

function joinPath() {
  var resolved = '/' + join.call(arguments, '/') + '/';
  resolved = resolved.replace(/\/+/g, '/');
  while (~resolved.indexOf('/./')) {
    resolved = resolved.replace(/\/\.\//g, '/');
  }
  while (~resolved.indexOf('/../')) {
    resolved = resolved.replace(/([^\/]*)\/\.\.\//g, '');
  }
  return resolved.replace(/^\/|\/$/g, '');
}

//export to global
global.app = app;
