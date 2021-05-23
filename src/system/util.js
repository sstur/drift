/* eslint-disable one-var */
app.define('util', function(_appRequire, util) {
  'use strict';

  //regex for decoding percent-encoded strings
  var PCT_SEQUENCE = /(%[0-9a-f]{2})+/gi;

  util.propagateEvents = function(src, dest, events) {
    events = Array.isArray(events) ? events : String(events).split(' ');
    events.forEach(function(event) {
      src.on(event, function() {
        dest.emit.apply(dest, [event].concat(Array.from(arguments)));
      });
    });
  };

  util.inherits = function(ctor, parent) {
    ctor.super_ = parent;
    ctor.prototype = Object.create(parent.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true,
      },
    });
  };

  //parse a header value (e.g. Content-Disposition) accounting for
  // various formats such as rfc5987: field*=UTF-8'en'a%20b
  // todo: something like: ["multipart/alternative", {"boundary": "eb663d73ae0a4d6c9153cc0aec8b7520"}]
  util.parseHeaderValue = function(str) {
    //replace quoted strings with encoded contents
    str = String(str).replace(/"(.*?)"/g, function(_, str) {
      return encodeURIComponent(str.replace(PCT_SEQUENCE, decode));
    });
    var results = {};
    str.split(';').forEach(function(pair) {
      var split = pair.trim().split('=');
      var name = split[0],
        value = split[1] || '';
      if (name.slice(-1) == '*') {
        name = name.slice(0, -1);
        value = value.replace(/^[\w-]+'.*?'/, '');
      }
      if (name) {
        results[name] = value.replace(PCT_SEQUENCE, decode);
      }
    });
    return results;
  };

  //parse a set of HTTP headers
  // todo: multi-line headers
  util.parseHeaders = function(input) {
    //input = input.replace(/[ \t]*(\r\n)[ \t]+/g, ' ');
    var headers = {};
    var lines = input
      .split('\r\n')
      .join('\n')
      .split('\n');
    for (var i = 0, len = lines.length; i < len; i++) {
      var line = lines[i];
      var index = line.indexOf(':');
      //discard lines without a :
      if (index < 0) continue;
      var key = line
        .slice(0, index)
        .trim()
        .toLowerCase();
      // no empty keys
      if (!key) continue;
      var value = line.slice(index + 1).trim();
      headers[key] = headers[key] ? headers[key] + ', ' + value : value;
    }
    return headers;
  };

  util.pipe = function(src, dest) {
    src.on('data', function(data) {
      dest.write(data);
    });
    src.on('end', function() {
      dest.end();
    });
  };

  //strip a filename to be ascii-safe
  // used in Content-Disposition header
  // will not encode space or: !#$'()+-.;=@[]^_`{}
  util.stripFilename = function(filename, ch, map) {
    ch = ch || '';
    var safe = String(filename);
    //optional map of pre-substitutions (e.g. " -> ')
    Object.keys(map || {}).forEach(function(ch) {
      safe = safe.split(ch).join(map[ch]);
    });
    //control characters
    // eslint-disable-next-line no-control-regex
    safe = safe.replace(/[\x00-\x1F]+/g, ch);
    //these are generally unsafe at the OS level
    safe = safe.replace(/[\\\/:*?<>|&]+/g, ch);
    //these have special meaning in Content-Disposition header
    safe = safe.replace(/[%",]+/g, ch);
    //ascii "del" and unicode characters
    safe = safe.replace(/[\u007E-\uFFFF]+/g, ch);
    if (ch) {
      //replace duplicate separators
      while (~safe.indexOf(ch + ch)) {
        safe = safe.replace(ch + ch, ch);
      }
    }
    return safe.trim();
  };

  util.htmlEnc = function(str, /**Boolean=true*/ isAttr) {
    str = String(str);
    str = str.replace(/&/g, '&amp;');
    str = str.replace(/>/g, '&gt;');
    str = str.replace(/</g, '&lt;');
    if (isAttr !== false) {
      str = str.replace(/"/g, '&quot;');
    }
    str = str.replace(/\u00a0/g, '&nbsp;');
    return str;
  };

  //decode a sequence of percent-encoded entities
  // (similar to qs.decode or urlDecode)
  function decode(str) {
    try {
      return decodeURIComponent(str);
    } catch (e) {
      return unescape(str);
    }
  }
});
