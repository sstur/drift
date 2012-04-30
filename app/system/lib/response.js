/*global app, define */
define('response', function(require, module) {
  "use strict";

  var Response = function(res) {
    this.res = res;
  };

  Response.prototype = {
    clear: function(type, status) {
      this.res.clear();
      if (type) {
        //hack to override application/json -> text/plain when not an xhr request
        if (type.match(/\/json$/) && !(/XMLHttpRequest/i).test(this.req.headers('x-requested-with'))) {
          this.res.headers('content-type', 'text/plain');
        } else {
          this.res.headers('content-type', type);
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
      } else {
        this.res.write(JSON.stringify(data));
      }
    },
    end: function() {
      //todo: req.trigger('destroy')
      this.res.end();
    },
    die: function() {
      var args = toArray(arguments), status = '200', ctype = 'text/plain';
      if (args.length > 1 && /^\d{3}$/.test(args[0])) {
        status = args.shift();
      }
      if (args.length > 1 && /^[\w-]+\/[\w-]+$/.test(args[0])) {
        ctype = args.shift();
      }
      this.res.clear(ctype, status);
      for (var i = 0; i < args.length; i++) {
        this.res.write(args[i]);
      }
      this.res.end();
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