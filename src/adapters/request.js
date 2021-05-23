'use strict';

const { eventify } = require('../eventify');

const BodyParser = require('./body-parser');

function Request(req) {
  //node's incoming http request
  this._super = req;
  //pause so that we can use the body parser later
  req.pause();
}
eventify(Request.prototype);

Object.assign(Request.prototype, {
  getMethod: function() {
    return this._super.method;
  },
  getURL: function() {
    return this._super.url;
  },
  getHeaders: function() {
    return this._super.headers;
  },
  getRemoteAddress: function() {
    return this._super.connection.remoteAddress;
  },
  getBodyParser: function(opts) {
    return new BodyParser(this.getHeaders(), this._super, opts);
  },
  // eslint-disable-next-line no-unused-vars
  read: function(bytes) {
    throw new Error('Body Parser: request.read() not implemented');
  },
});

module.exports = Request;
