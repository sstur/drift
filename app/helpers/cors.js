/*global app, define */

//Helpers for Cross-origin resource sharing

app.on('ready', function(require) {
  var Request = require('request');

  var _isAjax = Request.prototype.isAjax;
  Request.prototype.isAjax = function() {
    //IE 8/9 XDomainRequest does not allow adding headers like
    // X-Requested-With, but adds Origin
    return (_isAjax.call(this) || !!this.headers('origin'));
  };

});

app.on('request', function(req, res) {
  "use strict";

  var TYPES = {'application/x-www-form-urlencoded': 1, 'application/json': 1};

  //fix for IE 8/9 using XDomainRequest which will POST only text/plain
  if (req.method('post') && req.headers('content-type') == 'text/plain') {
    var contentType = req.params('content-type');
    if (contentType in TYPES) {
      req._headers['content-type'] = contentType;
    }
  }

});