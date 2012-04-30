define('liquid', ['module', 'request'], function(module, req) {
  console.log('module `liquid`', arguments.length);
  this.exports = {name: 'liquid'};
});