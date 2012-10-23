(function(req, res, server) {
  "use strict";

  var err = getErrDetails();
  adjustError(err);
  if (getItem('X-Requested-With').toLowerCase() == 'xmlhttprequest') {
    displayErrorJSON(err);
  } else {
    displayError(err);
  }

  function adjustError(err) {
    if (typeof map == 'undefined') return;
    var line = err.originalLine = err.line;
    for (var i = 0; i < map.length; i++) {
      var source = map[i];
      if (line < source.lineOffset + source.lineCount) {
        err.file = source.path;
        err.line = line - source.lineOffset;
        break;
      }
    }
    err.report = 'Error at: ' + err.file + ':' + err.line + '\r\n' +  err.description;
  }

  function getErrDetails() {
    var details = server.getLastError();
    var err = {};
    err.path = getURL();
    err.file = details.file;
    err.type = details.category.replace(/(\w+ )?(\w+)Script/i, 'Script');
    err.line = details.line;
    err.description = details.description;
    err.code = details.number>>16 & 0x1FFF;
    err.number = details.number & 0xFFFF;
    err.referer = getItem('HTTP-Referer');
    err.userAgent = getItem('HTTP-User-Agent');
    return err;
  }

  function getURL() {
    var url = getItem('X-Rewrite-URL') || getItem('X-Original-URL');
    if (!url) {
      //when using 404 handler instead of rewrites
      url = getItem('Query-String').match(/^([^:\/]+:\/\/)?([^\/]*)(.*)$/).pop() || '/';
    }
    return url;
  }

  function getItem(n) {
    var key = n.replace(/-/g, '_').toUpperCase(), val;
    try {
      //use a try/catch here because we might not have access to certain parameters
      val = req.serverVariables(key).item() || req.serverVariables('HTTP_' + key).item();
    } catch(e) {}
    return val || '';
  }

  function displayError(err) {
    var out = [
      '500 Server Error',
      'Date/Time: ' + new Date().toUTCString(),
      'Requested Resource: ' + err.path,
      'File: ' + err.file,
      'Line: ' + err.line,
      'Description:\r\n' + err.description,
      ''
    ].join('\r\n');
    res.clear();
    res.contentType = 'text/plain';
    res.write(out);
    res.end();
  }

  function displayErrorJSON(err) {
    var out = [
      '{"http_status": "500"',
      ',"error": "' + jsEnc(err.description) + '"',
      ',"details": {"file": "' + jsEnc(err.file) + '", "line": "' + err.line + '"}}',
      ''
    ].join('\r\n');
    res.clear();
    res.status = '200 Server Error';
    res.contentType = 'text/plain';
    res.write(out);
    res.end();
  }

  function jsEnc(str) {
    var esc = {'\\': '\\\\', '\b': '\\b', '\t': '\\t', '\n': '\\n', '\f': '\\f', '\r': '\\r', '"': '\\"'};
    str = str.replace(/[\\"\x08\f\n\r\t]/g, function(c) {
      return esc[c];
    });
    str = str.replace(/[\x00-\x1f\x7f-\xff\u0100-\uffff]/g, function(c) {
      return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
    return str;
  }

})(Request, Response, Server);