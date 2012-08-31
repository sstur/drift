(function(req, res, server) {
  "use strict";

  var err = getErrDetails();
  adjustError(err);
  displayError(err);

  function adjustError(err) {
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
    return err;
  }

  function getErrDetails() {
    var err = server.getLastError();
    var details = {};
    details.path = getURL();
    details.file = err.file;
    details.type = err.category.replace(/Microsoft (\w+)Script/i, 'Script');
    details.line = err.line;
    details.description = err.description;
    details.code = err.number>>16 & 0x1FFF;
    details.number = err.number & 0xFFFF;
    details.referer = getItem('HTTP-Referer');
    details.userAgent = getItem('HTTP-User-Agent');
    return details;
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
    var val, key = n.replace(/-/g, '_').toUpperCase();
    return req.serverVariables(key).item() || req.serverVariables('HTTP_' + key).item() || '';
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