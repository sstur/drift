/*global app, define */
define('messenger', function(require, exports, module) {
  "use strict";

  //possibly used when eval'ing
  var Buffer = require('buffer').Buffer;

  var REG_CHARS = /[^\x20-\x7E]/g;
  var REG_CONSTR = /^new (Error|Date|Buffer)\(.*\)$/;

  var statusCodes = {
    'ready': '1'
  };

  function Messenger(stdin, stdout) {
    this.readStream = stdin;
    this.writeStream = stdout;
    this._count = 0;
  }

  Messenger.prototype = {
    notify: function(status) {
      this.writeStream.write(statusCodes[status] || '0');
    },
    send: function(query, data) {
      var message = {
        id: ++this._count,
        query: query,
        payload: data
      };
      message = JSON.stringify(message);
      message = message.replace(REG_CHARS, encodeChars) + '\n';
      this.writeStream.write(message);
    },
    query: function(query, data) {
      if (query) {
        this.send(query, data);
      }
      var response = this.readStream.readLine();
      response = JSON.parse(response, reviver);
      if (response.error) {
        throw response.error;
      }
      return response.data;
    }
  };

  app.eventify(Messenger.prototype);

  //helpers

  function reviver(key, val) {
    if (typeof val == 'string' && val.match(REG_CONSTR)) {
      return new Function('return ' + val)();
    }
    return val;
  }

  function encodeChars(ch) {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  }

  module.exports = Messenger;

});