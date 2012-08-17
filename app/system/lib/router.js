/*global app, define */
define('router', function(require, exports, module) {
  "use strict";

  var qs = require('qs')
    , Request = require('request')
    , Response = require('response');

  var RE_METHOD = /^([A-Z]+):(.*)/;
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
    this._routes.push = parseRoute(route, handler);
  };

  Router.prototype.addRoutes = function(arr) {
    var router = this;
    arr.forEach(function(definition) {
      router.addRoute(definition.route, definition.handler);
    });
  };

  //Parse the given route, returning a verb (method), regular expression and handler
  var parseRoute = function(route, fn) {
    var verb, m;
    if (typeof route == 'string' && (m = RE_METHOD.exec(route))) {
      verb = m[1];
      route = m[2];
    }
    if (route instanceof RegExp || route.match(RE_PLAIN_ROUTE)) {
      return [verb, route, fn];
    }
    var keys = [], str = route.concat('/?').replace(/\/\(/g, '(?:/');
    str = str.replace(/(\/)?(\.)?:([\w]+)(\?)?/g, function(_, slash, format, key, optional) {
      keys.push(key);
      slash = slash || '';
      return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (format || '') + '([^/]+))' + (optional || '');
    });
    str = str.replace(/([\/.-])/g, '\\$1').replace(/\*/g, '(.+)');
    var rex = new RegExp('^' + str + '$', 'i');
    return [verb, rex, function(req, res, matches) {
      var params = {}, list = [];
      for (var i = 0; i < keys.length; i++) {
        var val = qs.unescape(matches[i]);
        params[keys[i]] = val;
        list.push(val);
      }
      //todo: change to req.params
      req.routeParams = params;
      return fn.apply(this, [req, res].concat(list));
    }];
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
      , stop = false;
    routeData.stop = function() {
      stop = true;
    };
    req.emit('pre-route', routeData);
    this._routes.each(function(i, arr) {
      if (arr[0] && arr[0] != verb) {
        return true; //Continue
      }
      if (typeof arr[1] == 'string') {
        if (url == arr[1]) {
          arr[2].call(routeData, req, res);
        }
      } else {
        var matches = arr[1].exec(url);
        if (matches) {
          arr[2].call(routeData, req, res, matches.slice(1));
        }
      }
      return !stop;
    });
    if (!stop) {
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

  //export router
  module.exports = Router;

});