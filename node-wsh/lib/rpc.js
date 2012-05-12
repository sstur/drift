(function() {
  "use strict";

  var exportModule = function(name, methodNames) {
    var module = require(name);
    name = name.split('/').pop(); //normalize './path/module'
    name = name.split('.')[0]; //normalize 'module.js'
    methodNames = methodNames ? methodNames.split(' ') : Object.keys(module);
    for (var i = 0; i < methodNames.length; i++) {
      var methodName = methodNames[i];
      if (methodName.charAt(0) == '_') continue;
      var method = module[methodName];
      if (typeof method == 'function') {
        exports[name + '.' + methodName] = method.bind(module);
      }
    }
  };

  exportModule('fs');

  //todo: readDirSync(join(__dirname, '../rpc'))

})();