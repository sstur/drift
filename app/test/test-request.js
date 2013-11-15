/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var expect = require('expect');
  var Request = require('request');
  //var Response = require('response');
  var AdapterRequest = require('mock-request');
  //var AdapterResponse = require('mock-response');

  function getRequest(cfg) {
    return new Request(new AdapterRequest(cfg));
  }

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
    'qs parse': function() {
      var req = getRequest('/go?a=1&B=2');
      expect(req.query()).to.eql({a: '1', b: '2'});
    },
    'unicode escaped': function() {
      var req = getRequest('/f%FCr/f%fcr?a=f%3D%3dr');
      expect(req.url('raw')).to.be('/f%FCr/f%fcr?a=f%3D%3dr');
      expect(req.url('rawPath')).to.be('/f%FCr/f%fcr');
      expect(req.url('path')).to.be('/für/für');
      expect(req.url('search')).to.be('?a=f%3D%3dr');
      expect(req.url('qs')).to.be('a=f%3D%3dr');
      expect(req.query('a')).to.be('f==r');
    },
    'unicode utf8': function() {
      var req = getRequest('/f%C3%bcr?a=f%C3%bcr');
      expect(req.url('raw')).to.be('/f%C3%bcr?a=f%C3%bcr');
      expect(req.url('rawPath')).to.be('/f%C3%bcr');
      expect(req.url('path')).to.be('/für');
      expect(req.url('search')).to.be('?a=f%C3%bcr');
      expect(req.url('qs')).to.be('a=f%C3%bcr');
      expect(req.query('a')).to.be('für');
    }
  });

});