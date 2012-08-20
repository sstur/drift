/*global app, define */
define('fs', function(require, fs) {
  "use strict";

  var fso = new ActiveXObject('Scripting.FileSystemObject');

  //fs.readFile = function(file) {
  //  return app.rpc('fs.readFile', app.mappath(file));
  //};
  //
  //fs.writeFile = function(file, data, enc) {
  //  return app.rpc('fs.writeFile', app.mappath(file), data, enc);
  //};

  fs.readTextFile = function(file, enc) {
    enc = parseEnc(enc) || 'UTF-8';
    if (enc == 'UTF-8' || enc == 'UTF-16BE') {
      return readTextFileStream(file, enc);
    } else {
      var tristate = (enc == 'UTF-16LE') ? -1 : 0;
      var stream = fso.openTextFile(app.mappath(file), 1, tristate);
      var text = stream.readAll();
      stream.close();
      return text;
    }
  };

  fs.writeTextToFile = function(file, text, opts) {
    if (!opts) opts = {};
    //TODO: Character Encoding
    var mode = (opts.overwrite === true) ? 2 : 8;
    var stream = fso.openTextFile(app.mappath(file), mode, -1);
    stream.write(String(text));
    stream.close();
  };

  fs.log = function() {
    var logfile, args = toArray(arguments), logLevel = 1;
    if (typeof args[0] == 'number' && args[0] > 0 && +args[0] == args[0]) {
      logLevel = args.shift();
    }
    if (args.length > 1) {
      logfile = args.pop();
    }
    if (!logfile) logfile = 'default';
    var data = args
      , path = 'data/logs/' + logfile.replace(/\.log$/, '') + '.log';
    data.forEach(function(line, i) {
      data[i] = (line instanceof Object) ? JSON.stringify(line) : String(line);
    });
    data.unshift(new Date().toUTCString());
    data.push('');
    data = data.join('\n');
    data = data.replace(/(\r\n|[\r\n])+/g, '\r\n');
    fs.writeTextToFile(path, data + '\r\n');
  };


  function parseEnc(enc) {
    enc = String(enc).toLowerCase().replace('-', '');
    if (enc == 'utf8') {
      return 'UTF-8'
    } else
    if (enc in {utf16: 1, utf16be: 1, unicode: 1}) {
      return 'UTF-16BE';
    } else
    if (enc == 'utf16le') {
      return 'UTF-16BE';
    } else
    if (/ascii|ansi|1252|iso8859/.test(enc)) {
      return 'Windows-1252';
    }
  }

  function readTextFileStream(file, enc) {
    var stream = new ActiveXObject('ADODB.Stream');
    stream.open();
    stream.type = 2;
    stream.charset = enc;
    var fullpath = app.mappath(file);
    stream.loadFromFile(fullpath);
    var text = stream.readText();
    stream.close();
    return text;
  }

});