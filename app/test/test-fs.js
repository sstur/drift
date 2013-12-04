/*!
 * todo: make sure all not-found errors comply with ENOENT
 */
/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var expect = require('expect');

  var undefined = void 0;
  var dataPath = app.cfg('data_dir') || 'data/';

  app.addTestSuite('fs', {
    //noCatch: true,
    'createDir': function(it) {
      it('should create in existing', function() {
        var path = dataPath + 'test';
        fs.removeDirIfExists(path);
        fs.createDir(path);
        var stat = fs.stat(path);
        expect(stat.type).to.be('directory');
      });
      it('should throw if parent not exist', function() {
        var path = dataPath + 'test2/test3';
        expect(function() {
          fs.createDir(path);
        }).to.throwError(/ENOENT/);
      });
      it('should create multi-level', function() {
        var path = dataPath + 'test2/test3';
        fs.createDir(path, {deep: true});
        var stat = fs.stat(path);
        expect(stat.type).to.be('directory');
      });
    },
    'removeDir': function(it) {
      it('should remove simple', function() {
        var path = dataPath + 'test';
        fs.removeDir(path);
      });
      it('should remove deep', function() {
        var path = dataPath + 'test2/test3';
        fs.removeDir(path);
      });
      it('should be gone', function() {
        var path = dataPath + 'test';
        expect(function() {
          fs.stat(path);
        }).to.throwError(/ENOENT/);
      });
      it('should throw if not exists', function() {
        var path = dataPath + 'test';
        expect(function() {
          fs.removeDir(path);
        }).to.throwError(/ENOENT/);
      });
    },
    'createReadStream': function(it) {
    },
    'createWriteStream': function(it) {
    },
    'readTextFile': function(it) {
    },
    'writeTextToFile': function(it) {
    },
    'moveFile': function(it) {
    },
    'copyFile': function(it) {
    },
    'deleteFile': function(it) {
    },
    'deleteFileIfExists': function(it) {
    },
    'readdir': function(it) {
    },
    'walk': function(it) {
    },
    'stat': function(it) {
    }
  });

});