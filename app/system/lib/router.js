/*global app, define */
define('router', function(require, exports, module) {
  "use strict";

  var qs = require('qs')
    , util = require('util')
    , Request = require('request')
    , Response = require('response');

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

  Router.prototype.addRoute = function(route, handler) {
    this._routes.push(parseRoute(route, handler));
  };

  Router.prototype.addRoutes = function(arr) {
    var router = this;
    arr.forEach(function(definition) {
      router.addRoute(definition.route, definition.handler);
    });
  };

  Router.prototype.route = function(req, res) {
    req = new Request(req);
    res = new Response(res);
    //todo: should this be done via app.emit('request', req, res) ?
    //cross-reference request and response
    req.res = res;
    res.req = req;
    //request is ready to be routed
    req.emit('ready');
    var url = req.url().split('?')[0] //get raw url
      , verb = req.method()
      , routeData = {}
      , stopRouting = false;
    routeData.stop = function() {
      stopRouting = true;
    };
    req.emit('pre-route', routeData);
    this._routes.each(function(i, item) {
      if (item[0] && item[0] != verb) {
        return true; //Continue
      }
      if (typeof item[1] == 'string') {
        if (url == item[1]) {
          item[2].call(routeData, req, res);
        }
      } else {
        var matches = item[1].exec(url);
        if (matches) {
          item[2].call(routeData, req, res, matches.slice(1));
        }
      }
      return !stopRouting;
    });
    if (!stopRouting) {
      req.emit('no-route', routeData);
    }
    req.emit('404', routeData);
    var response = routeData.response || app.cfg('res_404');
    if (response) {
      res.clear(response.type, response.status || '404');
      res.write(response.body);
    } else {
      res.status(404);
      res.write('No Route');
    }
    res.end();
  };

  //Parse the given route, returning a verb (http method), regular expression and handler
  //todo: return a parsed object {verb: .., route: .., handler: ..}
  var parseRoute = function(route, fn) {
    var verb, m, type = typeof route;
    if (type == 'string' && (m = RE_VERB.exec(route))) {
      verb = m[1];
      route = m[2];
    }
    var names = [];
    var handler = function(req, res, matches) {
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
    route = (type == 'string' && !route.match(RE_PLAIN_ROUTE)) ? buildRegExp(route, names) : route;
    return [verb, route, handler];
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