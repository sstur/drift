(function() {
  'use strict';

  var fs = require('fs');
  var crypto = require('crypto');
  var request = require('request');

  var config = readJSON('config.json');

  //todo: move this to another module
  var data = {
    accounts: [{
      name: 'Simon',
      pri_contact: 'Simon Sturmer',
      pri_email: 'simon.sturmer@gmail.com',
      status: 'active',
      users: [{
        username: 'simon',
        password: 'd41d8cd98f00b204e9800998ecf8427e',
        status: 'admin'
      }, {
        username: 'tester',
        password: 'd41d8cd98f00b204e9800998ecf8427e',
        status: 'user'
      }],
      lists: [{
        name: 'Test List',
        status: 'active',
        contacts: [{
          f_name: 'Simon',
          l_name: 'Sturmer',
          email: 'simon@jsdemos.com',
          status: 'active'
        }, {
          f_name: 'Joe',
          l_name: 'Tester',
          email: 'tester@example.com',
          status: 'active'
        }, {
          f_name: 'Jane',
          l_name: 'Tester',
          email: 'jane@does-not-exist-8f00b204e.com',
          status: 'active'
        }]
      }],
      templates: [{
        name: 'Sample Template',
        html: '<head><title>{{ subject }}</title></head><body>{{{ body }}}</body>',
        css: 'body { background: #fff }',
        status: 'active'
      }, {
        name: 'HTML5 Template',
        html: '<!DOCTYPE html>\n<html lang="en">\n\t<head>\n\t\t<title>{{ subject }}</title>\n\t</head>\n\t<body>\n\t\t{{{ body }}}\n\t</body>\n</html>',
        css: 'html{height:100%}body{max-width:760px;margin:0 auto;font-family:Arial,sans-serif;font-size:12px;box-shadow:0 0 6px rgba(0,0,0,.5);padding:20px;min-height:100%}',
        status: 'active'
      }],
      senders: [{
        name: 'Simon Sturmer',
        email: 'simon.sturmer@gmail.com',
        options: {spf_configured: true},
        status: 'active'
      }]
    }]
  };

  module.exports = function run(env, callback) {
    env = env || Object.keys(config)[0];
    var envConfig = config[env];
    var url = envConfig.base_url + '/api/db/populate';
    var privateKey = new Buffer(envConfig.private_key, 'hex');

    var opts = {
      url: url,
      headers: {
        /* so we get JSON response, even for errors */
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: 'Basic ' + getAuthCode(privateKey)
      },
      json: data
    };
    request.post(opts, function(error, res, body) {
      res = res || {};
      if (error || res.statusCode != 200) {
        console.log({
          error: error,
          response: {
            status: res.statusCode,
            headers: res.headers
          },
          body: body
        });
      } else {
        console.log(body);
      }
      callback();
    });
  };




  /*!
   * Helpers
   */

  function getAuthCode(key) {
    var timestamp = Date.now();
    var hex = getSignedHash(key, timestamp);
    return new Buffer(hex, 'hex').toString('base64');
  }

  function getSignedHash(key, id, len) {
    len = len ? Math.floor(len / 2) * 2 : 6;
    var hex = Number(id).toString(16);
    if (hex.length % 2) hex = '0' + hex;
    //if key is a string, it is assumed to be hex encoded
    key = Buffer.isBuffer(key) ? key : new Buffer(key, 'hex');
    var hash = hmac(key, hex, 'hex').slice(0, len);
    return hash + hex;
  }


  function hmac(key, data, enc) {
    data = new Buffer(data, enc);
    return crypto.createHmac('md5', key).update(data).digest('hex');
  }

  function readJSON(path) {
    var text = fs.readFileSync(__dirname + '/' + path); // eslint-disable-line no-path-concat
    try {
      var result = JSON.parse(text);
    } catch (e) {
      throw new Error('Error reading JSON file: ' + path);
    }
    return result;
  }

})();
