define('nc-api', function(require, exports, module) {
  "use strict";

  var http = require('http');

  var self_ip = '110.174.212.150';
  var api_key = '98df5701e8e8458eabb72469d599414d';

  exports.checkDomains = function(domains) {
    var response = http.get({
      url: 'https://api.namecheap.com/xml.response',
      params: {
        ApiUser: 'blupin',
        ApiKey: api_key,
        UserName: 'blupin',
        ClientIp: self_ip,
        Command: 'namecheap.domains.check',
        DomainList: domains
      }
    });
    var xml = response.body.toString();
    var errors = getTags(xml, 'Error');
    if (errors.length) {
      return {errors: errors};
    }
    return getTags(xml, 'DomainCheckResult');
  };


  var RE_ENT = /&(amp|lt|gt);/g;
  var RE_ATTR = /([\w-]+)\s*=\s*"([^"]*)"/g;
  var RE_EMPTY_TAGS = /<([\w-]+)\s*(.*?)\s*\/>/g;
  var RE_CONTENT_TAGS = /<([\w-]+)\s*(.*?)\s*>(.*?)<\/\1\s*>/g;
  var entities = {amp: '&', lt: '<', gt: '>'};

  //<Error Number="1011105">Parameter ClientIP is invalid</Error>
  //<DomainCheckResult Domain="nc-panel.com" Available="true" />

  function getTags(xml, tagName) {
    var results = [];
    xml.replace(RE_EMPTY_TAGS, function(_, tag, attrs) {
      if (tag == tagName) {
        results.push(parseAttrs(attrs));
      }
    });
    xml.replace(RE_CONTENT_TAGS, function(_, tag, attrs, content) {
      if (tag == tagName) {
        attrs = parseAttrs(attrs);
        attrs.content = xmlDec(content);
        results.push(attrs);
      }
    });
    return results;
  }

  function parseAttrs(str) {
    var attrs = {};
    str.replace(RE_ATTR, function(_, n, val) {
      n = xmlDec(n).toLowerCase();
      attrs[n] = xmlDec(val);
    });
    return attrs;
  }

  function xmlDec(str) {
    return str.replace(RE_ENT, function(_, ent) {
      return entities[ent];
    });
  }

});