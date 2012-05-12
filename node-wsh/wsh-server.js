(function() {
  "use strict";

  //patch some built-in methods
  require('./support/patch');

  var join = require('path').join;
  var Buffer = require('buffer').Buffer;

  var basePath = global.basePath = join(__dirname, '..');
  //used in request_body module
  global.mappath = function(path) {
    return join(basePath, path);
  };

  var build = require('./lib/build');
  var Worker = require('./lib/worker');
  var RequestBody = require('./lib/request_body');

  //todo: load rpc methods via require()
  var rpc = {
    'math.divide': function(a, b, callback) {
      var result = a / b;
      process.nextTick(function() {
        isFinite(result) ? callback(null, result) : callback(new Error('Error dividing'));
      });
    }
  };

  var sourceFiles = global.sourceFiles = build(), data = {};

  var sendResponse = function(req, res, data) {
    if (res._header) return;
    if (data.sendFile) {
      var opts = data.sendFile;
      res.sendFile(opts);
      return;
    }
    var parts = (Array.isArray(data.body)) ? data.body : [String(data.body)]
      , length = 0, i;
    for (i = 0; i < parts.length; i++) {
      var part = parts[i];
      parts[i] = new Buffer(part.data || part, part.encoding || 'utf8');
      length += parts[i].length;
    }
    data.headers['Content-Length'] = String(length);
    //todo: Date
    res.writeHead(data.status, data.headers);
    if (res._hasBody) {
      //body is not written for HEAD requests
      for (i = 0; i < parts.length; i++) {
        res.write(parts[i]);
      }
    }
    res.end();
  };

  var dispatchWorker = function(req, res) {
    var requestData = serializeRequest(req, res);
    var worker = new Worker();
    //respond accepts err as first arg
    var respond = worker.respond.bind(worker);
    worker.on('ready', function() {
      //tells the worker to ask for the request
      worker.send('go');
    });
    worker.on('message', function(message, data) {
      var args = (data && Array.isArray(data.args)) ? data.args : [];
      switch(message) {
        case 'get-request':
          worker.send(requestData);
          break;
        case 'get-body':
          req.body.getParsed(function(err, body) {
            worker.send(body);
          });
          break;
        case 'app-data':
          worker.send(appData(data.name, data.value));
          break;
        case 'rpc':
          args.push(respond);
          var method = rpc[data.method];
          (method) ? method.apply(rpc, args) : respond(new Error('Invalid RPC method'));
          break;
        case 'done':
          sendResponse(req, res, data);
          //worker can be put back in idle pool
          worker.emit('end');
          break;
        default:
          console.error('no handler for worker message ' + message);
      }
    });
    worker.on('error', function(error) {
      sendResponse(req, res, {status: '500', headers: {'content-type': 'text/plain'}, body: error})
    });
  };

  exports.init = function() {
    //initialize a worker and tell it to go to sleep
    //  improves response time to have one in the idle pool
    var worker = new Worker();
    worker.on('ready', function() {
      //console.log('worker', worker.child.id, 'ready');
      worker.emit('end');
    });
  };

  exports.requestHandler = function(req, res) {
    //cross-reference request and response
    req.res = res;
    res.req = req;
    //debugging: ignore favicon request
    if (req.url.match(/\/favicon\.ico$/i)) {
      res.writeHead(404);
      res.end();
      return;
    }
    //instantiate request body parser
    req.body = new RequestBody(req, res);
    //attempt to serve static file
    res.tryStaticPath('assets/', function() {
      dispatchWorker(req, res);
    });
  };

  function serializeRequest(req, res) {
    var requestData = {
      url: req.url,
      method: req.method,
      headers: req.headers,
      ipaddr: req.connection.remoteAddress,
      server: 'Node ' + process.version
    };
    return requestData;
  }

  function appData(n, val) {
    if (typeof val === 'undefined') {
      return data[n];
    } else
    if (val === null) {
      var oldVal = data[n];
      delete data[n];
      return oldVal;
    } else {
      return data[n] = val;
    }
  }

})();