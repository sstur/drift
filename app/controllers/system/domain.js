/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var api = require('nc-api');

  app.route('/system/domain/domain_register', function(req, res) {
    var domain = req.params('domain')
      , tlds = req.params('tld')
      , all_tlds = api.tlds;
    domain = domain.replace(/^www\./i, '');
    domain = domain.replace(/\.(.*)/i, '');
    var domains = [];
    if (~tlds.indexOf('all')) {
      tlds = all_tlds.join(',');
    }
    tlds.split(',').forEach(function(tld) {
      if (~all_tlds.indexOf(tld)) domains.push(domain + tld);
    });
    if (!tlds.length) {
      res.redirect('/system/home/home/');
    }
    var result = api.checkDomains(domains);
    var data = {
      reseller: {name: 'Domain Company', domain: 'company.xappr.com'},
      all_tlds: all_tlds,
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
    res.send('system/domain-search', data);
  });


});