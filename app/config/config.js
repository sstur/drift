define('config', function(require, exports, module) {
  "use strict";

  module.exports = {
    //if we are intentionally embedding the routes in the query
    virtual_url: true,
    //variables passed to template engine
    template_defaults: {
      reseller: {name: 'Domain Company', domain: 'company.xappr.com'}
    }
  };

});