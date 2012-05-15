app.on('ready', function(require) {

  var fs = require('fs')
    , Liquid = require('liquid')
    , Response = require('response');

  var cache = {};

  Response.prototype.send = function(path, data) {
    if (path.indexOf('.') < 0) path += '.liquid';
    if (path.charAt(0) != '/' && path.indexOf('views/') != 0) {
      path = 'views/' +  path;
    }
    var parsed = cache[path];
    if (!parsed) {
      var source = fs.readTextFile(path);
      //parsed = cache[path] = Liquid.parse(source);
      parsed = Liquid.parse(source);
    }
    var rendered = parsed.renderWithErrors(data);
    this.end('text/html', rendered);
  };

});