(function() {
  "use strict";

  var join = require('path').join;
  var spawn = require('child_process').spawn;
  var Buffer = require('buffer').Buffer;
  var EventEmitter = require('events').EventEmitter;

  var build = require('./build').build;

  var sourceFiles = build();

  exports.requestHandler = function(req, res) {
    var requestData = serializeRequest(req, res);
    var worker = new Worker();
    worker.on('message', function(message, data) {
      switch(message) {
        case 'get-request':
          worker.send(requestData);
          break;
        case 'app-var':
          worker.send(app.data(data.name, data.value));
          break;
        case 'log':
          console.log(data);
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
      res.write(error);
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
      response.headers['Content-Type'] = String(length);
      res.writeHead(response.status, response.headers);
      for (i = 0; i < parts.length; i++) {
        res.write(parts[i]);
      }
      res.end();
      worker.emit('end');
    });
  };

  function processRequestBody(req, res) {
    //todo
  }

  function serializeRequest(req, res) {
    var data = {
      url: req.url,
      method: req.method,
      headers: req.headers,
      cookies: {},
      ipaddr: req.connection.remoteAddress,
      server: 'Node ' + process.version
    };
    data.files = {};
    data.fields = {};
    if (data.headers['content-type']) {
      data.headers['content-type'] = data.headers['content-type'].split(';')[0];
    }
    return data;
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


  var idlePool = [], spawnCount = 0;

  function Worker() {
    EventEmitter.call(this);
    var child = this.child = idlePool.pop() || this.create();
    child.worker = this;
    if (child.initialized) {
      console.log('resuming child', child.id);
      this.send('resume');
    } else {
      child.initialized = true;
    }
    //todo: should this be a method?
    this.on('end', function() {
      idlePool.push(child);
    });
  }

  Worker.prototype = Object.create(EventEmitter.prototype);

  Worker.prototype.create = function() {
    var path = join(__dirname, 'build', 'app.wsf');
    var child = spawn('cscript', ['//nologo', path], {cwd: __dirname});
    child.id = ++spawnCount;
    var stdout = [], stderr = [];
    child.stderr.on('data', function(data) {
      stderr.push(data.toString());
    });
    child.stdout.on('data', function(data) {
      data = data.toString();
      stdout.push(data);
      if (~data.indexOf('\n')) {
        var message = JSON.parse(stdout.join(''));
        stdout.length = 0;
        console.log('child', child.id, 'says', {id: message.id, query: message.query});
        child.worker.emit('message', message.query, message.payload);
      }
    });
    child.on('exit', function(code) {
      console.log('child', child.id, 'exited with code', code);
      if (stderr.length) {
        var errorReport = parseError(stderr.join(''));
        child.worker.emit('error', errorReport);
      }
    });
    return child;
  };

  Worker.prototype.send = function(data) {
    var child = this.child, message = {data: data};
    child.stdin.write(JSON.stringify(message).replace(REG_CHARS, encodeChars) + '\r\n');
  };



//  function spawnWorker(data) {
//    var path = join(__dirname, 'build', 'app.wsf');
//    var worker = spawn('cscript', ['//nologo', path], {cwd: __dirname});
//    var stderr = [];
//    worker.stderr.on('data', function(data) {
//      stderr.push(data.toString());
//    });
//    worker.stdout.once('data', function() {
//      worker.emit('ready');
//    });
//    worker.on('ready', function() {
//      var messenger = new Messenger(worker.stdin, worker.stdout);
//      messenger.on('message', function(message) {
//        if (!message) {
//          throw new Error('Invalid message received from worker');
//        }
//        if (message.type == 'query') {
//          worker.emit('message', message.body);
//        } else {
//          worker.emit('done', message.body);
//        }
//      });
//      messenger.sendMessage(data);
//    });
//    worker.on('exit', function(code) {
//      console.log('Worker process exited with code', code);
//      if (stderr.length) {
//        var errorReport = parseError(stderr.join(''));
//        worker.emit('error', errorReport);
//      }
//    });
//    return worker;
//  }


  var REG_CHARS = /[^\x20-\x7E]/g;
  function encodeChars(ch) {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  }

})();