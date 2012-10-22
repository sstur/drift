/*global app, define */
define('email', function(require, exports) {
  "use strict";

  var REG_EMAIL = /^[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

  exports.isEmail = function(str) {
    return !!String(str).match(REG_EMAIL);
  };

  /**
   * Construct and Send an Email using SMTP
   * SMTP relay must be specified in application config
   *
   */
  exports.sendEmail = function(opts) {
    var cdo = new ActiveXObject('CDO.Message')
      , cfg = cdo.configuration.fields
      , prefix = 'http://schemas.microsoft.com/cdo/configuration/';
    setProperty(cfg, prefix + 'sendusing', 2);
    setProperty(cfg, prefix + 'smtpserver', app.cfg('smtp/host') || 'localhost');
    setProperty(cfg, prefix + 'smtpserverport', app.cfg('smtp/port') || '25');
    if (app.cfg('smtp/user') && app.cfg('smtp/pass')) {
      setProperty(cfg, prefix + 'smtpauthenticate', 1);
      setProperty(cfg, prefix + 'sendusername', app.cfg('smtp/user'));
      setProperty(cfg, prefix + 'sendpassword', app.cfg('smtp/pass'));
    }
    cfg.update();
    cdo.to = opts.to;
    if (opts.cc) cdo.cc = opts.cc;
    if (opts.bcc) cdo.bcc = opts.bcc;
    cdo.from = opts.from || 'no-reply@localhost';
    if (opts.replyTo) cdo.replyTo = opts.replyTo;
    cdo.subject = opts.subject;
    if (opts.textBody) cdo.textBody = opts.textBody;
    if (opts.htmlBody) cdo.htmlBody = opts.htmlBody;
    try {
      cdo.send();
    } catch (e) {
      throw new Error('Error Sending Email: ' + e.description);
    }
  };

  function setProperty(obj, name, value) {
    obj(name)/*@remove{*/[0]/*}@*/ = value;
  }

});