var exec = require('child_process').exec;
var join = require('path').join;
var readline = require('readline');
var EventEmitter = require('events').EventEmitter;

function escape(s) {
  return s.replace(/"/g, '\\"');
}

exports.getKeypressEmitter = function open(input) {
  readline.emitKeypressEvents(input);
  var keyEmitter = new EventEmitter();
  input.on('keypress', function(ch, key) {
    if (!key) return;
    if (key.ctrl && key.name == 'c') {
      process.exit();
    }
    var list = [];
    if (key.ctrl) list.push('ctrl');
    if (key.shift) list.push('shift');
    if (key.meta) list.push('meta');
    list.push(key.name);
    var keys = list.join(':');
    keyEmitter.emit('*', keys);
    keyEmitter.emit(keys);
  });
  input.setRawMode(true);
  input.resume();
  return keyEmitter;
};

exports.open = function open(target, callback) {
  var opener;
  switch (process.platform) {
    case 'darwin':
      opener = 'open';
      break;
    case 'win32':
      // if the first parameter is quoted, it is used as the title
      opener = 'start ""';
      break;
    default:
      // use Portlands xdg-open everywhere else
      opener = join(__dirname, '../bin/xdg-open');
      break;
  }
  return exec(opener + ' "' + escape(target) + '"', callback);
};
