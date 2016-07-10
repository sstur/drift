/*global app, adapter */
var nodemailer = require('nodemailer');
adapter.define('email', function(require, exports) {
  'use strict';

  var REG_EMAIL = /^[\w!#$%&'*+\/=?^`{|}~-]+(\.[\w!#$%&'*+\/=?^`{|}~-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

  exports.isEmail = function(str) {
    return !!String(str).match(REG_EMAIL);
  };

  var transport;

  /**
   * Construct and Send an Email using SMTP
   * SMTP relay must be specified in application config
   *
   */
  exports.sendEmail_ = function(opts, callback) {
    if (!transport) {
      var transportOpts = {
        host: app.cfg('smtp/host') || 'localhost',
        port: app.cfg('smtp/port') || '25'
      };
      if (app.cfg('smtp/user') && app.cfg('smtp/pass')) {
        transportOpts.auth = {
          user: app.cfg('smtp/user'),
          pass: app.cfg('smtp/pass')
        };
      }
      transport = nodemailer.createTransport(transportOpts);
    }
    var mail = {
      to: opts.to,
      from: opts.from || 'no-reply@localhost',
      subject: opts.subject
    };
    if (opts.cc) mail.cc = opts.cc;
    if (opts.bcc) mail.bcc = opts.bcc;
    if (opts.replyTo) mail.replyTo = opts.replyTo;
    if (opts.textBody) mail.text = opts.textBody;
    if (opts.htmlBody) mail.html = opts.htmlBody;
    transport.sendMail(mail, callback);

    /** callback result:
    { accepted: [ 'you@gmail.com' ],
      rejected: [],
      response: '250 Delivery in progress',
      envelope: { from: 'me@example.com', to: [ 'you@gmail.com' ] },
      messageId: '1406870701576-4ed21ade-a5d17bcf-612bc70f@example.com' }
    */

  };

});
