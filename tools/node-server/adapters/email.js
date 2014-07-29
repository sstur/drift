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
    throw new Error('Not implemented: sendEmail');
  };

});