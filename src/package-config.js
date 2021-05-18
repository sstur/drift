var fs = require('fs');
var join = require('path').join;

//this is the project path; used in patch and app.mappath
var basePath = (global.basePath = process.cwd());

//read one or more config files (if exists) in `path` and aggregate their properties
function readJSON(file) {
  try {
    var string = fs.readFileSync(join(basePath, file), 'utf8');
    var data = JSON.parse(string);
  } catch (e) {
    return;
  }
  return data;
}

module.exports = readJSON('package.json');
