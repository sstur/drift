'use strict';

const { BASE_PATH } = require('./constants');
const { eventify } = require('./eventify');
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
  const app = {};

  eventify(app);

  const router = new Router();

  app.route = (pattern, handler) => {
    router.addRoute(pattern, handler);
  };

  const routeRequest = (adapterRequest, adapterResponse) => {
    let req = new Request(adapterRequest);
    let res = new Response(adapterResponse);
    //cross-reference request and response
    req.res = res;
    res.req = req;
    app.emit('request', req, res);
    let path = req.url('rawPath');
    router.route(req.method(), path, req, res);
    // If we get to this point and the fiber has not aborted then there was no
    // route that handled this request.
    req.emit('no-route');
    res.end('404', 'text/plain', JSON.stringify({ error: '404 Not Found' }));
  };

  app.getRequestHandler = () => {
    //this function only runs within a fiber
    const fiberWorker = (http) => {
      let req = new AdapterRequest(http.req);
      let res = new AdapterResponse(http.res);
      //cross-reference adapter-request and adapter-response
      req.res = res;
      res.req = req;
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

//for debugging
// var sleep = function(ms) {
//   var fiber = Fiber.current;
//   setTimeout(function() {
//     fiber.run();
//   }, ms);
//   Fiber.yield();
// };
