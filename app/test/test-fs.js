/*!
 * todo: writeTextFile {overwrite: true}
 */
/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var fs = require('fs');
  var expect = require('expect');

  var undefined = void 0;
  var dataPath = app.cfg('data_dir') || 'data/';
  //create a text blob that's > 1kb to ensure there's multiple chunks
  var textBlob = [];
  for (var i = 0; i < 500; i++) textBlob.push(i);
  textBlob = textBlob.join('|');

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
      fs.removeDirIfExists(dataPath + 'test2');
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
      it('should remove with contents', function() {
        var path = dataPath + 'test2/test3';
        fs.writeTextToFile(path + '/file.txt', 'abc');
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
      var path = dataPath + 'test';
      fs.createDir(path);
      var file = path + '/file.txt';
      fs.writeTextToFile(file, textBlob);
      it('should read file in chunks (text)', function() {
        var readStream = fs.createReadStream(file, {encoding: 'utf8'});
        var chunks = [];
        readStream.on('data', function(data) {
          expect(data).to.be.a('string');
          chunks.push(data);
        });
        readStream.on('end', function() {
          chunks = chunks.join('');
        });
        readStream.read();
        expect(chunks).to.be.a('string');
        expect(chunks).to.be(textBlob);
      });
      it('should readAll (text)', function() {
        var readStream = fs.createReadStream(file, {encoding: 'utf8'});
        var text = readStream.readAll();
        expect(text).to.be.a('string');
        expect(text).to.be(textBlob);
      });
      it('should read file in chunks', function() {
        var readStream = fs.createReadStream(file);
        var chunks = [];
        readStream.on('data', function(data) {
          expect(data).to.be.a(Buffer);
          chunks.push(data.toString());
        });
        readStream.on('end', function() {
          chunks = chunks.join('');
        });
        readStream.read();
        expect(chunks).to.be.a('string');
        expect(chunks).to.be(textBlob);
      });
      it('should readAll', function() {
        var readStream = fs.createReadStream(file);
        var data = readStream.readAll();
        expect(data).to.be.a(Buffer);
        expect(data.toString()).to.be(textBlob);
      });
      it('should throw if not exists', function() {
        var path = dataPath + 'test/file2.txt';
        expect(function() {
          fs.createReadStream(path);
        }).to.throwError(/ENOENT/);
      });
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