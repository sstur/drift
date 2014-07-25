(function(req, res, server, offsets, map, config) {
  "use strict";

  var err = getErrDetails();
  var date = new Date();
  var defaultFile = '/app.js';

  adjustError(err);
  if (config.emailErrors && !getItem('Host').match(/\blocal\b/)) {
    emailError(err, config.emailErrors);
  }
  if (isAjax()) {
    sendErrorJSON(err);
  } else {
    sendError(err);
  }

  function getErrDetails() {
    var error = server.getLastError();
    var file = error.file.toLowerCase().replace(/\\/g, '/');
    var path = server.mapPath('/').toLowerCase().replace(/\\/g, '/') + '/';
    while (file.match(/[^\/]+\/\.\.\//)) file = file.replace(/[^\/]+\/\.\.\//, '');
    return {
      path: getURL(),
      file: (file.indexOf(path) === 0) ? file.slice(path.length) : file,
      type: error.category.replace(/(\w+ )?(\w+)Script/i, 'Script'),
      line: error.line,
      message: error.description || error.message,
      code: error.number>>16 & 0x1FFF,
      number: error.number & 0xFFFF,
      referer: getItem('HTTP-Referer'),
      userAgent: getItem('HTTP-User-Agent')
    };
  }

  function adjustError(err) {
    if (!map || !map.length) return;
    err.file = defaultFile;
    if (!err.line) {
      return;
    }
    err.originalLine = err.line;
    //if we are in debug mode, we will have a stack
    var stack = err.message.split('\n');
    var origin;
    var replacer = function(str, lineNum) {
      var result = parseLine(+lineNum);
      if (!origin) origin = result;
      return '@line ' + result.line + ' in "' + result.file + '"';
    };
    for (var i = 0; i < stack.length; i++) {
      var item = stack[i];
      if (item.match(/^in function /)) {
        stack[i] = item.replace(/@line:\{(\d+)\}/, replacer);
      }
    }
    err.message = stack.join('\n');
    var result = origin || parseLine(err.line);
    err.file = result.file;
    err.line = result.line;
  }

  function parseLine(line) {
    var offset = 0;
    var result = {line: 0, file: ''};
    for (var i = 0; i < line; i++) {
      offset += offsets[i] || 0;
    }
    line += offset;
    for (i = 0; i < map.length; i++) {
      var source = map[i];
      if (line < source.lineOffset) {
        break;
      }
      if (line < source.lineOffset + source.lineCount) {
        result.file = source.path;
        result.line = line - source.lineOffset;
        break;
      }
    }
    return result;
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

  function emailError(err, opts) {
    //this allows our app.debug() exceptions to pass through
    if (err.message.indexOf('>>>>') === 0) return;
    var errorText = renderError(err);
    opts.textBody = errorText;
    opts.htmlBody = '<pre><code>' + errorText.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</code></pre>';
    sendEmail(opts);
  }

  function sendError(err) {
    res.clear();
    res.contentType = 'text/plain';
    res.write(renderError(err));
    res.end();
  }

  function sendErrorJSON(err) {
    var errorJSON = renderErrorJSON(err);
    var callback = JSONP();
    if (callback) errorJSON = callback + '(' + errorJSON + ')';
    res.clear();
    //JSONP requests must always send status 200
    res.status = callback ? '200 Server Error' : '500 Server Error';
    res.contentType = isXHR() ? 'application/json' : 'text/plain';
    res.write(errorJSON);
    res.end();
  }

  function renderError(err) {
    return [
      '500 Server Error',
      'Date/Time: ' + date.toUTCString().slice(5, -3) + 'UTC',
      'Requested Resource: ' + err.path,
      'Referer: ' + err.referer,
      'User Agent: ' + err.userAgent,
      'File: ' + err.file,
      'Line: ' + err.line,
      'Index: ' + (err.originalLine || 0),
      'Message:',
      err.message,
      ''
    ].join('\r\n');
  }

  function renderErrorJSON(err) {
    return [
      '{"http_status": "500"',
      ',"error": "' + jsEnc(err.message || '') + '"',
      ',"details": {"file": "' + jsEnc(err.file) + '", "line": "' + err.line + '", "index": "' + err.originalLine + '"}}',
      ''
    ].join('\r\n');
  }

  function JSONP() {
    return (getItem('query-string').match(/(^|\?|&)(callback)=([a-z_$][\w$]+)(&|$)/) || [])[3];
  }

  function isXHR() {
    return (getItem('X-Requested-With').toLowerCase() == 'xmlhttprequest');
  }

  function isAjax() {
    //todo: check accepts
    return JSONP() || isXHR();
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

  function sendEmail(opts) {
    var mail = new ActiveXObject('CDO.Message');
    var host = getItem('host');
    var domain = host.replace(/^www\./, '') || 'localhost';
    var fields = mail.configuration.fields;
    var prefix = 'http://schemas.microsoft.com/cdo/configuration/';
    fields.item(prefix + 'sendusing').value = 2;
    fields.item(prefix + 'smtpserver').value = opts['smtp/host'] || 'localhost';
    fields.item(prefix + 'smtpserverport').value = opts['smtp/port'] || '25';
    if (opts['smtp/user'] && opts['smtp/pass']) {
      fields.item(prefix + 'smtpauthenticate').value = 1;
      fields.item(prefix + 'sendusername').value = opts['smtp/user'];
      fields.item(prefix + 'sendpassword').value = opts['smtp/pass'];
    }
    fields.update();
    mail.to = opts.to;
    mail.from = opts.from || 'no-reply@' + domain;
    mail.subject = (opts.subject || 'Server Error').replace('%HOSTNAME%', host);
    if (opts.textBody) mail.textBody = opts.textBody;
    if (opts.htmlBody) mail.htmlBody = opts.htmlBody;
    try {
      mail.send();
    } catch (e) {}
  }

})(Request, Response, Server, [/*SRCMAP*/], {/*CONFIG*/});