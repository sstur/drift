(function() {
  "use strict";

  var join = require('path').join;
  var spawn = require('child_process').spawn;
  var Buffer = require('buffer').Buffer;
  var EventEmitter = require('events').EventEmitter;

  var idlePool = [], spawnCount = 0;

  function Worker() {
    EventEmitter.call(this);
    var child = this.child = idlePool.pop() || this.create();
    child.worker = this;
    if (child.initialized) {
      //console.log('resuming worker', child.id);
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
    var path = join(__dirname, '../build', 'app.wsf');
    var child = spawn('cscript', ['//nologo', path], {cwd: __dirname});
    child.id = ++spawnCount;
    console.log('spawned worker', child.id);
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
        //console.log('worker', child.id, 'says', {id: message.id, query: message.query});
        child.worker.emit('message', message.query, message.payload);
      }
    });
    child.on('exit', function(code) {
      console.log('worker', child.id, 'exited with code', code);
      if (stderr.length) {
        child.worker.emit('error', stderr.join(''));
      }
    });
    return child;
  };

  Worker.prototype.send = function(data) {
    var child = this.child, message = {data: data};
    child.stdin.write(stringify(message) + '\r\n');
  };

  Worker.prototype.respond = function(err, data) {
    var child = this.child
      , message = err ? {error: err} : {data: data};
    child.stdin.write(stringify(message) + '\r\n');
  };


  //helpers

  var REG_CHARS = /[^\x20-\x7E]/g;

  function stringify(data) {
    var string = JSON.stringify(data, function(key, val) {
      if (val instanceof Error) {
        return 'new Error(' + JSON.stringify(val.message) + ')';
      } else
      if (val instanceof Date) {
        return 'new Date(' + val.valueOf() + ')';
      } else
      if (Buffer.isBuffer(val)) {
        return 'new Buffer("' + val.toString('hex') + '","hex")';
      } else {
        return val;
      }
    });
    return string.replace(REG_CHARS, encodeChars);
  }

  function encodeChars(ch) {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  }

  module.exports = Worker;

})();