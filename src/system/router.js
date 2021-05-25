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
    for (let [pattern, handler] of routes) {
      this.addRoute(pattern, handler);
    }
  }
}
eventify(Router.prototype);

Router.prototype.addRoute = function(pattern, handler) {
  this._routes.push(parseRoute(pattern, handler));
};

Router.prototype.route = function(method, url, ...routeArgs) {
  for (let route of this._routes) {
    if (route.method !== '*' && route.method !== method) {
      continue;
    }
    let matches;
    if (typeof route.pattern === 'string') {
      matches = route.pattern === url ? [] : null;
    } else {
      matches = route.pattern.exec(url);
    }
    if (matches) {
      let values = matches.slice(1).map((value) => value || '');
      route.handler(routeArgs, values);
    }
  }
  this.emit('no-route');
};

//Parse the given route pattern, returning http method, regex and handler
function parseRoute(rawPattern, fn) {
  let match = RE_VERB.exec(rawPattern);
  let pattern = match ? match[2] : rawPattern;
  return {
    method: match ? match[1] : '*',
    pattern: pattern.match(RE_PLAIN_ROUTE) ? pattern : buildRegExp(pattern),
    handler: (routeArgs, values) => {
      return fn(...routeArgs, ...values);
    },
  };
}

//Build a regular expression object from a route pattern
function buildRegExp(pattern) {
  let str = pattern.concat('/?').replace(/\/\(/g, '(?:/');
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
