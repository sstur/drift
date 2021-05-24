/* eslint-disable consistent-this */
'use strict';
const { ServerResponse } = require('http');

//log/report exception (http 50x)
//todo: don't send full file paths in response
ServerResponse.prototype.sendError = function(err) {
  var res = this;
  console.log(err.stack || err.toString());
  if (!res.headersSent) {
    var status = 500;
    var headers = { 'Content-Type': 'text/plain' };
    var body = err.stack;
    res.writeHead(status, 'Internal Error', headers);
    res.write(body + '\n');
  }
  res.end();
};
