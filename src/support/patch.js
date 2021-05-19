/* eslint-disable one-var, consistent-this */
'use strict';

var http = require('http');
var ServerResponse = http.ServerResponse;
var fs = require('fs');
var qs = require('querystring');
var path = require('path');
var mimeTypes = require('../lib/mime');
var utils = require('./http-utils');

var join = path.join;
var basename = path.basename;
var normalize = path.normalize;

//var INVALID_CHARS = /[\x00-\x1F\\\/:*?<>|&%",\u007E-\uFFFF]/g;
var INVALID_CHARS = /[^\w\d!#$'()+,\-;=@\[\]^`{}~]/g;

//Send an http error (40x, except 404)
ServerResponse.prototype.httpError = function(code) {
  var res = this;
  if (!res.headersSent) {
    var headers = { 'Content-Type': 'text/plain' };
    res.writeHead(code, null, headers);
    res.write(code + ' ' + http.STATUS_CODES[code]);
  }
  res.end();
};

//log/report exception (http 50x)
//todo: don't send full file paths in response
ServerResponse.prototype.sendError = function(err) {
  var res = this;
  console.log(err.stack || err.toString());
  if (!res.headersSent) {
    var status = 500,
      headers = { 'Content-Type': 'text/plain' },
      body;
    body = err.stack;
    res.writeHead(status, 'Internal Error', headers);
    res.write(body + '\n');
  }
  res.end();
};

ServerResponse.prototype.tryStaticPath = function(paths, callback) {
  var req = this.req;
  var res = this;
  var url = req.url.split('?')[0];
  var tryStatic = [];
  paths = Array.isArray(paths) ? paths : [paths];
  paths.forEach(function(path) {
    var assetPrefix = urlJoin('/', path, '/').toLowerCase();
    if (url.toLowerCase().indexOf(assetPrefix) === 0) {
      //root here is filesystem path
      tryStatic.push({ root: global.basePath, path: url });
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

ServerResponse.prototype.serveAsset = function(opts, fallback) {
  var req = this.req;
  var res = this;

  if (!opts.path) throw new Error('path required');

  var isGet = req.method == 'GET';
  var isHead = req.method == 'HEAD';

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

ServerResponse.prototype.sendFile = function(opts, fallback) {
  var req = this.req,
    res = this;
  fs.stat(opts.path, function(err, stat) {
    // ignore ENOENT
    if (err) {
      if (fallback && (err.code == 'ENOENT' || err.code == 'ENAMETOOLONG')) {
        fallback();
      } else {
        res.sendError(err);
      }
      return;
    } else if (stat.isDirectory()) {
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
      var maxAge = opts.maxAge || 0,
        cacheControl = opts.cacheControl || 'public, max-age=' + maxAge / 1000;
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
      var contentType =
        opts.contentType ||
        mimeTypes.getMime(opts.path) ||
        'application/octet-stream';
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

    var streamOpts = {},
      len = stat.size;

    // we have a Range request
    var ranges = req.headers.range;
    if (
      opts.enableRanges &&
      ranges &&
      (ranges = utils.parseRange(len, ranges))
    ) {
      streamOpts.start = ranges[0].start;
      streamOpts.end = ranges[0].end;

      // unsatisfiable range
      if (streamOpts.start > len - 1) {
        res.setHeader('Content-Range', 'bytes */' + stat.size);
        return res.httpError(416);
      }

      // limit last-byte-pos to current length
      if (streamOpts.end > len - 1) streamOpts.end = len - 1;

      // Content-Range
      len = streamOpts.end - streamOpts.start + 1;
      res.statusCode = 206;
      res.setHeader(
        'Content-Range',
        'bytes ' + streamOpts.start + '-' + streamOpts.end + '/' + stat.size,
      );
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
      if (res.headersSent) {
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

function urlJoin() {
  var path = join.apply(null, arguments);
  return path.replace(/\\/g, '/');
}

//simplified version of util.stripFilename()
function stripFilename(filename) {
  filename = String(filename);
  return filename.replace(INVALID_CHARS, function(c) {
    return encodeURIComponent(c);
  });
}
