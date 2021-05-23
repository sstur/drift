'use strict';

const { BASE_PATH } = require('./constants');
const { eventify } = require('./eventify');
const util = require('./system/util');
const Router = require('./system/router');
const Request = require('./system/request');
const Response = require('./system/response');

const AdapterRequest = require('./adapters/request');
const AdapterResponse = require('./adapters/response');

//patch some built-in methods
require('./support/patch');

const Fiber = require('./lib/fiber');

// Moved here from config.
// TODO: Move somewhere else?
const defaultNotFoundResponse = {
  type: 'text/plain',
  body: '{"error":"404 Not Found"}',
};

exports.createApp = () => {
  var app = {};

  //Make it able to emit events
  eventify(app);

  const { addRoute, routeRequest } = createRouteHelpers(app);

  //shortcut method for addRoute
  app.route = (...args) => addRoute(...args);

  app.getRequestHandler = () => {
    //this function only runs within a fiber
    const fiberWorker = (http) => {
      let req = new AdapterRequest(http.req);
      let res = new AdapterResponse(http.res);
      //cross-reference adapter-request and adapter-response
      req.res = res;
      res.req = req;
      // sleep(1); //for debugging
      routeRequest(req, res);
      throw new Error('Router returned without handling request.');
    };

    return (req, res) => {
      //cross-reference request and response
      req.res = res;
      res.req = req;
      //attempt to serve static file
      let staticPaths = ['/assets/'];
      res.tryStaticPath(BASE_PATH, staticPaths, () => {
        let fiber = new Fiber(fiberWorker);
        fiber.onError = res.sendError.bind(res);
        fiber.run({ req, res });
      });
    };
  };

  return app;
};

function createRouteHelpers(app) {
  const routes = [];

  const addRoute = (route, handler, opts) => {
    routes.push({ route: route, handler: handler, opts: opts });
  };

  const routeRequest = (adapterRequest, adapterResponse) => {
    var req = new Request(adapterRequest);
    var res = new Response(adapterResponse);
    //cross-reference request and response
    req.res = res;
    res.req = req;
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
      var response = routeData.response || defaultNotFoundResponse;
      if (response) {
        res.end(response.status || '404', response.type, response.body);
      } else {
        res.end('404', 'Not Found');
      }
    });
    //get raw (encoded) path
    var path = req.url('rawPath');
    return router.route(req.method(), path, req, res);
  };

  return { addRoute, routeRequest };
}

//for debugging
// var sleep = function(ms) {
//   var fiber = Fiber.current;
//   setTimeout(function() {
//     fiber.run();
//   }, ms);
//   Fiber.yield();
// };
