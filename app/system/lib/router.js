/*global app, define */
define('router', function(require, module, exports) {
  "use strict";

  var qs = require('qs')
    , Request = require('request')
    , Response = require('response');

  var RE_METHOD = /^([A-Z]+)(:)/;
  var RE_PLAIN_ROUTE = /^[^:*]+$/;

  //Parse the given route, returning a verb (method), regular expression and handler
  var parseRoute = function(route, fn) {
    var verb, m;
    if (typeof route == 'string' && (m = RE_METHOD.exec(route))) {
      verb = m[0];
      route = m[1];
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

  exports.route = function(req, res, routes) {
    //todo: this should be done at app.on('ready')
    if (!routes.parsed) {
      for (var i = 0; i < routes.length; i++) {
        var definition = routes[i];
        routes[i] = parseRoute(definition.route, definition.handler);
      }
      routes.parsed = true;
    }
    req = new Request(req);
    res = new Response(res);
    var url = req.url('path').toLowerCase()
      , verb = req.method()
      , data = {}
      , stop = false;
    data.stop = function() {
      stop = true;
    };
    //todo: req.emit('pre-route', data);
    routes.each(function(i, arr) {
      if (arr[0] && arr[0] != verb) {
        return true; //Continue
      }
      if (typeof arr[1] == 'string') {
        if (url == arr[1]) {
          arr[2].call(data, req, res);
        }
      } else {
        var matches = arr[1].exec(url);
        if (matches) {
          arr[2].call(data, req, res, matches.slice(1));
        }
      }
      return !stop;
    });
    res.die('No Route');
    if (!stop) {
      //todo: req.emit('no-route', data);
    }
    //todo: req.emit('404', data);
    var response = data.response || app.cfg('res_404');
    res.clear(response.type, response.status || '404');
    res.write(response.body);
    res.end();
  };

});