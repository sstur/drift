/*global app, define */
app.on('ready', function(require) {
  "use strict";

  var expect = require('expect');
  //patch Model to create/drop tables
  require('model-create');
  var Model = require('model').Model;
  var TestRunner = require('test-runner');

  var Author = new Model({
    name: 'Author',
    tableName: 'authors',
    fields: {
      id: 0,
      name: '',
      rating: 0,
      created_at: {type: 'date'}
    },
    instanceMethods: {
      insertArticle: function(data) {
        data.author_id = this.id;
        return Article.insert(data);
      }
    }
  });

  var Article = new Model({
    name: 'Article',
    tableName: 'articles',
    fields: {
      id: 0,
      title: '',
      author_id: 0,
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
    'find by id': function() {
      var author1 = Author.insert({name: 'Jimmy', rating: 5, created_at: getDate()});
      expect(author1.id).to.be.a('number');
      var author1a = Author.find({id: author1.id});
      expect(author1).to.eql(author1a);
      var author2 = Author.insert({id: 99, name: 'Ronald', rating: 9});
      expect(author2).to.not.have.property('created_at');
      expect(author2.id).to.not.be(99);
    },
    'database auto set date': function() {
      var author = Author.insert({name: 'George', rating: 5});
      expect(author).to.not.have.property('created_at');
      author = Author.find({id: author.id});
      expect(author.created_at).to.be.a(Date);
    },
    'findAll': function() {
      Author.insert({name: 'Bill', rating: 7});
      Author.insert({name: 'George', rating: 3});
      Author.insert({name: 'Barak', rating: 6});
      var authors = Author.findAll();
      expect(authors).to.have.length(6);
      authors = Author.findAll({name: 'George'});
      expect(authors).to.have.length(2);
      expect(authors[0]).to.have.property('name');
      authors = Author.findAll({name: 'George'}, {orderBy: 'rating'});
      expect(authors[0].rating).to.be(3);
      authors = Author.findAll({name: 'George'}, {orderBy: 'rating', dir: 'desc'});
      expect(authors[0].rating).to.be(5);
    },
    'findAll iterator': function() {
      var authors = [];
      Author.findAll(function(author, i) {
        expect(i).to.be.a('number');
        expect(author).to.have.property('name');
        authors.push(author);
      });
      expect(authors).to.have.length(6);
      authors.length = 0;
      Author.findAll({name: 'George'}, function(author) {
        authors.push(author);
      });
      expect(authors).to.have.length(2);
      authors.length = 0;
      Author.findAll({name: 'George'}, {orderBy: {field: 'rating', dir: 'desc'}}, function(author) {
        authors.push(author);
      });
      expect(authors[0].rating).to.be(5);
    },
    'destroy a record by instance': function() {
      var author = Author.find({name: 'George', rating: 5});
      author.destroy();
      author = Author.find({id: author.id});
      expect(author).to.not.be.ok();
    },
    'destroyWhere': function() {
      Author.destroyWhere({name: 'Jimmy', rating: {$lt: 7}});
      var authors = Author.findAll({name: 'Jimmy'});
      expect(authors).to.be.empty();
    },
    'less-than and greater-than': function() {
      var authors = Author.findAll({rating: {$lt: 7}});
      expect(authors).to.have.length(2);
      authors = Author.findAll({rating: {$gt: 5}});
      expect(authors).to.have.length(3);
      authors = Author.findAll({rating: {$gte: 3}});
      expect(authors).to.have.length(4);
      authors = Author.findAll({rating: {$lte: 7}});
      expect(authors).to.have.length(3);
    },
    'in and not in set': function() {
      var authors = Author.findAll({rating: {$in: [1, 3, 6]}});
      expect(authors).to.have.length(2);
      authors = Author.findAll({name: {$in: ['Bill', 'Al', 'Barak']}});
      expect(authors).to.have.length(2);
      authors = Author.findAll({rating: {$nin: [2, 3]}});
      expect(authors).to.have.length(3);
    },
    'basic relationship': function() {
      this.setup();
      var author1 = Author.insert({name: 'Richard'});
      var article1 = Article.insert({title: 'Article 1', author_id: author1.id});
      expect(article1.id).to.be.a('number');
      var article2 = author1.insertArticle({title: 'Article 2'});
      expect(article2.id).to.be.a('number');
      var author2 = Author.insert({name: 'Gerald'});
      var article3 = author2.insertArticle({title: 'Article 3'});
      expect(article3.id).to.be.a('number');
      var articles = Article.findAll();
      expect(articles).to.have.length(3);
    },
    'join, $ne': function() {
      var join = Author.join(Article).on('Author.id', 'Article.author_id');
      var articles = [];
      join.findAll({'Author.id': {$ne: 2}}, {}, function(author, article) {
        articles.push(article);
      });
      expect(articles).to.have.length(2);
    }
  });

  app.route('/test/models', function(req, res) {
    var output = testRunner.run({format: 'html'});
    res.contentType('text/html');
    res.end(output);
  });

  function getDate() {
    var date = new Date();
    //truncate milliseconds (MySQL stores only second accuracy)
    return new Date(Math.floor(date.valueOf() / 1000) * 1000);
  }

});