(function() {
  "use strict";

  var join = require('path').join;
  var spawn = require('child_process').spawn;
  var Buffer = require('buffer').Buffer;
  var EventEmitter = require('events').EventEmitter;

  var idlePool = [], spawnCount = 0;

  function Worker() {
    EventEmitter.call(this);
    var worker = this;
    var child = this.child = idlePool.pop();
    if (child) {
      process.nextTick(function() {
        worker.init();
      });
    } else {
      child = this.child = worker.create();
      child.stdout.once('data', function() {
        child.initialized = true;
        worker.init();
      });
    }
  }

  Worker.prototype = Object.create(EventEmitter.prototype);

  //worker.init gets called as soon as child is ready (in sleep/waiting state)
  Worker.prototype.init = function() {
    //worker.send('resume');
    var child = this.child;
    child.worker = this;
    this.on('error', function(error) {
      console.log(error);
    });
    //todo: should this be a method?
    this.on('end', function() {
      idlePool.push(child);
    });
    this.emit('ready');
  };

  Worker.prototype.create = function() {
    var path = join(__dirname, '../build', 'app.wsf');
    var child = spawn('cscript', ['//nologo', path], {cwd: __dirname});
    child.id = ++spawnCount;
    console.log('spawned worker', child.id);
    var stdout = [], stderr = [];
    child.stderr.on('data', function(data) {
      stderr.push(data.toString());
    });
    child.stdout.on('data', function(data) {
      //console.log('worker', child.id, 'sent data of length', data.length);
      //if we're not assigned to a worker, consider the data a ready signal
      if (!child.worker) return;
      data = data.toString();
      if (~data.indexOf('\n')) {
        var parts = data.split('\n');
        for (var i = 0; i < parts.length; i++) {
          var part = parts[i];
          if (!part && i > 0) continue; //ends in a break;
          stdout.push(part);
          child.emit('data', stdout.join(''));
          stdout.length = 0;
        }
      }
    });
    child.on('data', function(data) {
      var message = parse(data);
      //console.log('worker', child.id, 'says', {id: message.id, query: message.query});
      if (message.query == 'log') {
        console.log.apply(console, message.payload);
      } else {
        child.worker.emit('message', message.query, message.payload);
      }
    });
    child.on('exit', function(code) {
      console.log('worker', child.id, 'exited with code', code);
      if (stderr.length && child.worker) {
        child.worker.emit('error', parseError(stderr.join('')));
      }
    });
    return child;
  };

  Worker.prototype.send = function(data) {
    var child = this.child, message = {data: data};
    message = stringify(message);
    child.stdin.write(message + '\r\n');
  };

  Worker.prototype.respond = function(err, data) {
    var child = this.child
      , message = err ? {error: err} : {data: data};
    message = stringify(message);
    child.stdin.write(message + '\r\n');
  };


  //helpers

  //extended JSON.stringify to handle special cases (Error, Date, Buffer)
  var stringify = function(obj) {
    var str = JSON.stringify(obj, replacer);
    return str.replace(REG_CHARS, encodeChars);
  };

  //extended JSON.parse to handle special cases (Error, Date, Buffer)
  //  * this is unsafe to use with untrusted JSON as it uses eval!
  var parse = function(str) {
    return JSON.parse(str, reviver);
  };


  var REG_CHARS = /[^\x20-\x7E]/g;
  var REG_CONSTR = /^new (Error|Date|Buffer)\(.*\)$/;

  function replacer(key, val) {
    if (!val || typeof val != 'object') {
      return val;
    }
    var type = Object.prototype.toString.call(val).slice(8, -1);
    if (type == 'Error') {
      return 'new Error(' + JSON.stringify(val.message) + ')';
    } else
    if (type == 'Date') {
      return 'new Date(' + val.valueOf() + ')';
    } else
    if (Buffer.isBuffer(val)) {
      return 'new Buffer("' + val.toString('hex') + '","hex")';
    } else {
      return val;
    }
  }

  function reviver(key, val) {
    if (typeof val == 'string' && REG_CONSTR.test(val)) {
      return new Function('return ' + val)();
    }
    return val;
  }

  function encodeChars(ch) {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  }

  function parseError(output) {
    var match = output.match(/^(.*?)\((\d+), (\d+)\)([\s\S]*)$/);
    var file = match[1], line = +match[2], index = +match[3], message = (match[4] || '').trim();
    var chosen = {}, sourceFiles = global.sourceFiles;
    for (var i = 0; i < sourceFiles.length; i++) {
      var source = sourceFiles[i];
      if (line < source.lineOffset + source.lineCount) {
        chosen.file = source.path.replace(/\\/g, '/');
        chosen.line = line - source.lineOffset;
        break;
      }
    }
    var report = 'Error at: ' + chosen.file + ':' + chosen.line + ':' + index + '\r\n' +  message;
    return report;
  }

  module.exports = Worker;

})();