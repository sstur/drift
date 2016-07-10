/*global app, define, apache, system */
/* eslint-disable one-var */
define('adapter-request', function(require, exports, module) {
  'use strict';

  var Buffer = require('buffer').Buffer;

  var special = {
    content_type: 'content-type',
    content_length: 'content-length'
  };

  function Request() {
    this._super = apache;
  }

  Object.assign(Request.prototype, {
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
    read: function(bytes) {
      return new Buffer(this._super.read(bytes));
    }
  });

  module.exports = Request;
});
