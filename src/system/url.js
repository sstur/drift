/* eslint-disable one-var */
define('url', function(require, exports) {
  'use strict';

  exports.parse = function(url) {
    var parts = url.match(
      /^ *((https?):\/\/)?([^:\/]+)(:([0-9]+))?([^\?]*)(\?.*)?$/,
    );
    var parsed = {
      protocol: parts[2] ? parts[2].toLowerCase() + ':' : 'http:',
      hostname: parts[3] ? parts[3].toLowerCase() : '',
      port: parts[5],
      pathname: parts[6] || '/',
      search: parts[7] || '',
    };
    parsed.port = parsed.port || (parts[2] == 'https' ? 443 : 80);
    parsed.host = parsed.hostname + ':' + parsed.port;
    parsed.path = parsed.pathname + parsed.search;
    return parsed;
  };

  exports.resolve = function(oldUrl, newUrl) {
    var ret;
    if (~newUrl.indexOf('://')) {
      //absolute URI, standards compliant
      ret = newUrl;
    } else {
      var i =
        newUrl.charAt(0) == '/'
          ? oldUrl.indexOf('/', 8)
          : oldUrl.lastIndexOf('/') + 1;
      ret = oldUrl.slice(0, i) + newUrl;
      ret = exports.normalize(ret);
    }
    return ret;
  };

  exports.normalize = function(url) {
    var base = '',
      path = url,
      search = '',
      pos;
    if (~url.indexOf('://')) {
      if (~(pos = url.indexOf('/', 8))) {
        base = url.slice(0, pos);
        path = url.slice(pos);
      } else {
        //has no path
        base = url;
        path = '/';
      }
    }
    if (~(pos = path.indexOf('?'))) {
      search = path.slice(pos);
      path = path.slice(0, pos - 1);
    }
    var oldPath;
    while (path !== oldPath) {
      //console.log((oldPath || '') + ' || ' + path);
      oldPath = path;
      path = path.replace(/\/+/g, '/');
      path = path.replace(/\/\.(\/|$)/g, '$1');
      path = path.replace(/(\/[^\/]+)?\/\.\.(\/|$)/g, '/');
    }
    return base + path + search;
  };
});
