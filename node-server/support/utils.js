var exec = require('child_process').exec;
var readline = require('readline');

function escape(s) {
  return s.replace(/"/g, '\\"');
}

exports.handleKeypress = function open(input, handler) {
  input.resume();
  readline.emitKeypressEvents(input);
  input.on('keypress', function(ch, key) {
    if (!key) return;
    if (key.ctrl && key.name == 'c') {
      process.exit();
    } else {
      handler(key);
    }
  });
  input.setRawMode(true);
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
      opener = path.join(__dirname, '../vendor/xdg-open');
      break;
  }
  return exec(opener + ' "' + escape(target) + '"', callback);
};
