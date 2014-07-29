/*global global, require */
(function() {
  "use strict";

  var http = require('http');
  var req = http.IncomingMessage.prototype;
  var res = http.ServerResponse.prototype;
  var fs = require('fs');
  var qs = require('querystring');
  var path = require('path');
  var mimeTypes = require('../lib/mime');
  var utils = require('./http-utils');
  var inspect = require('util').inspect;

  var join = path.join;
  var basename = path.basename;
  var normalize = path.normalize;

  var pkgConfig = require('../package-config.js');

  //var INVALID_CHARS = /[\x00-\x1F\\\/:*?<>|&%",\u007E-\uFFFF]/g;
  var INVALID_CHARS = /[^\w\d!#$'()+,\-;=@\[\]^`{}~]/g;

  //Patch ServerRequest to save unmodified copy of headers
  var _addHeaderLine = req._addHeaderLine;
  req._addHeaderLine = function(field, value) {
    var list = this.complete ?
        (this.allTrailers || (this.allTrailers = {})) :
        (this.allHeaders || (this.allHeaders = {}));
    if (field in list) {
      list[field].push(value);
    } else {
      list[field] = [value];
    }
    _addHeaderLine.call(this, field, value);
  };

  //Provide a public "header sent" flag until node does.
  res.__defineGetter__('headerSent', function() {
    return this._header;
  });

  //Send an http error (40x, except 404)
  res.httpError = function(code) {
    var req = this.req, res = this;
    if (!res.headerSent) {
      var headers = {'Content-Type': 'text/plain'};
      res.writeHead(code, null, headers);
      res.write(code + ' ' +  http.STATUS_CODES[code]);
    }
    res.end();
  };

  //log/report exception (http 50x)
  //todo: don't send full file paths in response
  res.sendError = function(err) {
    var req = this.req, res = this;
    console.log(err.stack || err.toString());
    var TRACE = /\s*(.*?)\s*(?:\((.*?):(\d+):(\d+)\))?$/;
    if (!res.headerSent) {
      var status = 500, headers = {'Content-Type': 'text/plain'}, body;
      if (isAjax(req)) {
        //status = 200;
        var stack = err.stack ? err.stack.split('\n').slice(1) : [];
        stack = stack.map(function(line) {
          var match = line.match(TRACE);
          return {call: match[1].replace('at ', ''), file: match[2] || '', line: match[3] || '', pos: match[4] || ''};
        });
        var details = {
          _status: '500',
          error: err.message || '',
          details: stack.shift()
        };
        details.details.stack = stack;
        //todo: jsonp should wrap JSON and send 200
        body = JSON.stringify(details, null, 2);
      } else {
        body = err.stack || inspect(err);
      }
      res.writeHead(status, 'Internal Error', headers);
      res.write(body + '\n');
    }
    res.end();
  };

  res.tryStaticPath = function(paths, callback) {
    var req = this.req;
    var res = this;
    var url = req.url.split('?')[0];
    var tryStatic = [];
    paths = Array.isArray(paths) ? paths : [paths];
    paths.forEach(function(path) {
      var assetPrefix = urlJoin('/', path, '/').toLowerCase();
      if (url.toLowerCase().indexOf(assetPrefix) === 0) {
        //root here is filesystem path
        tryStatic.push({root: global.basePath, path: rewrite(req, url)});
      }
    });
    if (!tryStatic.length) {
      return callback();
    }
    var i = 0;
    (function next() {
      if (tryStatic[i]) {
        res.serveAsset(tryStatic[i++], next);
      } else {
        callback();
      }
    })();
  };

  res.serveAsset = function(opts, fallback) {
    var req = this.req;
    var res = this;

    if (!opts.path) throw new Error('path required');

    var isGet = ('GET' == req.method);
    var isHead = ('HEAD' == req.method);

    // ignore non-GET requests
    if (opts.getOnly && !isGet && !isHead) {
      return fallback();
    }

    // parse url
    var path = qs.unescape(opts.path);

    // null byte(s)
    if (~path.indexOf('\0')) {
      return res.httpError(400);
    }

    var root = opts.root ? normalize(opts.root) : null;
    // when root is not given, consider .. malicious
    if (!root && ~path.indexOf('..')) {
      return res.httpError(403);
    }

    // join / normalize from optional root dir
    path = normalize(join(root, path));

    // malicious path
    if (root && path.indexOf(root) !== 0) {
      return res.httpError(403);
    }

    var hidden = opts.hidden;

    // "hidden" file
    if (!hidden && basename(path)[0] == '.') {
      return fallback();
    }

    opts.path = path;
    opts.charset = false; //don't assume any charset for asset
    opts.enableRanges = true;
    opts.enableCaching = true;
    res.sendFile(opts, fallback);
  };

  res.sendFile = function(opts, fallback) {
    var req = this.req, res = this;
    fs.stat(opts.path, function(err, stat) {

      // ignore ENOENT
      if (err) {
        if (fallback && (err.code == 'ENOENT' || err.code == 'ENAMETOOLONG')) {
          fallback();
        } else {
          res.sendError(err);
        }
        return;
      } else
      if (stat.isDirectory()) {
        if (fallback) {
          fallback();
        } else {
          res.sendError(new Error('Specified resource is a directory'));
        }
        return;
      }

      // header fields
      if (!res.getHeader('Date')) {
        res.setHeader('Date', new Date().toUTCString());
      }

      //caching
      if (opts.enableCaching) {
        var maxAge = opts.maxAge || 0
          , cacheControl = opts.cacheControl || 'public, max-age=' + (maxAge / 1000);
        //opts.cacheControl === false disables this header completely
        if (!res.getHeader('Cache-Control') && opts.cacheControl !== false) {
          res.setHeader('Cache-Control', cacheControl);
        }
        if (!res.getHeader('Last-Modified')) {
          res.setHeader('Last-Modified', stat.mtime.toUTCString());
        }
      }

      //ranges (download partial/resuming)
      if (opts.enableRanges) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      // mime/content-type
      if (!res.getHeader('Content-Type')) {
        var contentType = opts.contentType || mimeTypes.getMime(opts.path) || 'application/octet-stream';
        //opts.charset === false disables charset completely
        //if (opts.charset !== false) {
        //  var charset = opts.charset || mimeTypes.charsets.lookup(contentType);
        //  if (charset) contentType += '; charset=' + charset;
        //}
        res.setHeader('Content-Type', contentType);
      }

      var contentDisp = [];
      if (opts.attachment) {
        contentDisp.push('attachment');
      }
      if (opts.filename) {
        contentDisp.push('filename="' + stripFilename(opts.filename) + '"');
      }
      if (contentDisp.length) {
        res.setHeader('Content-Disposition', contentDisp.join('; '));
      }

      // conditional GET support
      if (opts.enableCaching && utils.conditionalGET(req)) {
        if (!utils.modified(req, res)) {
          return utils.notModified(res);
        }
      }

      var streamOpts = {}, len = stat.size;

      // we have a Range request
      var ranges = req.headers.range;
      if (opts.enableRanges && ranges && (ranges = utils.parseRange(len, ranges))) {
          streamOpts.start = ranges[0].start;
          streamOpts.end = ranges[0].end;

          // unsatisfiable range
          if (streamOpts.start > len - 1) {
            res.setHeader('Content-Range', 'bytes */' + stat.size);
            return res.httpError(416);
          }

          // limit last-byte-pos to current length
          if (streamOpts.end > len - 1) streamOpts.end= len - 1;

          // Content-Range
          len = streamOpts.end - streamOpts.start + 1;
          res.statusCode = 206;
          res.setHeader('Content-Range', 'bytes ' + streamOpts.start + '-' + streamOpts.end + '/' + stat.size);
      }

      res.setHeader('Content-Length', len);

      // transfer
      if (req.method == 'HEAD') {
        return res.end();
      }

      // stream
      var stream = fs.createReadStream(opts.path, streamOpts);
      req.on('close', stream.destroy.bind(stream));
      stream.pipe(res);

      stream.on('error', function(err) {
        if (res.headerSent) {
          console.error(err.stack);
          req.destroy();
        } else {
          res.sendError(err);
        }
      });
    });
  };


  /*!
   * Helpers
   *
   */

  function rewrite(req, url) {
    var rules = pkgConfig.static_assets_rewrite || {};
    Object.keys(rules).forEach(function(search) {
      var replace = rules[search];
      if (search.charAt(0) === '^') {
        search = new RegExp(search, 'i');
      }
      replace = subHeaders(req, replace);
      url = url.replace(search, replace);
    });
    return url;
  }

  function subHeaders(req, str) {
    return str.replace(/\{HTTP_(.+)\}/, function(_, name) {
      name = name.toLowerCase().replace(/_/g, '-');
      var value = req.headers[name] || '';
      //special case the host to not include :port
      if (name === 'host') {
        value = value.split(':')[0];
      }
      return value;
    });
  }

  function urlJoin() {
    var path = join.apply(null, arguments);
    return path.replace(/\\/g, '/');
  }

  function isAjax(req) {
    //todo: check accepts, x-requested-with, and qs (jsonp/callback)
    return false;
    //return (req.headers['x-requested-with'] || '').toLowerCase() == 'xmlhttprequest';
  }

  //simplified version of util.stripFilename()
  function stripFilename(filename) {
    filename = String(filename);
    return filename.replace(INVALID_CHARS, function(c) {
      return encodeURIComponent(c);
    });
  }

})();