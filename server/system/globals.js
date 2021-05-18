/*!
 * Global Functions and Variables
 *   platforms not supporting ECMAScript 5 need ES5 shim loaded before this
 *
 * todo: Basic Date formatting
 */
/* eslint-disable one-var, no-extend-native */

(function() {
  'use strict';

  String.prototype.trimLeft = function() {
    return this.replace(/^\s*/, '');
  };

  String.prototype.trimRight = function() {
    return this.replace(/\s*$/, '');
  };

  String.prototype.padLeft = function(num, str) {
    var r = String(this),
      len = r.length;
    return len < num ? new Array(num - len + 1).join(str) + r : r;
  };

  String.prototype.padRight = function(num, str) {
    var r = String(this),
      len = r.length;
    return len < num ? r + new Array(num - len + 1).join(str) : r;
  };

  String.prototype.startsWith = function(str) {
    var self = this,
      re = new RegExp('^' + escapeRegExp(str), 'i');
    return !!String(self).match(re);
  };

  String.prototype.endsWith = function(str) {
    var self = this,
      re = new RegExp(escapeRegExp(str) + '$', 'i');
    return !!String(self).match(re);
  };

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
})();
