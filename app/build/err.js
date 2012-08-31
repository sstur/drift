(function(req, res, server) {
  "use strict";

  var err = getErrDetails();
  adjustError(err);
  displayError(err);

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
    var aspError = server.getLastError();
    var err = {};
    err.path = getURL();
    err.file = aspError.file;
    err.type = aspError.category.replace(/Microsoft (\w+)Script/i, 'Script');
    err.line = aspError.line;
    err.description = aspError.description;
    err.code = aspError.number>>16 & 0x1FFF;
    err.number = aspError.number & 0xFFFF;
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
    var out = [];
    out.push('500 Server Error');
    out.push('Date/Time: ' + new Date().toUTCString());
    out.push('Requested Resource: ' + err.path);
    out.push('File: ' + err.file);
    out.push('Line: ' + err.line);
    out.push('Description:\r\n' + err.description);
    out.push('');
    try {
      res.clear();
      res.contentType = 'text/plain';
    } catch(e) {
      //http headers and possibly partial body might be already sent
      out.unshift('<pre><code>');
    }
    res.write(out.join('\r\n'));
    res.end();
  }

  function displayErrorJSON(err) {
    var out = '{"http_status":"500","error":"' + jsEnc(err.description) + '","details":{"category":"' + err.type + '","file":"' + jsEnc(err.file) + '","line":"' + err.line + '"}}';
    res.clear();
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