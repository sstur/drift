var db_reset = require('./db-init/db-reset');
var db_populate = require('./db-init/db-populate');

//todo: optimist
var args = process.argv.slice(2);
var env = args[0] || 'test';
console.log('environment: ' + env);

function done() {
  console.log('done');
}

db_reset(env, function(error) {
  if (error) throw error;
  if (args[1] == '--populate') {
    db_populate(env, function(error) {
      if (error) throw error;
      done();
    });
  } else {
    done();
  }
});
