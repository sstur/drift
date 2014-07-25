(function() {
  "use strict";

  /**
   * Check `req` and `res` to see if it has been modified.
   *
   * @param {IncomingMessage} req
   * @param {ServerResponse} res
   * @return {Boolean}
   * @api private
   */
  exports.modified = function(req, res, headers) {
    headers = headers || res._headers || {};
    var modifiedSince = req.headers['if-modified-since']
      , lastModified = headers['last-modified']
      , noneMatch = req.headers['if-none-match']
      , etag = headers.etag;

    if (noneMatch) noneMatch = noneMatch.split(/ *, */);

    // check If-None-Match
    if (noneMatch && etag && ~noneMatch.indexOf(etag)) {
      return false;
    }

    // check If-Modified-Since
    if (modifiedSince && lastModified) {
      modifiedSince = new Date(modifiedSince);
      lastModified = new Date(lastModified);
      // Ignore invalid dates
      if (!isNaN(modifiedSince.getTime())) {
        if (lastModified <= modifiedSince) return false;
      }
    }

    return true;
  };

  /**
   * Strip `Content-*` headers from `res`.
   *
   * @param {ServerResponse} res
   * @api private
   */
  exports.removeContentHeaders = function(res) {
    Object.keys(res._headers).forEach(function(field) {
      if (0 === field.indexOf('content')) {
        res.removeHeader(field);
      }
    });
  };

  /**
   * Check if `req` is a conditional GET request.
   *
   * @param {IncomingMessage} req
   * @return {Boolean}
   * @api private
   */
  exports.conditionalGET = function(req) {
    return req.headers['if-modified-since'] || req.headers['if-none-match'];
  };

  /**
   * Respond with 304 "Not Modified".
   *
   * @param {ServerResponse} res
   * @param {Object} headers
   * @api private
   */
  exports.notModified = function(res) {
    exports.removeContentHeaders(res);
    res.statusCode = 304;
    res.end();
  };

  /**
   * Parse "Range" header `str` relative to the given file `size`.
   *
   * @param {Number} size
   * @param {String} str
   * @return {Array}
   * @api private
   */
  exports.parseRange = function(size, str) {
    var valid = true;
    var arr = str.substr(6).split(',').map(function(range) {
      range = range.split('-');
      var start = parseInt(range[0], 10)
        , end = parseInt(range[1], 10);

      // -500
      if (isNaN(start)) {
        start = size - end;
        end = size - 1;
      // 500-
      } else if (isNaN(end)) {
        end = size - 1;
      }

      // Invalid
      if (isNaN(start) || isNaN(end) || start > end || start < 0)
        valid = false;

      return {
        start: start,
        end: end
      };
    });

    return valid ? arr : null;
  };

})();