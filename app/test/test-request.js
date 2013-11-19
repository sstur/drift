/*global app, define */
app.on('ready', function(require) {
  "use strict";

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
        field_name: 'username',
        field_value: 'simo',
        file_name: 'avatar',
        file_value: 'image.gif',
        file_type: 'image/gif',
        file_data: file
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
    var body = '--__BOUNDARY__|Content-Disposition: form-data; name="__FIELD1_NAME__"||__FIELD1_VALUE__|--__BOUNDARY__|Content-Disposition: form-data; name="__FILE1_NAME__"; filename="__FILE1_FILENAME__"|Content-Type: __FILE1_TYPE__||__FILE1_DATA__|--__BOUNDARY__--';
    body = body.split('|').join('\r\n');
    body = body.split('__BOUNDARY__').join(cfg.boundary);
    body = body.split('__FIELD1_NAME__').join(cfg.field_name);
    body = body.split('__FIELD1_VALUE__').join(cfg.field_value);
    body = body.split('__FILE1_NAME__').join(cfg.file_name);
    body = body.split('__FILE1_FILENAME__').join(cfg.file_value);
    body = body.split('__FILE1_TYPE__').join(cfg.file_type || 'application/octet-stream');
    var data = cfg.file_data;
    if (Buffer.isBuffer(data)) {
      data = data.toString('binary');
    }
    body = body.split('__FILE1_DATA__').join(data);
    return new Buffer(body, 'binary');
  }

});