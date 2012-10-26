/*global app, define */
//Helpers for Cross-origin resource sharing
app.on('request', function(req, res) {
  "use strict";

  var TYPES = {'application/x-www-form-urlencoded': 1, 'application/json': 1};

  //fix for IE < 10 using XDomainRequest which will POST only text/plain
  if (req.method('post') && req.headers('content-type') == 'text/plain') {
    var contentType = req.params('content-type');
    if (contentType in TYPES) {
      req._headers['content-type'] = contentType;
    }
  }

  var _isAjax = req.isAjax;
  req.isAjax = function() {
    return (_isAjax.call(this) || !!this.headers('origin'));
  };


});