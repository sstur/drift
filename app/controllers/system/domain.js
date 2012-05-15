/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var api = require('nc-api');

  app.route('/system/domain/domain_register', function(req, res) {
    var domain = req.params('domain')
      , tlds = req.params('tld');
    domain = domain.replace(/^www\./i, '');
    domain = domain.replace(/\.(.*)/i, '');
    var domains = [];
    tlds.split(',').forEach(function(tld) {
      domains.push(domain + tld);
    });
    var result = api.checkDomains(domains);
    var data = {
      reseller: {name: 'Domain Company', domain: 'company.xappr.com'},
      domain: domain
    };
    if (result.errors) {
      data.errors = result.errors;
    } else {
      data.domains = result;
      //result.forEach(function(domain) {
      //  if (domain) {}
      //});
    }
    //res.end('text/plain', result);
    res.send('system/domain-search', data);
  });


});