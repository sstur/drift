/*global app, define */
app.on('ready', function(require) {
  "use strict";

  app.route('/reseller/home/home', function(req, res) {
    res.send('reseller/home', {
      reseller: {name: 'Domain Company', id: 'R3765', domain: 'company.xappr.com'}
    });
  });


});