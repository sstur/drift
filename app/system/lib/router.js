/*global app, define */
define('router', function(require, exports, module) {
  "use strict";

  var qs = require('qs')
    , util = require('util');

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

  Router.prototype.addRoute = function(route, handler) {
    this._routes.push(parseRoute(route, handler));
  };

  Router.prototype.addRoutes = function(arr) {
    var router = this;
    arr.forEach(function(definition) {
      router.addRoute(definition.route, definition.handler);
    });
  };

  Router.prototype.route = function(method, url) {
    var router = this
      , routeData = {}
      , routeArgs = Array.prototype.slice.call(arguments, 2)
      , stopRouting = false;
    routeData.stop = function() {
      stopRouting = true;
    };
    this.emit('pre-route', routeData);
    this._routes.each(function(i, item) {
      if (item.method && item.method != method) {
        return true; //Continue
      }
      if (typeof item.route == 'string') {
        if (url == item.route) {
          item.handler.apply(routeData, routeArgs);
        }
      } else {
        var matches = item.route.exec(url);
        if (matches) {
          matches = matches.slice(1);
          router.emit('match-route', matches); //so we can modify req.params
          item.handler.call(routeData, routeArgs.concat([matches]));
        }
      }
      return !stopRouting;
    });
    this.emit('no-route', routeData);
  };

  //Parse the given route, returning http-method, regular expression and handler
  var parseRoute = function(route, fn) {
    var parsed = {}, names = [], type = typeof route, m;
    if (type == 'string' && (m = RE_VERB.exec(route))) {
      parsed.method = m[1];
      route = m[2];
    }
    parsed.route = (type == 'string' && !route.match(RE_PLAIN_ROUTE)) ? buildRegExp(route, names) : route;
    parsed.handler = function(req, res, matches) {
      matches = matches || [];
      var params = {}, values = [];
      for (var i = 0; i < matches.length; i++) {
        var name = names[i] || '$' + (i + 1);
        var value = qs.unescape(matches[i]);
        params[name] = value;
        values.push(value);
      }
      util.extend(req._params, params);
      return fn.apply(this, [req, res].concat(values));
    };
    return parsed;
  };

  //Build a regular expression object from a route string, storing param names in the array provided
  var buildRegExp = function(route, names) {
    var str = route.concat('/?').replace(/\/\(/g, '(?:/'), index = 0;
    str = str.replace(/(\/)?(\.)?:([\w]+)(\?)?/g, function(_, slash, format, key, optional) {
      names[index++] = key;
      slash = slash || '';
      return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + '([^/]+))' + (optional || '');
    });
    str = str.replace(/([\/.-])/g, '\\$1').replace(/\*/g, '(.+)');
    return new RegExp('^' + str + '$', 'i');
  };

  //export router
  module.exports = Router;

});