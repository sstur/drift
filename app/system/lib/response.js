/*global app, define */
define('response', function(require, exports, module) {
  "use strict";

  //todo: move this to app/config
  var cfg = {
    logging: {response_time: 1}
  };

  var util = require('util')
    , Buffer = require('buffer').Buffer;

  var RE_CTYPE = /^[\w-]+\/[\w-]+$/;
  var RE_STATUS = /^\d{3}\b/;

  function Response(res) {
    this._super = res;
    this._cookies = {};
  }

  util.extend(Response.prototype, {
    headers: function() {
      this._super.headers.apply(this._super, arguments);
    },
    charset: function() {
      this._super.charset.apply(this._super, arguments);
    },
    status: function() {
      this._super.status.apply(this._super, arguments);
    },
    sendFile: function() {
      this._super.sendFile.apply(this._super, arguments);
    },
    cookies: function(n, val) {
      //cookies are a case-sensitive collection that will be serialized into
      // Set-Cookie header(s) when response is sent
      var cookies = this._cookies;
      if (arguments.length == 0) {
        return cookies;
      }
      if (arguments.length == 1) {
        return cookies[n];
      } else
      if (val === null) {
        return (delete cookies[n]);
      }
      var cookie = (typeof val == 'string') ? {value: val} : val;
      cookie.name = n;
      cookies[n] = cookie;
    },
    contentType: function(type) {
      //hack to override application/json -> text/plain when not an xhr request
      if (type == 'application/json' && !this.req.isAjax()) {
        type = 'text/plain'
      }
      this.headers('Content-Type', type);
    },
    clear: function(type, status) {
      this._super.clear();
      if (type) {
        this.contentType(type);
      }
      if (status) {
        this.status(status);
      }
    },
    write: function(data) {
      //don't write anything for head requests
      if (this.req.method('head')) return;
      if (isPrimitive(data)) {
        this._super.write(String(data));
      } else
      if (Buffer.isBuffer(data)) {
        this._super.write(data);
      } else {
        //stringify returns undefined in some cases
        this._super.write(JSON.stringify(data) || '');
      }
    },
    end: function() {
      if (cfg.logging && cfg.logging.response_time && app.__init) {
        this.headers('X-Response-Time', new Date().valueOf() - app.__init.valueOf());
      }
      var cookies = this._cookies;
      for (var n in cookies) {
        this.headers('Set-Cookie', serializeCookie(cookies[n]));
      }

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
      this._super.end();
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

  function serializeCookie(cookie) {
    var out = [];
    out.push(cookie.name + '=' + encodeURIComponent(cookie.value));
    if (cookie.domain)
      out.push('Domain=' + cookie.domain);
    out.push('Path=' + (cookie.path || '/'));
    if (cookie.expires)
      out.push('Expires=' + cookie.expires.toGMTString());
    if (cookie.httpOnly)
      out.push('HttpOnly');
    if (cookie.secure)
      out.push('Secure');
    return out.join('; ');
  }

  module.exports = Response;

});