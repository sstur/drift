"use strict";

var http = require('http')
  , req = http.IncomingMessage.prototype
  , res = http.ServerResponse.prototype
  , fs = require('fs')
  , qs = require('../lib/qs.js')
  , path = require('path')
  , join = path.join
  , basename = path.basename
  , normalize = path.normalize
  , mime = require('mime')
  , utils = require('./http_utils')
  , inspect = require('util').inspect;

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
  console.log('send: http ' + code);
  if (!res.headerSent) {
    var headers = {'Content-Type': 'text/plain'};
    res.writeHead(code, null, headers);
    res.write(code + ' ' +  http.STATUS_CODES[code]);
  }
  res.end();
};

//log/report exception (http 50x)
res.sendError = function(err) {
  var req = this.req, res = this;
  console.log(err.stack || err.toString());
  if (!res.headerSent) {
    var headers = {'Content-Type': 'text/plain'};
    res.writeHead(500, 'Internal Error', headers);
    res.write(err.stack || inspect(err));
  }
  res.end();
};

res.tryStaticPath = function(path, fallback) {
  var req = this.req, res = this, url = req.url.split('?')[0];
  var assetPrefix = join('/', path, '/').toLowerCase();
  if (url.toLowerCase().indexOf(assetPrefix) == 0) {
    var opts = {root: join(global.basePath, path), path: url.slice(assetPrefix.length)};
    res.serveAsset(opts, fallback);
  } else {
    fallback();
  }
};

res.serveAsset = function(opts, fallback) {
  var req = this.req, res = this;

  if (!opts.path) throw new Error('path required');
  opts.enableCaching = true;
  opts.enableRanges = true;

  var get = ('GET' == req.method)
    , head = ('HEAD' == req.method);

  // ignore non-GET requests
  if (opts.getOnly && !get && !head) {
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
  if (root && path.indexOf(root) != 0) {
    return res.httpError(403);
  }

  var hidden = opts.hidden;

  // "hidden" file
  if (!hidden && basename(path)[0] == '.') {
    return fallback();
  }

  opts.path = path;
  res.sendFile(opts);
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
      fallback ? fallback() : res.sendError(new Error('Specified resource is a directory'));
      return;
    }

    // header fields
    if (!res.getHeader('Date')) {
      res.setHeader('Date', new Date().toUTCString());
    }

    //caching
    if (opts.enableCaching) {
      var maxAge = opts.maxAge || 0;
      if (!res.getHeader('Cache-Control')) {
        res.setHeader('Cache-Control', 'public, max-age=' + (maxAge / 1000));
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
    var type = opts.contentType || mime.lookup(opts.path);
    if (!res.getHeader('Content-Type')) {
      var charset = mime.charsets.lookup(type);
      res.setHeader('Content-Type', type + (charset ? '; charset=' + charset : ''));
    }

    var contentDisposition;
    if (opts.attachment) {
      contentDisposition += 'attachment; ';
    }
    if (opts.filename) {
      //todo: normalize extended characters
      contentDisposition += 'filename="' + opts.filename.replace(/"/g, "'") + '"';
    }
    if (contentDisposition) {
      res.setHeader('Content-Disposition', contentDisposition);
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
