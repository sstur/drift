/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var expect = require('expect');
  require('model-create');
  var Model = require('model').Model;
  var TestRunner = require('test-runner');

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

  var testRunner = new TestRunner({
    setup: function() {
      Author.createTable({drop: true});
      Article.createTable({drop: true});
    },
    teardown: function() {
      Author.dropTable();
      Article.dropTable();
    },
    'insert and find by id': function() {
      var date = getDate();
      var author1 = Author.insert({name: 'Jimmy', created_at: date});
      expect(author1.id).to.be.a('number');
      var author1a = Author.find({id: author1.id});
      expect(author1).to.eql(author1a);
      var author2 = Author.insert({id: 99, name: 'Ronald'});
      expect(author2).to.not.have.property('created_at');
      expect(author2.id).to.not.be(99);
    },
    'database auto set date': function() {
      var author = Author.insert({name: 'George'});
      expect(author).to.not.have.property('created_at');
      author = Author.find({id: author.id});
      expect(author.created_at).to.be.a(Date);
    },
    'multiple by name': function() {
      this.setup();
      Author.insert({name: 'Bill'});
      Author.insert({name: 'George'});
      Author.insert({name: 'Barak'});
      var authors = Author.findAll();
      expect(authors).to.have.length(3);
      var author = Author.find({name: 'George'});
      expect(author).to.not.be.empty();
    }
  });

  app.route('/test/models', function(req, res) {
    var output = testRunner.run();
    res.end(output);
  });

  function getDate() {
    var date = new Date();
    //truncate milliseconds (MySQL stores only second accuracy)
    return new Date(Math.floor(date.valueOf() / 1000) * 1000);
  }

});