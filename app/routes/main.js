app.route('/test', function(req, res) {

  res.die('Routed successfully');

//  if (pathname.match(/^\/test$/i)) {
//    var qs = require('./lib/qs');
//    res.debug(qs.parse('a=1&&b=2&c&=3&c=4', {flatten: false}));
//  } else
//  if (pathname.match(/^\/liquid/i)) {
//    var liquid = app.require('liquid');
//    res.write(util.inspect(liquid));
//    res.end();
//  } else
//  if (pathname.match(/^\/throw$/i)) {
//    throw new Error(pathname + ' threw');
//  }
//  console.log(pathname);
//  console.log(req.getHeaders());

});