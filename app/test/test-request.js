/*!
 * todo: req body types
 * todo: res should throw null when invalid req body
 */
/*global app, define */
app.on('ready', function(require) {
  "use strict";

  app.route('/multipart', function(req, res) {
    var boundary = '__BOUNDARY__';
    var data = constructMultipart({
      boundary: boundary,
      fields: [{
        name: '__FIELD1_NAME__',
        value: '__FIELD1_VALUE__'
      }],
      files: [{
        name: '__FILE1_NAME__',
        filename: '__FILE1_FILENAME__',
        type: '__FILE1_TYPE__',
        data: '__FILE1_DATA__'
      }]
    });
    res.end(data.toString('binary'));
  });

  var crypto = require('crypto');
  var expect = require('expect');
  var Request = require('request');
  var Response = require('response');
  var AdapterRequest = require('mock-request');
  var AdapterResponse = require('mock-response');

  app.addTestSuite('request', {
    'url parsing': function() {
      var req = getRequest('/go?a=1');
      expect(req.url()).to.be('/go?a=1');
      expect(req.url('raw')).to.be('/go?a=1');
      expect(req.url('rawPath')).to.be('/go');
      expect(req.url('path')).to.be('/go');
      expect(req.url('search')).to.be('?a=1');
      expect(req.url('qs')).to.be('a=1');
    },
    'qs parsing': function() {
      var req = getRequest('/go?a=1&B=2');
      expect(req.query()).to.eql({a: '1', b: '2'});
    },
    'unicode path escaped': function() {
      var req = getRequest('/f%FCr/f%fcr?a=f%3D%3dr');
      expect(req.url('raw')).to.be('/f%FCr/f%fcr?a=f%3D%3dr');
      expect(req.url('rawPath')).to.be('/f%FCr/f%fcr');
      expect(req.url('path')).to.be('/für/für');
      expect(req.url('search')).to.be('?a=f%3D%3dr');
      expect(req.url('qs')).to.be('a=f%3D%3dr');
      expect(req.query('a')).to.be('f==r');
    },
    'unicode path utf8': function() {
      var req = getRequest('/f%C3%bcr?a=f%C3%bcr');
      expect(req.url('raw')).to.be('/f%C3%bcr?a=f%C3%bcr');
      expect(req.url('rawPath')).to.be('/f%C3%bcr');
      expect(req.url('path')).to.be('/für');
      expect(req.url('search')).to.be('?a=f%C3%bcr');
      expect(req.url('qs')).to.be('a=f%C3%bcr');
      expect(req.query('a')).to.be('für');
    },
    'method': function() {
      var req = getRequest({url: '/'});
      expect(req.method()).to.be('GET');
      expect(req.method('GET')).to.be(true);
      expect(req.method('POST')).to.be(false);
      req = getRequest({method: 'POST', url: '/'});
      expect(req.method()).to.be('POST');
      req = getRequest({method: 'PUT', url: '/'});
      expect(req.method('PUT')).to.be(true);
      req = getRequest({method: 'delete', url: '/'});
      expect(req.method('DELETE')).to.be(true);
      req = getRequest({url: '/', headers: {'X-HTTP-Method-Override': 'POST'}});
      expect(req.method()).to.be('POST');
      req = getRequest({url: '/?_method=head'});
      expect(req.method('head')).to.be(true);
    },
    'headers': function() {
      var req = getRequest({url: '/', headers: {'User-Agent': 'Mock'}});
      expect(req.headers('user-agent')).to.be('Mock');
      expect(req.headers('User-Agent')).to.be('Mock');
      req = getRequest({
        url: '/',
        headers: 'User-Agent: Mock\nX-Accel:None\r\nX-Double :a:b: c'
      });
      expect(req.headers('user-agent')).to.be('Mock');
      expect(req.headers('X-Accel')).to.be('None');
      expect(req.headers('X-Double')).to.be('a:b: c');
    },
    'isAjax': function() {
      var req = getRequest({url: '/', headers: 'X-Requested-With: XMLHttpRequest'});
      expect(req.headers('x-requested-with')).to.be('XMLHttpRequest');
      expect(req.isAjax()).to.be(true);
    },
    'cookie parsing': function() {
      var req = getRequest({url: '/', headers: 'Cookie: SID=VGcnZXqyEPtNSWa8Rd7fDyoJxR8OfYm2; EULA=1'});
      expect(req.cookies('sid')).to.be('VGcnZXqyEPtNSWa8Rd7fDyoJxR8OfYm2');
      expect(req.cookies('EULA')).to.be('1');
    },
    'body parsing': function() {
      var boundary = 'vXBUZWeMvYUeW9P6lxTi';
      var file = new Buffer('4749463839610100010080FF00C0C0C000000021F90401000000002C00000000010001000002024401003B', 'hex');
      var data = constructMultipart({
        boundary: boundary,
        fields: [{
          name: 'username',
          value: 'simo'
        }],
        files: [{
          name: 'avatar',
          filename: 'image.gif',
          type: 'image/gif',
          data: file
        }]
      });
      var req = getRequest({
        url: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': data.length
        },
        body: data
      });
      var body = req.body();
      expect(body.username).to.be('simo');
      expect(body.avatar.type).to.be('file');
      expect(body.avatar.name).to.be('avatar');
      expect(body.avatar.fileName).to.be('image.gif');
      expect(body.avatar.contentType).to.be('image/gif');
      expect(body.avatar.size).to.be(file.length);
      expect(body.avatar.hash).to.be(crypto.hash('md5', file).toString('hex'));
    }
  });

  function getRequest(cfg) {
    var aReq = new AdapterRequest(cfg);
    var req = new Request(aReq);
    var aRes = new AdapterResponse();
    var res = new Response(aRes);
    req.res = res;
    res.req = req;
    return req;
  }

  function constructMultipart(cfg) {
    var body = [];
    var boundary = cfg.boundary;
    var fields = cfg.fields || [];
    fields.forEach(function(field) {
      body.push('--' + boundary);
      body.push('Content-Disposition: form-data; name="' + encodeURI(field.name) + '"');
      body.push('');
      body.push(field.value);
    });
    var files = cfg.files || [];
    files.forEach(function(file) {
      body.push('--' + boundary);
      body.push('Content-Disposition: form-data; name="' + encodeURI(file.name) + '"; filename="' + encodeURI(file.filename) + '"');
      var type = file.type || 'application/octet-stream';
      body.push('Content-Type: ' + type);
      body.push('');
      var data = file.data;
      if (Buffer.isBuffer(data)) {
        data = data.toString('binary');
      }
      body.push(data);
    });
    body.push('--' + boundary + '--');
    body = body.join('\r\n')
    return new Buffer(body, 'binary');
  }

});