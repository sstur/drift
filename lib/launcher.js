var childProcess = require('child_process');
var EventEmitter = require('events').EventEmitter;

var defaultOptions = {
  relaunchMinimum: 3000
};

function Launcher(options) {
  this.options = options || {};
  this.options.__proto__ = defaultOptions; // eslint-disable-line no-proto
}

Launcher.prototype.__proto__ = EventEmitter.prototype; // eslint-disable-line no-proto

Launcher.prototype.launch = function() {
  var args = this.options.args;
  var childOpts = {
    env: {IS_CHILD: 1},
    stdio: ['ignore', process.stdout, process.stderr, 'ipc']
  };
  var lastChildLaunchedAt = this.child ? this.child.launchedAt : 0;
  var child = childProcess.spawn(this.options.execPath, args, childOpts);
  //used to enforce a minimum time between restarting child process
  var launchedAt = child.launchedAt = Date.now();
  var relaunchMinimum = this.options.relaunchMinimum;
  child.on('exit', function() {
    var timeSinceLastLaunch = launchedAt - lastChildLaunchedAt;
    if (timeSinceLastLaunch < relaunchMinimum) {
      this.emit('premature-exit', timeSinceLastLaunch);
    } else {
      this.launch();
    }
  }.bind(this));
  this.child = child;
};

Launcher.prototype.resetTimer = function() {
  if (this.child) {
    this.child.launchedAt = 0;
  }
};

Launcher.prototype.send = function() {
  return this.child ? this.child.send.apply(this.child, arguments) : null;
};

Launcher.prototype.kill = function() {
  return this.child ? this.child.kill.apply(this.child, arguments) : null;
};

module.exports = Launcher;
