(function() {
  "use strict";

  var EventEmitter = require('events').EventEmitter;

  var REG_CHARS = /[^\x20-\x7E]/g;

  function Messenger(writeStream, readStream) {
    EventEmitter.call(this);
    this.readStream = readStream;
    this.writeStream = writeStream;
    this._msgNum = 0;
    this.writeStream.on('data', function() {

    });
  }

  Messenger.prototype = Object.create(EventEmitter.prototype);

  Messenger.prototype.sendMessage = function(data, callback) {
    var readStream = this.readStream, msgNum = ++this._msgNum, chunks = [], self = this;
    readStream.on('data', function handler(data) {
      data = data.toString();
      console.log('data', data);
      chunks.push(data);
      if (~data.indexOf('\n')) {
        readStream.removeListener('data', handler);
        var message = JSON.parse(chunks.join(''));
        callback(null, message);
        self.emit('message', message);
      }
    });
    this.writeStream.write(JSON.stringify({id: msgNum, data: data}).replace(REG_CHARS, encodeChars) + '\r\n');
  };


  function encodeChars(ch) {
    return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
  }

  module.exports = Messenger;

})();