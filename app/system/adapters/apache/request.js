/*global app, define, apache, system */
define('adapter-request', function(require, exports, module) {
  "use strict";

  var qs = require('qs');
  var util = require('util');
  var Buffer = require('buffer').Buffer;
  var BodyParser = require('body-parser');

  var special = {
    content_type: 'content-type',
    content_length: 'content-length'
  };

  function Request() {
    this._super = apache;
  }

  util.extend(Request.prototype, {
    _get: function(n) {
      var key = n.replace(/-/g, '_').toUpperCase();
      return system.env[key] || system.env['HTTP_' + key] || '';
    },
    getMethod: function() {
      return this._get('request-method');
    },
    getURL: function() {
      return this._get('request-uri');
    },
    getHeaders: function() {
      if (!this._headers) {
        var headers = {}, all = system.env;
        Object.keys(all).forEach(function(n) {
          var key = n.toLowerCase(), val = all[n];
          if (special[key] || key.slice(0, 5) == 'http_') {
            key = key.replace(/^http_/, '').replace(/_/g, '-');
            headers[key] = headers[key] ? headers[key] + ', ' + val : val;
          }
        });
        this._headers = headers;
      }
      return this._headers;
    },
    getRemoteAddress: function() {
      return this._get('remote-host');
    },
    _read: function(bytes) {
      return new Buffer(this._super.read(bytes));
    },
    parseReqBody: function(parent) {
      var opts = {
        autoSavePath: ('autoSavePath' in parent) ? parent.autoSavePath : app.cfg('auto_save_uploads')
      };
      var parser = new BodyParser(this.getHeaders(), this._read.bind(this), opts);
      util.propagateEvents(parser, parent, 'file upload-progress');
      return parser.parse();
    }
  });

  module.exports = Request;
});