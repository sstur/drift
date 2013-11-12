/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var expect = require('expect');
  var database = require(app.cfg('models/database'));
  var Model = require('model').Model;
  require('model-create');

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
    Author.createTable({drop: true});
    //Article.createTable({drop: true});
  }

  function teardown() {
    Author.dropTable();
    //Article.dropTable();
  }

  app.route('/test/models', function(req, res) {
    setup();
    var date = getDate();
    var author1 = Author.insert({name: 'Simon', created_at: date});
    var author2 = Author.find({id: author1.id});
    expect(author1).to.eql(author2);
    teardown();
    res.end('success');
  });

  function getDate() {
    var date = new Date();
    //truncate milliseconds (MySQL stores only second accuracy)
    return new Date(Math.floor(date.valueOf() / 1000) * 1000);
  }

});