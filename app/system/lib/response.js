/*global app, define */
define('response', function(require, exports, module) {
  "use strict";

  var util = require('util')
    , Buffer = require('buffer').Buffer;

  var RE_CTYPE = /^[\w-]+\/[\w-]+$/;
  var RE_STATUS = /^\d{3}\b/;

  function Response(res) {
    this.res = res;
  }

  util.extend(Response.prototype, {
    headers: function() {
      this.res.headers.apply(this.res, arguments);
    },
    cookies: function() {
      this.res.cookies.apply(this.res, arguments);
    },
    charset: function() {
      this.res.charset.apply(this.res, arguments);
    },
    status: function() {
      this.res.status.apply(this.res, arguments);
    },
    sendFile: function() {
      this.res.sendFile.apply(this.res, arguments);
    },
    contentType: function(type) {
      //hack to override application/json -> text/plain when not an xhr request
      if (type.match(/\/json$/) && !(/XMLHttpRequest/i).test(this.req.headers('x-requested-with'))) {
        type = 'text/plain'
      }
      this.headers('Content-Type', type);
    },
    clear: function(type, status) {
      this.res.clear();
      if (type) {
        this.contentType(type);
      }
      if (status) {
        this.status(status);
      }
    },
    write: function(data) {
      //don't write anything for head requests
      if (this.req && this.req.method('head')) return;
      if (isPrimitive(data)) {
        this.res.write(String(data));
      } else
      if (Buffer.isBuffer(data)) {
        this.res.write(data);
      } else {
        //stringify returns undefined in some cases
        this.res.write(JSON.stringify(data) || '');
      }
    },
    end: function() {
      var args = toArray(arguments);
      if (args.length) {
        if (args.length > 1 && RE_STATUS.test(args[0])) {
          this.status(args.shift());
        }
        if (args.length > 1 && RE_CTYPE.test(args[0])) {
          this.contentType(args.shift());
        }
        for (var i = 0; i < args.length; i++) {
          this.write(args[i]);
        }
      }
      this.req.emit('end');
      this.res.end();
    },
    die: function() {
      this.clear();
      this.end.apply(this, arguments);
    },
    debug: function(data) {
      this.clear();
      this.write(util.inspect(data, 4));
      this.end();
    },
    redirect: function(url, type) {
      if (type == 'html') {
        this.htmlRedirect(url);
      }
      if (type == '301') {
        this.status('301 Moved Permanently');
      } else
      if (type == '303') {
        this.status('303 See Other');
      } else {
        this.status('302 Moved');
      }
      this.headers('Location', url);
      this.end();
    },
    htmlRedirect: function(url) {
      var html = htmlRedirect.replace(/URL/g, util.htmlEnc(url));
      this.end('text/html', html);
    }
  });

  var htmlRedirect = [
    '<html>',
    '<head><title>Redirecting ...</title><meta http-equiv="refresh" content="0;url=URL"/></head>',
    '<body onload="location.replace(document.getElementsByTagName(\'meta\')[0].content.slice(6))">',
    '<noscript><p>If you are not redirected, <a href="URL">Click Here</a></p></noscript>',
    //add padding to prevent "friendly" error messages in certain browsers
    new Array(15).join('<' + '!-- PADDING --' + '>'),
    '</body>',
    '</html>'
  ].join('\r\n');

  module.exports = Response;

});