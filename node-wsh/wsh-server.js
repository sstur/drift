(function() {
  "use strict";

  var join = require('path').join;
  var spawn = require('child_process').spawn;
  var Buffer = require('buffer').Buffer;

  var build = require('./build').build;
  var Messenger = require('./lib/json_message');

  build('app.wsf');

  exports.requestHandler = function(req, res) {
    var data = serializeRequest(req, res);
    spawnWorker(function(stdin, stdout) {
      var messenger = new Messenger(stdin, stdout);
      messenger.on('command', function(command) {
        //get/set app var, serve file, etc
        //messenger.sendMessage(answer);
      });
      messenger.sendMessage(data, function(response) {
        if (res._header) return;
        var parts = response.body, length = 0, i;
        for (i = 0; i < parts.length; i++) {
          var part = parts[i];
          parts[i] = new Buffer(part.data, part.encoding || 'utf8');
          length += parts[i].length;
        }
        response.headers['Content-Type'] = String(length);
        res.writeHead(response.status, response.headers);
        for (i = 0; i < parts.length; i++) {
          res.write(parts[i]);
        }
        res.end();
      });
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

  function err500(output) {
    console.log('Child process exited with error:');
    console.log(output);
  }

  function spawnWorker(callback) {
    var path = join(__dirname, 'app.wsf');
    var child = spawn('cscript', ['//nologo', path], {cwd: __dirname});
    var stderr = [];
    child.stderr.on('data', function(data) {
      stderr.push(data.toString());
    });
    child.stdout.on('data', function handler(data) {
      child.removeListener('data', handler);
      callback(child.stdin, child.stdout);
    });
    child.on('exit', function(code) {
      if (stderr.length) {
        err500(stderr.join(''));
      }
    });
  }

})();