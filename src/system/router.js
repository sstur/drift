/*!
 * Todo:
 * new Router()
 * new Route(): route.method, route.url/regex, route.handler
 */
/* eslint-disable consistent-this, one-var */
'use strict';
const { eventify } = require('../eventify');

var RE_VERB = /^([A-Z]+):(.*)/;
var RE_PLAIN_ROUTE = /^[^:*]+$/;

function Router(routes) {
  if (!(this instanceof Router)) {
    return new Router(routes);
  }
  this._routes = [];
  if (routes) {
    for (let { route, handler } of routes) {
      this.addRoute(route, handler);
    }
  }
}
eventify(Router.prototype);

Router.prototype.addRoute = function(route, handler) {
  this._routes.push(parseRoute(route, handler));
};

Router.prototype.route = function(method, url, ...routeArgs) {
  var routeData = {};
  for (let item of this._routes) {
    if (item.method && item.method !== method) {
      continue;
    }
    if (typeof item.route === 'string') {
      var matches = item.route === url ? [] : null;
    } else {
      matches = item.route.exec(url);
    }
    if (matches) {
      var matchData = Object.create(routeData);
      var values = matches.slice(1).map((value) => value || '');
      item.handler(matchData, routeArgs, values);
    }
  }
  this.emit('no-route', routeData);
};

//Parse the given route, returning http method, regular expression and handler
function parseRoute(rawRoute, fn) {
  let match = RE_VERB.exec(rawRoute);
  let route = match ? match[2] : rawRoute;
  return {
    method: match ? match[1] : undefined,
    route: route.match(RE_PLAIN_ROUTE) ? route : buildRegExp(route),
    handler: (matchData, routeArgs, values) => {
      return fn.call(matchData, ...routeArgs, ...values);
    },
  };
}

//Build a regular expression object from a route string
function buildRegExp(route) {
  var str = route.concat('/?').replace(/\/\(/g, '(?:/');
  str = str.replace(
    /(\/)?(\.)?:([\w-]+)(\?)?/g,
    (_, slash, format, _key, optional) => {
      slash = slash || '';
      return (
        '' +
        (optional ? '' : slash) +
        '(?:' +
        (optional ? slash : '') +
        (format || '') +
        '([^/]+))' +
        (optional || '')
      );
    },
  );
  str = str.replace(/([\/.-])/g, '\\$1').replace(/\*/g, '(.+)');
  return new RegExp('^' + str + '$', 'i');
}

module.exports = Router;
