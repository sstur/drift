(function() {
  "use strict";

  var join = require('path').join;
  var spawn = require('child_process').spawn;
  var EventEmitter = require('events').EventEmitter;

  var idlePool = [], spawnCount = 0;

  function Worker() {
    EventEmitter.call(this);
    var child = this.child = idlePool.pop() || this.create();
    child.worker = this;
    if (child.initialized) {
      //console.log('resuming child', child.id);
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
    console.log('spawned child', child.id);
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
        //console.log('child', child.id, 'says', {id: message.id, query: message.query});
        child.worker.emit('message', message.query, message.payload);
      }
    });
    child.on('exit', function(code) {
      console.log('child', child.id, 'exited with code', code);
      if (stderr.length) {
        child.worker.emit('error', stderr.join(''));
      }
    });
    return child;
  };

  Worker.prototype.send = function(data) {
    var child = this.child, message = {data: data};
    child.stdin.write(JSON.stringify(message).replace(REG_CHARS, encodeChars) + '\r\n');
  };


  var REG_CHARS = /[^\x20-\x7E]/g;
  function encodeChars(ch) {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  }

  module.exports = Worker;

})();