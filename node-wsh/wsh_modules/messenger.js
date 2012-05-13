/*global app, define */
define('messenger', function(require, exports, module) {
  "use strict";

  var util = require('util'), fs = require('fs');

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
      message = util.stringify(message) + '\n';
      this.writeStream.write(message);
    },
    query: function(query, data) {
      if (query) {
        this.send(query, data);
      }
      var response = this.readStream.readLine();
      response = util.parse(response);
      if (response.error) {
        throw response.error;
      }
      return response.data;
    }
  };

  app.eventify(Messenger.prototype);

  module.exports = Messenger;

});