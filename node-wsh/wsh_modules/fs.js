/*global app, define */
define('fs', function(require, exports, module) {
  "use strict";

  var fso = new ActiveXObject('Scripting.FileSystemObject');

  var fs = exports;

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


  function parseEnc(enc) {
    enc = String(enc).toLowerCase().replace('-', '');
    if (enc == 'utf8') {
      return 'UTF-8'
    } else
    if (~['utf16', 'utf16be', 'unicode'].indexOf(enc)) {
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