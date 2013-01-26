/*global app, define */
define('email', function(require, exports) {
  "use strict";

  var REG_EMAIL = /^[\w!#$%&'*+\/=?^`{|}~-]+(\.[\w!#$%&'*+\/=?^`{|}~-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

  exports.isEmail = function(str) {
    return !!String(str).match(REG_EMAIL);
  };

  /**
   * Construct and Send an Email using SMTP
   * SMTP relay must be specified in application config
   *
   */
  exports.sendEmail = function(opts) {
    var mail = new ActiveXObject('CDO.Message')
      , fields = mail.configuration.fields
      , prefix = 'http://schemas.microsoft.com/cdo/configuration/';
    fields.item(prefix + 'sendusing').value = 2;
    fields.item(prefix + 'smtpserver').value = app.cfg('smtp/host') || 'localhost';
    fields.item(prefix + 'smtpserverport').value = app.cfg('smtp/port') || '25';
    if (app.cfg('smtp/user') && app.cfg('smtp/pass')) {
      fields.item(prefix + 'smtpauthenticate').value = 1;
      fields.item(prefix + 'sendusername').value = app.cfg('smtp/user');
      fields.item(prefix + 'sendpassword').value = app.cfg('smtp/pass');
    }
    fields.update();
    mail.to = opts.to;
    if (opts.cc) mail.cc = opts.cc;
    if (opts.bcc) mail.bcc = opts.bcc;
    mail.from = opts.from || 'no-reply@localhost';
    if (opts.replyTo) mail.replyTo = opts.replyTo;
    mail.subject = opts.subject;
    if (opts.textBody) mail.textBody = opts.textBody;
    if (opts.htmlBody) mail.htmlBody = opts.htmlBody;
    try {
      mail.send();
    } catch (e) {
      throw new Error('Error Sending Email: ' + e.message);
    }
  };

});