/* eslint-disable one-var */
'use strict';
const _http = require('http');
const _https = require('https');

const qs = require('../system/qs');
const url = require('../system/url');
const { toFiber } = require('../toFiber');

//url helpers
var parseUrl = url.parse;

var BODY_ALLOWED = { POST: 1, PUT: 1 };

var httpReqHeaders =
  'Accept Accept-Charset Accept-Encoding Accept-Language Accept-Datetime Authorization ' +
  'Cache-Control Connection Cookie Content-Length Content-MD5 Content-Type Date Expect From Host If-Match ' +
  'If-Modified-Since If-None-Match If-Range If-Unmodified-Since Max-Forwards Pragma Proxy-Authorization ' +
  'Range Referer TE Upgrade User-Agent Via Warning X-Requested-With X-Do-Not-Track X-Forwarded-For ' +
  'X-ATT-DeviceId X-Wap-Profile';

//index headers by lowercase
httpReqHeaders = httpReqHeaders.split(' ').reduce(function(headers, header) {
  headers[header.toLowerCase()] = header;
  return headers;
}, {});

var request = (exports.request = toFiber(function(opts, callback) {
  //todo: organize into ClientRequest and ClientResponse
  if (opts.params) {
    opts.path =
      opts.path +
      (~opts.path.indexOf('?') ? '&' : '?') +
      qs.stringify(opts.params);
  }
  opts.headers = opts.headers || {};
  opts.method = opts.method ? opts.method.toUpperCase() : 'GET';
  //normalize header case
  var headers = {};
  for (var n in opts.headers) {
    if (opts.headers.hasOwnProperty(n)) {
      headers[httpReqHeaders[n.toLowerCase()] || n] = opts.headers[n];
    }
  }
  opts.headers = headers;

  //set length and default content type
  if (opts.method in BODY_ALLOWED) {
    //opts.data as alias for opts.body
    opts.body = opts.body || opts.data;
    //url encode if body is a plain object
    if (!Buffer.isBuffer(opts.body) && typeof opts.body !== 'string') {
      opts.body = qs.stringify(opts.body || {});
    }
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    if (!headers['Content-Length']) {
      headers['Content-Length'] = String(opts.body.length);
    }
  }

  var http = opts.protocol == 'https:' ? _https : _http;

  var req = http.request(opts, function(res) {
    var body = [];
    res.on('data', function(data) {
      body.push(data);
    });
    res.on('end', function() {
      res.body = Buffer.concat(body);
      if (opts.enc) {
        res.body = res.body.toString(opts.enc);
      }
      var data = {
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body,
      };
      callback(null, data);
    });
  });
  req.on('error', function(err) {
    callback(err);
  });
  if (opts.body) {
    req.write(opts.body);
  }
  // Allow caller to stream a request body. In this case the caller will be
  // responsible for calling .end()
  if (typeof opts.onReady === 'function') {
    opts.onReady(req);
  } else {
    req.end();
  }
}));

exports.get = toFiber(function(opts, callback) {
  if (typeof opts == 'string') {
    opts = { url: opts };
  }
  if (opts.url) {
    Object.assign(opts, parseUrl(opts.url));
  }
  opts.method = 'GET';
  request(opts, callback);
});

exports.post = toFiber(function(opts, callback) {
  if (opts.url) {
    Object.assign(opts, url.parse(opts.url));
  }
  opts.method = 'POST';
  request(opts, callback);
});
