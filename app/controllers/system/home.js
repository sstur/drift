/*global app, define */
app.on('ready', function(require) {
  "use strict";

  app.route('/system/home/home', function(req, res) {
    res.send('system/home', {
      reseller: {name: 'Domain Company', domain: 'company.xappr.com'}
    });
  });


});