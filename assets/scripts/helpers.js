/*global jQuery, mocha */
jQuery(function($) {
  "use strict";

  mocha.setup({
    ui: 'bdd',
    globals: ['console']
  });

  var helpers = mocha.helpers || (mocha.helpers = {});

  helpers.request = function(url, opts, callback) {
    opts = opts || {};
    $.ajax({
      url: url,
      type: opts.method || 'get',
      data: opts.data,
      dataType: opts.type || 'json',
      success: function(data, textStatus, xhr) {
        //textStatus: "success", "notmodified"
        console.log({request: url, textStatus: textStatus});
        callback(null, data);
      },
      error: function(xhr, textStatus, ex) {
        //textStatus: "error", "timeout", "abort", or "parsererror"
        var error;
        if (textStatus == 'timeout') {
          error = new Error('HTTP Request Timed Out');
        } else
        if (textStatus == 'abort') {
          error = new Error('HTTP Request Aborted');
        } else
        if (textStatus == 'error') {
          if (xhr.status) {
            error = new Error('HTTP Request Returned: ' + xhr.status + ' ' + xhr.statusText);
            error.status = xhr.status;
          } else {
            error = new Error(xhr.statusText);
          }
        } else
        if (textStatus == 'parsererror') {
          error = new Error('Unable to parse HTTP Response: ' + xhr.status + ' ' + xhr.statusText);
        }
        console.log('Error: ', error);
        callback(error);
      }
    });
  };

  helpers.get = function(url, callback) {
    return helpers.request(url, {method: 'get'}, callback);
  };

  helpers.post = function(url, data, callback) {
    return helpers.request(url, {method: 'post', data: data}, callback);
  };

  helpers.clearCookies = function() {
    var cookies = document.cookie.split(';');
    cookies.forEach(function(cookie) {
      var name = cookie.trim().split('=')[0];
      $.removeCookie(name);
    });
  };

});