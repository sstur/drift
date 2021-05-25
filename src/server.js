'use strict';

const { BASE_PATH } = require('./constants');
const { eventify } = require('./eventify');
const util = require('./system/util');
const Router = require('./system/router');
const Request = require('./system/request');
const Response = require('./system/response');
const { tryStaticPath } = require('./support/tryStaticPath');

const AdapterRequest = require('./adapters/request');
const AdapterResponse = require('./adapters/response');

//patch some built-in methods
require('./support/patch');

const Fiber = require('./lib/fiber');

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
      tryStaticPath(req, res, BASE_PATH, staticPaths, () => {
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

  const addRoute = (route, handler) => {
    routes.push({ route, handler });
  };

  const routeRequest = (adapterRequest, adapterResponse) => {
    let req = new Request(adapterRequest);
    let res = new Response(adapterResponse);
    //cross-reference request and response
    req.res = res;
    res.req = req;
    app.emit('request', req, res);
    let router = new Router(routes);
    util.propagateEvents(router, req, 'no-route');
    req.on('no-route', () => {
      res.end('404', 'text/plain', JSON.stringify({ error: '404 Not Found' }));
    });
    //get raw (encoded) path
    let path = req.url('rawPath');
    router.route(req.method(), path, req, res);
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
