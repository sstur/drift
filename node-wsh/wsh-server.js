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

  var sourceFiles = build(), data = {};

  var dispatchWorker = function(req, res) {
    var requestData = serializeRequest(req, res);
    var worker = new Worker();
    //respond accepts err as first arg
    var respond = worker.respond.bind(worker);
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
        case 'log':
          console.log.apply(console, args);
          worker.send(null);
          break;
        case 'done':
          worker.emit('done', data);
          break;
        default:
          throw new Error('no handler for worker message ' + message);
      }
    });
    worker.on('error', function(error) {
      if (res._header) return;
      res.writeHead('500', {'content-type': 'text/plain'});
      if (res._hasBody) {
        //body is not written for HEAD requests
        res.write(parseError(error));
      }
      res.end();
    });
    worker.on('done', function(response) {
      if (res._header) return;
      var type = typeof response.body
        , parts = (Array.isArray(response.body)) ? response.body : [String(response.body)]
        , length = 0, i;
      for (i = 0; i < parts.length; i++) {
        var part = parts[i];
        parts[i] = new Buffer(part.data || part, part.encoding || 'utf8');
        length += parts[i].length;
      }
      response.headers['Content-Length'] = String(length);
      res.writeHead(response.status, response.headers);
      if (res._hasBody) {
        //body is not written for HEAD requests
        for (i = 0; i < parts.length; i++) {
          res.write(parts[i]);
        }
      }
      res.end();
      //worker can be put back in idle pool
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
    //should the content-type be normalized?
    //if (requestData.headers['content-type']) {
    //  requestData.headers['content-type'] = requestData.headers['content-type'].split(';')[0];
    //}
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

  function parseError(output) {
    var match = output.match(/^(.*?)\((\d+), (\d+)\)([\s\S]*)$/);
    var file = match[1], line = +match[2], index = +match[3], message = (match[4] || '').trim();
    var chosen = {};
    for (var i = 0; i < sourceFiles.length; i++) {
      var source = sourceFiles[i];
      if (line < source.lineOffset + source.lineCount) {
        chosen.file = source.path.replace(/\\/g, '/');
        chosen.line = line - source.lineOffset;
        break;
      }
    }
    var report = 'Error at: ' + chosen.file + ':' + chosen.line + ':' + index + '\r\n' +  message;
    console.log(report);
    return report;
  }


})();