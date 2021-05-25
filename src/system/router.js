'use strict';
const RE_VERB = /^([A-Z]+):(.*)/;

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

Router.prototype.addRoute = function(pattern, handler) {
  this._routes.push(parseRoute(pattern, handler));
};

Router.prototype.route = function(method, url, ...routeArgs) {
  for (let route of this._routes) {
    if (route.method !== '*' && route.method !== method) {
      continue;
    }
    let captures = route.matcher(url);
    if (captures) {
      route.handler(routeArgs, captures);
    }
  }
};

function parseRoute(rawPattern, fn) {
  let match = RE_VERB.exec(rawPattern);
  let method = match ? match[1] : '*';
  let pattern = match ? match[2] : rawPattern;
  return {
    method,
    matcher: getMatcher(pattern),
    handler: (routeArgs, captures) => {
      return fn(...routeArgs, ...captures);
    },
  };
}

function getMatcher(pattern) {
  let patternSegments = pattern.slice(1).split('/');
  return (url) => {
    let urlSegments = url.slice(1).split('/');
    if (patternSegments.length !== urlSegments.length) {
      return null;
    }
    let captures = [];
    for (let i = 0; i < urlSegments.length; i++) {
      let patternSegment = patternSegments[i];
      let urlSegment = urlSegments[i];
      if (patternSegment.charAt(0) === ':') {
        captures.push(urlSegment);
      } else if (patternSegment !== urlSegment) {
        return null;
      }
    }
    return captures;
  };
}

module.exports = Router;
