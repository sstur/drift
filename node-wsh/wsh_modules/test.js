(function() {
  "use strict";

  var wsh = global['WScript'];
  var args = wsh.arguments, reqData;
  if (args.length == 1) {
    reqData = JSON.parse(shellDec(args(0)));
  } else {
    wsh.stdout.write('\n');
    reqData = wsh.stdin.readline();
  }

  reqData = JSON.parse(reqData);

  wsh.stdout.write(JSON.stringify({status: '200', headers: {'content-type': 'text/plain'}, body: [{data: reqData.url}]}));
  //wsh.stdin.readline();

  //for debugging; can pass json data as cmd line arg
  function shellDec(str) {
    str = String(str).replace(/`/g, '"').replace(/\+/g, ' ');
    return decodeURIComponent(str);
  }

})();