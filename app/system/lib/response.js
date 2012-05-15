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

  Response.prototype = {
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
      this.res.headers('Content-Type', type);
    },
    clear: function(type, status) {
      this.res.clear();
      if (type) {
        this.contentType(type);
      }
      if (status) {
        this.res.status(status);
      }
    },
    write: function(data) {
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
          this.res.status(args.shift());
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
      this.write(util.inspect(data));
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