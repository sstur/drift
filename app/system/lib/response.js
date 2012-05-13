/*global app, define */
define('response', function(require, exports, module) {
  "use strict";

  var Buffer = require('buffer').Buffer;

  function Response(res) {
    this.res = res;
  }

  Response.prototype = {
    headers: function() {
      this.res.headers.apply(this.res, arguments);
    },
    cookies: function() {
      this.res.cookies.apply(this.res, arguments);
    },
    debug: function() {
      this.res.debug.apply(this.res, arguments);
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
    clear: function(type, status) {
      this.res.clear();
      if (type) {
        //hack to override application/json -> text/plain when not an xhr request
        if (type.match(/\/json$/) && !(/XMLHttpRequest/i).test(this.req.headers('x-requested-with'))) {
          this.res.headers('Content-Type', 'text/plain');
        } else {
          this.res.headers('Content-Type', type);
        }
      }
      if (status) {
        this.res.status(status);
      }
    },
    write: function(data) {
      //todo: binary
      if (isPrimitive(data)) {
        this.res.write(String(data));
      } else
      if (Buffer.isBuffer(data)) {
        this.res.write(data);
      } else {
        //stringify might return undefined in some cases
        this.res.write(JSON.stringify(data) || '');
      }
    },
    end: function(data) {
      if (arguments.length) {
        this.write(data);
      }
      this.req.emit('end');
      this.res.end();
    },
    die: function() {
      var args = toArray(arguments), status = '200', ctype = 'text/plain';
      if (args.length > 1 && /^\d{3}\b/.test(args[0])) {
        status = args.shift();
      }
      if (args.length > 1 && /^[\w-]+\/[\w-]+$/.test(args[0])) {
        ctype = args.shift();
      }
      this.clear(ctype, status);
      for (var i = 0; i < args.length; i++) {
        this.write(args[i]);
      }
      this.end();
    },
    redirect: function(url, type) {
      if (type == 'html') {
        this.html_redirect(url);
      }
      if (type == '301') {
        this.res.status('301 Moved Permanently');
      } else
      if (type == '303') {
        this.res.status('303 See Other');
      } else {
        this.res.status('302 Moved');
      }
      this.res.headers('Location', url);
      this.res.end();
    },
    html_redirect: function(url) {
      var tmpl = require('tmpl')
        , markup = app.cfg('html_redir');
      if (tmpl && markup) {
        this.res.clear('text/html');
        this.res.write(tmpl.renderContent(markup, {redir: url}));
        this.res.end();
      }
    }
  };

  module.exports = Response;

});