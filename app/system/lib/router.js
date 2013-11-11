/*global app, define */
define('router', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var util = require('util');

  var slice = Array.prototype.slice;

  var RE_VERB = /^([A-Z]+):(.*)/;
  var RE_PLAIN_ROUTE = /^[^:*]+$/;

  function Router(routes) {
    if (!(this instanceof Router)) {
      return new Router(routes);
    }
    this._routes = [];
    if (routes) {
      this.addRoutes(routes);
    }
  }
  app.eventify(Router.prototype);

  Router.prototype.addRoute = function(route, handler, opts) {
    this._routes.push(parseRoute(route, handler, opts));
  };

  Router.prototype.addRoutes = function(arr) {
    var router = this;
    arr.forEach(function(definition) {
      router.addRoute(definition.route, definition.handler, definition.opts);
    });
  };

  Router.prototype.route = function(method, url) {
    var router = this;
    var routeData = {};
    //rest-args to be passed on to each route handler (usually req, res)
    var routeArgs = slice.call(arguments, 2);
    var stopRouting = false;
    routeData.stop = function() {
      stopRouting = true;
    };
    this.emit('pre-route', routeData);
    forEach(this._routes, function(i, item) {
      if (item.method && item.method != method) {
        return true; //continue
      }
      if (typeof item.route == 'string') {
        var matches = (item.route == url) ? [] : null;
      } else {
        matches = item.route.exec(url);
      }
      if (matches) {
        var matchData = Object.create(routeData);
        matchData.opts = item.opts || {};
        var values = matchData.values = matches.slice(1);
        var params = matchData.params = assignNames(item.paramNames, values);
        router.emit('match-route', matchData, params);
        item.handler(matchData, routeArgs);
      }
      return !stopRouting;
    });
    this.emit('no-route', routeData);
  };

  //Parse the given route, returning http-method, regular expression and handler
  function parseRoute(route, fn, opts) {
    var parsed = {}, names = [], type = typeof route, m;
    if (type == 'string' && (m = RE_VERB.exec(route))) {
      parsed.method = m[1];
      route = m[2];
    }
    parsed.route = (type == 'string' && !route.match(RE_PLAIN_ROUTE)) ? buildRegExp(route, names) : route;
    parsed.paramNames = names;
    parsed.handler = function(matchData, routeArgs) {
      return fn.apply(matchData, routeArgs.concat(matchData.values));
    };
    parsed.opts = opts;
    return parsed;
  }

  function assignNames(names, values) {
    var params = {};
    for (var i = 0; i < values.length; i++) {
      var name = names[i] || '$' + (i + 1);
      params[name] = qs.unescape(values[i]);
    }
    return params;
  }

  //Build a regular expression object from a route string, storing param names in the array provided
  function buildRegExp(route, names) {
    var str = route.concat('/?').replace(/\/\(/g, '(?:/'), index = 0;
    str = str.replace(/(\/)?(\.)?:([\w-]+)(\?)?/g, function(_, slash, format, key, optional) {
      names[index++] = key;
      slash = slash || '';
      return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + '([^/]+))' + (optional || '');
    });
    str = str.replace(/([\/.-])/g, '\\$1').replace(/\*/g, '(.+)');
    return new RegExp('^' + str + '$', 'i');
  }

  //export router
  module.exports = Router;

});