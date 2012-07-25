/*global app, define, describe, it */
require('should');

var assert = require('assert');

require('../app/system/core');
require('../app/system/lib/liquid');

//add node's crypto to our require system
define('crypto', require('crypto'));


(function(require) {
  "use strict";

  var liquid = require('liquid');

  function render(src, data) {
    var parsed = liquid.template.parse(src);

    try {
      var output = parsed.render(data, liquid.filters);
    } catch(e) {
      console.log('error', e);
      throw new Error(parsed.code);
    }
    return output;
  }

  describe('liquid', function() {

    it('should be an object', function() {
      liquid.should.be.a('object');
    });

    it('should have 4 properties', function() {
      liquid.utils.should.be.a('object');
      liquid.parser.should.be.a('object');
      liquid.filters.should.be.a('object');
      liquid.template.should.be.a('object');
    });

    it('should should render simple markup', function() {
      render('{{a}}', {a: 123}).should.equal('123');
    });

  });


  //Run through all the main tags and filters to ensure compatibility with the Ruby version
  var tests = {

    "Plain text pass-thru": function() {
      assert.equal('plain text', render('plain text'));
    },

    "{{ 'string literal' }}": function() {
      assert.equal('string literal', render('{{"string literal"}}'));
      assert.equal('string literal', render('{{ "string literal" }}'));
      assert.equal('string literal', render("{{'string literal'}}"));
      assert.equal('string literal', render("{{ 'string literal' }}"));
      assert.equal('string "literal"', render("{{'string \"literal\"'}}"));
      assert.equal('string "literal"', render("{{ 'string \"literal\"' }}"));
    },

    "{{ 10 }}": function() {
      assert.equal('10', render('{{10}}'));
      assert.equal('10', render('{{ 10 }}'));
    },

    "{{ 5.5 }}": function() {
      assert.equal('5.5', render('{{5.5}}'));
      assert.equal('5.5', render('{{ 5.5 }}'));
    },

    "{{ (1..5) }}": function() {
      assert.equal('1,2,3,4,5', render('{{(1..5)}}'));
      assert.equal('1,2,3,4,5', render('{{ (1..5) }}'));
    },
    //"{{ (a..e) }}": function() {
    //  assert.equal('a,b,c,d,e', render('{{(a..e)}}'));
    //},

    '{{ varname }}': function() {
      assert.equal('Bob', render("{{ user }}", {user:'Bob'}));
    },

    '{{ parent.child }}': function() {
      assert.equal('Bob', render("{{ user.name }}", {user:{ name:'Bob' }}));
    },

    '{{ collection[0] }}': function() {
      assert.equal('Bob', render("{{ users[0] }}", {users:['Bob']}));
    },

    '{{ collection[0].child }}': function() {
      assert.equal('Bob', render("{{ users[0].name }}", {users:[{name:'Bob'}]}));
    },

    '{{ string | size }}': function() {
      assert.equal('3', render("{{user|size}}", {user:'Bob'}));
      assert.equal('3', render("{{ user | size }}", {user:'Bob'}));
    },

    '{{ collection | size }}': function() {
      assert.equal('3', render("{{user|size}}", {user:['','','']}));
      assert.equal('3', render("{{ user | size }}", {user:['','','']}));
    },

    '{{ string | upcase }}': function() {
      assert.equal('BOB', render("{{user|upcase}}", {user:'Bob'}));
      assert.equal('BOB', render("{{ user | upcase }}", {user:'Bob'}));
    },

    '{{ string | downcase }}': function() {
      assert.equal('bob', render("{{user|downcase}}", {user:'Bob'}));
      assert.equal('bob', render("{{ user | downcase }}", {user:'Bob'}));
    },

    '{{ string | capitalize }}': function() {
      assert.equal('Bob', render("{{user|capitalize}}", {user:'bob'}));
      assert.equal('Bob', render("{{ user | capitalize }}", {user:'bob'}));
    },

    '{{ string | escape }}': function() {
      assert.equal('&lt;br/&gt;', render("{{'<br/>'|escape}}"));
      assert.equal('&lt;br/&gt;', render("{{ '<br/>' | escape }}"));
      assert.equal('this &amp; &quot;that&quot;', render("{{ 'this & \"that\"' | escape }}"));
    },


    '{{ string | truncate }}': function() {
      assert.equal(
        'I am the very model of a modern major general, rea...',
        render("{{'I am the very model of a modern major general, really.'|truncate}}")
      );
      assert.equal(
        'I am the very model of a modern major general, rea...',
        render("{{'I am the very model of a modern major general, really.' | truncate}}")
      );
    },

    '{{ string | truncate:2 }}': function() {
      assert.equal('Bo...', render("{{user|truncate:2}}", {user:'Bob'}));
      assert.equal('Bo...', render("{{ user | truncate:2 }}", {user:'Bob'}));
      assert.equal('Bo...', render("{{ user | truncate: 2 }}", {user:'Bob'}));
    },

    "{{ string | truncate:1,'-' }}": function() {
      assert.equal('B-', render("{{user|truncate:1,'-'}}", {user:'Bob'}));
      assert.equal('B-', render("{{ user | truncate:1,'-' }}", {user:'Bob'}));
      assert.equal('B-', render("{{ user | truncate: 1,'-' }}", {user:'Bob'}));
      assert.equal('B-', render("{{ user | truncate: 1, '-' }}", {user:'Bob'}));
    },

    '{{ string | truncatewords }}': function() {
      assert.equal(
        'a b c d e f g h i j k l m n o...',
        render("{{'a b c d e f g h i j k l m n o p q r s t u v w x y z'|truncatewords}}")
      );
      assert.equal(
        'a b c d e f g h i j k l m n o...',
        render("{{ 'a b c d e f g h i j k l m n o p q r s t u v w x y z' | truncatewords }}")
      );
    },

    '{{ string | truncatewords:5 }}': function() {
      assert.equal(
        'a b c d e...',
        render("{{'a b c d e f g h i j k l m n o p q r s t u v w x y z'|truncatewords:5}}")
      );
      assert.equal(
        'a b c d e...',
        render("{{ 'a b c d e f g h i j k l m n o p q r s t u v w x y z' | truncatewords:5 }}")
      );
    },

    "{{ string | truncatewords:5,'-' }}": function() {
      assert.equal(
        'a b c d e-',
        render("{{'a b c d e f g h i j k l m n o p q r s t u v w x y z'|truncatewords:5,'-'}}")
      );
      assert.equal(
        'a b c d e-',
        render("{{ 'a b c d e f g h i j k l m n o p q r s t u v w x y z' | truncatewords:5,'-' }}")
      );
    },

    "{{ string | strip_html }}": function() {
      assert.equal(
        'hello bob',
        render("{{'hello <b>bob</b>'|strip_html}}")
      );
      assert.equal(
        'hello bob',
        render("{{ 'hello <b>bob</b>' | strip_html }}")
      );
    },

    "{{ string | strip_newlines }}": function() {
      var src = "\nhello \nbob \n\nold\n friend\n";
      assert.equal(
        'hello bob old friend',
        render("{{src|strip_newlines}}", {src:src})
      );
      assert.equal(
        'hello bob old friend',
        render("{{ src | strip_newlines }}", {src:src})
      );
    },

    "{{ collection | join }}": function() {
      assert.equal("1 2 3", render("{{(1..3)|join}}"));
      assert.equal("1 2 3", render("{{ (1..3) | join }}"));
    },

    "{{ collection | join:',' }}": function() {
      assert.equal("1,2,3", render("{{(1..3)|join:','}}"));
      assert.equal("1,2,3", render("{{ (1..3) | join:',' }}"));
    },

    "{{ collection | sort }}": function() {
      assert.equal("1,2,3", render("{{c|sort}}", {c:[2,1,3]}));
      assert.equal("1,2,3", render("{{ c | sort }}", {c:[2,1,3]}));
      assert.equal("1,2,3", render("{{(1..3)|sort}}"));
      assert.equal("1,2,3", render("{{ (1..3) | sort }}"));
    },

    "{{ collection | reverse }}": function() {
      assert.equal("3,2,1", render("{{(1..3)|reverse}}"));
      assert.equal("3,2,1", render("{{ (1..3) | reverse }}"));
      assert.equal("3,2,1", render("{{c|reverse}}", {c:[1,2,3]}));
      assert.equal("3,2,1", render("{{ c | reverse }}", {c:[1,2,3]}));
    },

    "{{ string | replace:string }}": function() {
      assert.equal("bnns", render("{{'bananas'|replace:'a'}}"));
      assert.equal("bnns", render("{{ 'bananas' | replace:'a' }}"));
    },

    "{{ string | replace_first:string }}": function() {
      assert.equal("bnanas", render("{{'bananas'|replace_first:'a'}}"));
      assert.equal("bnanas", render("{{ 'bananas' | replace_first:'a' }}"));
    },

    "{{ string | newline_to_br }}": function() {
      var src = "Hello,\nHow are you?\nI'm glad to hear it.";
      var exp = "Hello,<br/>\nHow are you?<br/>\nI'm glad to hear it.";
      assert.equal(exp, render("{{src|newline_to_br}}", {src:src}));
      assert.equal(exp, render("{{ src | newline_to_br }}", {src:src}));
    },

    "{{ 'now' | date:'format' }}": function() {
      var exp = (new Date()).getFullYear();
      assert.equal(exp, render("{{'now' | date: '%Y'}}", {}));
    },

    "{{ date | date:'format' }}": function() {
      var src = new Date('8/30/2008'),
        exp = "08.30.2008",
        fmt = "%m.%d.%Y";
      assert.equal(exp, render("{{src|date:'%m.%d.%Y'}}", {src:src, fmt:fmt}));
      assert.equal(exp, render("{{ src | date:'%m.%d.%Y' }}", {src:src, fmt:fmt}));
      assert.equal(exp, render("{{src|date:fmt}}", {src:src, fmt:fmt}));
      assert.equal(exp, render("{{ src | date:fmt }}", {src:src, fmt:fmt}));
    },

    "{{ collection | first }}": function() {
      assert.equal("1", render("{{(1..3)|first}}"));
      assert.equal("1", render("{{ (1..3) | first }}"));
      assert.equal("1", render("{{c|first}}", {c:[1,2,3]}));
      assert.equal("1", render("{{ c | first }}", {c:[1,2,3]}));
    },

    "{{ collection | last }}": function() {
      assert.equal("3", render("{{(1..3)|last}}"));
      assert.equal("3", render("{{ (1..3) | last }}"));
      assert.equal("3", render("{{c|last}}", {c:[1,2,3]}));
      assert.equal("3", render("{{ c | last }}", {c:[1,2,3]}));
    },

    "{% assign varname = value %}": function() {
      var output = render("{% assign myVar = 'VALUE' %}.{{ myVar }}.");
      assert.equal('.VALUE.', output);

      output = render("{% assign myVar = 10 %}.{{ myVar }}.");
      assert.equal('.10.', output);

      output = render("{% assign myVar = 5.5 %}.{{ myVar }}.");
      assert.equal('.5.5.', output);

      output = render("{% assign myVar = (1..3) %}.{{ myVar }}.");
      assert.equal(".1,2,3.", output);

      // Also make sure that nothing leaks out...
      var tmpl = render("{% assign myVar = 'foo' %}");
      assert.equal('', tmpl);
    },

    // "{% cache varname %} content {% endcache %}": function() {
    //   var src = "{% cache myContent %} Good 'old content! {% endcache %}",
    //       tmpl = render(src),
    //       result = tmpl.render({});
    //   assert.equal("", result);
    //   assert.equal(" Good 'old content! ", tmpl.lastContext.get('myContent'));
    // },

    "{% capture varname %} content {% endcapture %}": function() {
      var src = "{% capture myContent %}Good 'old content!{% endcapture %}Before {{ myContent }}";
      assert.equal("Before Good 'old content!", render(src));
    },

    "{% case conditionLeft %} {% when conditionRight %} {% else %} {% endcase %}": function() {
      var src = [
        "{% case testVar %}\n",
        "{% when 1 %} One!",
        "{% when 2 %} Two!",
        "{% when 'test' %} Test!",
        "{% else %} Got me{% endcase %}"
      ].join('');

      var parsed = liquid.template.parse(src);
      var render = parsed.render.bind(parsed);

      assert.equal(" One!", render({ testVar: 1 }, liquid.filters));
      assert.equal(" Two!", render({ testVar: 2 }, liquid.filters));
      assert.equal(" Test!", render({ testVar: 'test' }, liquid.filters));
      assert.equal(" Got me", render({ testVar: null }, liquid.filters));
      assert.equal(" Got me", render({ }, liquid.filters));
    },

    "{% comment %} content {% endcomment %}": function() {
      assert.equal("", render("{% comment %} I'm a comment! {% endcomment %}"));
    },

    "{% cycle 'odd', 'even' %}": function() {
      var src = "{% cycle 'odd', 'even' %} {% cycle 'odd', 'even' %} {% cycle 'odd', 'even' %}";
      assert.equal('odd even odd', render(src));

      var src = "{% cycle 'odd', 'even' %}{% cycle 'odd', 'even' %}{% cycle 'odd', 'even' %}";
      assert.equal('oddevenodd', render(src));
    },

    "{% for item in collection %}{% endfor %}": function() {
      assert.equal("123", render("{% for item in (1..3) %}{{ item }}{% endfor %}"));
      assert.equal(" 1  2  3 ", render("{% for item in (1..3) %} {{ forloop.index }} {% endfor %}"));
      assert.equal(" 0  1  2 ", render("{% for item in (1..3) %} {{ forloop.index0 }} {% endfor %}"));
      assert.equal(" true  false  false ", render("{% for item in (1..3) %} {{ forloop.first }} {% endfor %}"));
      assert.equal(" false  false  true ", render("{% for item in (1..3) %} {{ forloop.last }} {% endfor %}"));
      // TODO: Add test for the rest of the forloop variables too...
    },

    "{% if conditions %}{% else %}{% endif %}": function() {
      assert.equal("TRUE", render("{% if true %}TRUE{% endif %}"));
      assert.equal("TRUE", render("{% if 1 == 1 %}TRUE{% endif %}"));
      assert.equal("",     render("{% if 1 != 1 %}TRUE{% endif %}"));
      assert.equal("",     render("{% if 1 > 1 %}TRUE{% endif %}"));
      assert.equal("",     render("{% if 1 < 1 %}TRUE{% endif %}"));
      assert.equal("TRUE", render("{% if 1 <= 1 %}TRUE{% endif %}"));
      assert.equal("TRUE", render("{% if 1 >= 1 %}TRUE{% endif %}"));
      // Testing else as well...
      assert.equal("TRUE", render("{% if true %}TRUE{% else %}FALSE{% endif %}"));
      assert.equal("TRUE", render("{% if 1 == 1 %}TRUE{% else %}FALSE{% endif %}"));
      assert.equal("FALSE",render("{% if 1 != 1 %}TRUE{% else %}FALSE{% endif %}"));
      assert.equal("FALSE",render("{% if 1 > 1 %}TRUE{% else %}FALSE{% endif %}"));
      assert.equal("FALSE",render("{% if 1 < 1 %}TRUE{% else %}FALSE{% endif %}"));
      assert.equal("TRUE", render("{% if 1 <= 1 %}TRUE{% else %}FALSE{% endif %}"));
      assert.equal("TRUE", render("{% if 1 >= 1 %}TRUE{% else %}FALSE{% endif %}"));
    },

    //"{% include 'templateName' %}": function() {
    //  liquid.readTemplateFile = function(path) {
    //    if(path == 'simple')
    //      return "simple INCLUDED!";
    //    else
    //      return "{{ data }} INCLUDED!";
    //  };
    //  assert.equal("simple INCLUDED!", render("{% include 'simple' %}"));
    //  assert.equal("Data INCLUDED!", render("{% include 'variable' with data:'Data' %}"));
    //},

    "{% unless conditions %}{% else %}{% endunless %}": function() {
      assert.equal("",     render("{% unless true %}TRUE{% endunless %}"));
      assert.equal("",     render("{% unless 1 == 1 %}TRUE{% endunless %}"));
      assert.equal("TRUE", render("{% unless 1 != 1 %}TRUE{% endunless %}"));
      assert.equal("TRUE", render("{% unless 1 > 1 %}TRUE{% endunless %}"));
      assert.equal("TRUE", render("{% unless 1 < 1 %}TRUE{% endunless %}"));
      assert.equal("",     render("{% unless 1 <= 1 %}TRUE{% endunless %}"));
      assert.equal("",     render("{% unless 1 >= 1 %}TRUE{% endunless %}"));
      // Testing else as well...
      assert.equal("FALSE", render("{% unless true %}TRUE{% else %}FALSE{% endunless %}"));
      assert.equal("FALSE", render("{% unless 1 == 1 %}TRUE{% else %}FALSE{% endunless %}"));
      assert.equal("TRUE",  render("{% unless 1 != 1 %}TRUE{% else %}FALSE{% endunless %}"));
      assert.equal("TRUE",  render("{% unless 1 > 1 %}TRUE{% else %}FALSE{% endunless %}"));
      assert.equal("TRUE",  render("{% unless 1 < 1 %}TRUE{% else %}FALSE{% endunless %}"));
      assert.equal("FALSE", render("{% unless 1 <= 1 %}TRUE{% else %}FALSE{% endunless %}"));
      assert.equal("FALSE", render("{% unless 1 >= 1 %}TRUE{% else %}FALSE{% endunless %}"));
    }
  };


  describe('tags and filters', function() {

    for (var n in tests) {
      it(n, tests[n]);
    }

  });


})(app.require);