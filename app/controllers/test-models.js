/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var expect = require('expect');
  var database = require(app.cfg('models/database'));
  var Model = require('model').Model;

  var Author = new Model({
    name: 'Author',
    tableName: 'authors',
    fields: {
      id: 0,
      name: '',
      created_at: {type: 'date'}
    }
  });

  var Article = new Model({
    name: 'Article',
    tableName: 'articles',
    fields: {
      id: 0,
      title: '',
      content: {type: 'text'},
      created_at: {type: 'date'}
    }
  });

  function setup() {
    var db = database.open();
    db.exec('DROP TABLE IF EXISTS `authors`');
    db.exec([
      'CREATE TABLE `authors` (',
      '`id` int(10) unsigned NOT NULL AUTO_INCREMENT,',
      '`name` text,',
      '`created_at` timestamp,',
      'PRIMARY KEY (`id`)',
      ') AUTO_INCREMENT=123 DEFAULT CHARSET=utf8'
    ].join('\n'));
  }

  function teardown() {
    var db = database.open();
    db.exec('DROP TABLE IF EXISTS `authors`');
  }

  app.route('/test/models', function(req, res) {
    setup();
    var date = new Date();
    //truncate milliseconds (MySQL stores only second accuracy)
    date = new Date(Math.floor(date.valueOf() / 1000) * 1000);

    var author1 = Author.insert({name: 'Simon', created_at: date});
    var author2 = Author.find({id: author1.id});
    expect(author1).to.eql(author2);
    teardown();
    res.end('success');
  }, {noAuth: 1});

});