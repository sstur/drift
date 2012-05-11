/*global app, define */
define('messenger', function(require, exports, module) {
  "use strict";

  var REG_CHARS = /[^\x20-\x7E]/g;
  var REG_CONSTR = /^new (Error|Date|Buffer)\(.*\)$/;

  function Messenger(stdin, stdout) {
    this.readStream = stdin;
    this.writeStream = stdout;
    this._count = 0;
  }

  Messenger.prototype = {
    send: function(query, data) {
      var message = {
        id: ++this._count,
        query: query,
        payload: data
      };
      message = JSON.stringify(message);
      message = message.replace(REG_CHARS, encodeChars) + '\r\n';
      this.writeStream.write(message);
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