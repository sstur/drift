function init() {
  "use strict";

  var form = document.getElementById('form');
  var input = document.getElementById('upload');
  var file;

  input.addEventListener('change', function() {
    for (var i = 0, len = input.files.length; i < len; i++) {
      file = input.files[i];
      break;
    }
    console.log(file);
  });

  form.addEventListener('submit', function(evt) {
    if (form.className != 'ajax') return;
    evt.preventDefault();
    var xhr = new XMLHttpRequest();

    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        console.log('progress', e.loaded, e.total);
      }
    };

    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4){
        console.log('upload complete');
      }
    };

    var name = file.fileName || file.name;
    var lastModified = file.lastModifiedDate || new Date();

    xhr.open("POST", form.action, true);
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.setRequestHeader("X-Name", input.name);
    xhr.setRequestHeader("X-Filename", encodeURIComponent(name));
    xhr.setRequestHeader("X-Content-Type", file.type);
    xhr.setRequestHeader("X-Last-Modified", lastModified.toUTCString());
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.send(file);

  });

}