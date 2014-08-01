/*global app */
app.cfg({
  //this references package.json
  version: '{{package:version}}',

  //Filesystem directory for data (logs, uploads, etc)
  data_dir: 'data/',

  //Model persistence
  models: {
    database: 'mysql'
  },

  //MySQL Named Connections
  mysql: {
    utc_dates: true,
    connections: {
      'default': {server: 'mysql', database: 'test_js', username: 'test_js', password: 'p4uTAU9qla'}
    }
  },

  //remote address in http headers?
  remote_addr_header: 'X-Forwarded-For',

  logging: {
    //add response-time http header
    response_time: true,
    //0: log all, 1: errors only, 2: warnings, 3: trace
    verbosity: 2
  },

  //outgoing email server
  smtp: {
    host: 'smtp.sendgrid.net',
    port: '587',
    user: 'rqkalv',
    pass: 'pYcsSBsU8f'
  },

  //Template Engine
  template: {
    engine: 'jinja',
    defaults: {
      date_format: 'dS mmm yyyy h:MMtt'
    }
  }
});