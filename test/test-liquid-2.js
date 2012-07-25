require('should');

var assert = require('assert');

require('../app/system/core');
require('../app/system/lib/liquid');

//add node's crypto to our require system
define('crypto', require('crypto'));

(function(require, assert) {
  "use strict";

  //var Template = require('liquid');
  var liquid = require('liquid');

  var context, opts = {original: true};


  //helper functions

  function assert_template_result(expected, template, assigns, message) {
    assigns = assigns || {};
    //return assert.equal(expected, Template.parse(template).render(assigns));
    return assert.equal(expected, liquid.template.parse(template, opts).render(assigns, liquid.filters));
  }

  function assert_template_result_matches(expected, template, assigns, message) {
    assigns = assigns || {};
    if (!(expected instanceof RegExp)) {
      return assert_template_result(expected, template, assigns, message);
    }
    return assert.match(expected, liquid.template.parse(template, opts).render(assigns, liquid.filters));
  }

  function assert_evaluates_true(left, op, right) {
    assert.ok(new Condition(left, op, right).evaluate(context || {}),
      "Evaluated false: #{left} #{op} #{right}");
  }

  function assert_evaluates_false(left, op, right) {
    assert.ok(!new Condition(left, op, right).evaluate(context || {}),
      "Evaluated true: #{left} #{op} #{right}");
  }



  describe('assign_test', function() {

    it('test_assigned_variable', function() {
      assert_template_result('.foo.',
        '{% assign foo = values %}.{{ foo[0] }}.',
        {values: ['foo', 'bar', 'baz']});

      assert_template_result('.bar.',
        '{% assign foo = values %}.{{ foo[1] }}.',
        {values: ['foo', 'bar', 'baz']});
    });

    it('test_assign_with_filter', function() {
      assert_template_result('.bar.',
        '{% assign foo = values | split: "," %}.{{ foo[1] }}.',
        {values: ['foo', 'bar', 'baz']});
    });

  });



  describe('blocks', function() {

    it('test_blankspace', function() {
      var template = liquid.template.parse("  ");
      assert.equal(["  "], template.root.nodelist);
    });

    it('test_variable_beginning', function() {
      var template = liquid.template.parse("{{funk}}  ");
      assert.equal(2, template.root.nodelist.size);
      assert.equal("Variable", template.root.nodelist[0].type);
      assert.equal("String", template.root.nodelist[1].type);
    });

    it('test_variable_end', function() {
      var template = liquid.template.parse("  {{funk}}");
      assert.equal(2, template.root.nodelist.length);
      assert.equal("String", template.root.nodelist[0].type);
      assert.equal("Variable", template.root.nodelist[1].type);
    });

    it('test_variable_middle', function() {
      var template = liquid.template.parse("  {{funk}}  ");
      assert.equal(3, template.root.nodelist.length);
      assert.equal("String", template.root.nodelist[0].type);
      assert.equal("Variable", template.root.nodelist[1].type);
      assert.equal("String", template.root.nodelist[2].type);
    });

    it('test_variable_many_embedded_fragments', function() {
      var template = liquid.template.parse("  {{funk}} {{so}} {{brother}} ")
      assert.equal(7, template.root.nodelist.length);
      assert.equal(["String", "Variable", "String", "Variable", "String", "Variable", "String"],
        block_types(template.root.nodelist));
    });

    it('test_with_block', function() {
      var template = liquid.template.parse("  {% comment %} {% endcomment %} ")
      assert.equal(["String", "Comment", "String"], block_types(template.root.nodelist));
      assert.equal(3, template.root.nodelist.length);
    });

    it('test_with_custom_tag', function() {
      liquid.template.register_tag("testtag", "Block")

      assert_nothing_thrown(function() {
        var template = liquid.template.parse( "{% testtag %} {% endtesttag %}")
      });
    });

  });



  describe('capture', function() {

    it('test_captures_block_content_in_variable', function() {
      assert_template_result("test string", "{% capture 'var' %}test string{% endcapture %}{{var}}", {})
    });

    it('test_capture_to_variable_from_outer_scope_if_existing', function() {
      var template_source = [
        "{% assign var = '' %}",
        "{% if true %}",
        "{% capture var %}first-block-string{% endcapture %}",
        "{% endif %}",
        "{% if true %}",
        "{% capture var %}test-string{% endcapture %}",
        "{% endif %}",
        "{{var}}"
      ].join('\n');
      var template = liquid.template.parse(template_source);
      var rendered = template.render();
      assert.equal("test-string", rendered.replace(/\s/g, ''));
    });

    it('test_assigning_from_capture', function() {
      var template_source = [
        "{% assign first = '' %}",
        "{% assign second = '' %}",
        "{% for number in (1..3) %}",
        "{% capture first %}{{number}}{% endcapture %}",
        "{% assign second = first %}",
        "{% endfor %}",
        "{{ first }}-{{ second }}"
      ].join('\n');
      var template = liquid.template.parse(template_source);
      var rendered = template.render();
      assert.equal("3-3", rendered.replace(/\s/g, ''));
    });

  });



  describe('condition', function() {

    it('test_basic_condition', function() {
      assert.equal(false, new Condition('1', '==', '2').evaluate());
      assert.equal(true,  new Condition('1', '==', '1').evaluate());
    });

    it('test_default_operators_evalute_true', function() {
      assert_evaluates_true('1', '==', '1');
      assert_evaluates_true('1', '!=', '2');
      assert_evaluates_true('1', '<>', '2');
      assert_evaluates_true('1', '<', '2');
      assert_evaluates_true('2', '>', '1');
      assert_evaluates_true('1', '>=', '1');
      assert_evaluates_true('2', '>=', '1');
      assert_evaluates_true('1', '<=', '2');
      assert_evaluates_true('1', '<=', '1');
      // negative numbers
      assert_evaluates_true('1', '>', '-1');
      assert_evaluates_true('-1', '<', '1');
      assert_evaluates_true('1.0', '>', '-1.0');
      assert_evaluates_true('-1.0', '<', '1.0');
    });

    it('test_default_operators_evalute_false', function() {
      assert_evaluates_false('1', '==', '2');
      assert_evaluates_false('1', '!=', '1');
      assert_evaluates_false('1', '<>', '1');
      assert_evaluates_false('1', '<', '0');
      assert_evaluates_false('2', '>', '4');
      assert_evaluates_false('1', '>=', '3');
      assert_evaluates_false('2', '>=', '4');
      assert_evaluates_false('1', '<=', '0');
      assert_evaluates_false('1', '<=', '0');
    });

    it('test_contains_works_on_strings', function() {
      assert_evaluates_true("'bob'", 'contains', "'o'");
      assert_evaluates_true("'bob'", 'contains', "'b'");
      assert_evaluates_true("'bob'", 'contains', "'bo'");
      assert_evaluates_true("'bob'", 'contains', "'ob'");
      assert_evaluates_true("'bob'", 'contains', "'bob'");

      assert_evaluates_false("'bob'", 'contains', "'bob2'");
      assert_evaluates_false("'bob'", 'contains', "'a'");
      assert_evaluates_false("'bob'", 'contains', "'---'");
    });

    it('test_contains_works_on_arrays', function() {
      context = {};
      context['array'] = [1,2,3,4,5];

      assert_evaluates_false("array",  'contains', '0');
      assert_evaluates_true("array",   'contains', '1');
      assert_evaluates_true("array",   'contains', '2');
      assert_evaluates_true("array",   'contains', '3');
      assert_evaluates_true("array",   'contains', '4');
      assert_evaluates_true("array",   'contains', '5');
      assert_evaluates_false("array",  'contains', '6');
      assert_evaluates_false("array",  'contains', '"1"');
    });

    it('test_contains_returns_false_for_nil_operands', function() {
      context = {}
      assert_evaluates_false("not_assigned", 'contains', '0');
      assert_evaluates_false("0", 'contains', 'not_assigned');
    });

    it('test_or_condition', function() {
      var condition = new Condition('1', '==', '2')

      assert.equal(false, condition.evaluate());

      condition.or(new Condition('2', '==', '1'));

      assert.equal(false, condition.evaluate());

      condition.or(new Condition('1', '==', '1'));

      assert.equal(true, condition.evaluate());
    });

    it('test_and_condition', function() {
      var condition = new Condition('1', '==', '1')

      assert.equal(true, condition.evaluate());

      condition.and(new Condition('2', '==', '2'));

      assert.equal(true, condition.evaluate());

      condition.and(new Condition('2', '==', '1'));

      assert.equal(false, condition.evaluate());
    });

    it('test_should_allow_custom_proc_operator', function() {
      Condition.operators['starts_with'] = new Proc({ /*|cond, left, right| left =~ %r{^#{right}}*/ });

      assert_evaluates_true("'bob'",   'starts_with', "'b'");
      assert_evaluates_false("'bob'",  'starts_with', "'o'");

    });

    it('test_left_or_right_may_contain_operators', function() {
      context = {}
      context['one'] = context['another'] = "gnomeslab-and-or-liquid"

      assert_evaluates_true("one", '==', "another");
    });



  });



  describe('context', function() {

  });



  describe('drop', function() {

    it('test_product_drop', function() {

      assert_nothing_raised(function() {
        var tpl = liquid.template.parse( '  '  )
        tpl.render({'product': new ProductDrop})
      });
    });

    it('test_text_drop', function() {
      var output = liquid.template.parse( ' {{ product.texts.text }} '  ).render({'product': new ProductDrop})
      assert.equal(' text1 ', output);

    });

    it('test_unknown_method', function() {
      var output = liquid.template.parse( ' {{ product.catchall.unknown }} '  ).render({product: new ProductDrop})
      assert.equal(' method: unknown ', output);

    });

    it('test_integer_argument_drop', function() {
      var output = liquid.template.parse( ' {{ product.catchall[8] }} '  ).render({product: new ProductDrop})
      assert.equal(' method: 8 ', output);
    });

    it('test_text_array_drop', function() {
      var output = liquid.template.parse( '{% for text in product.texts.array %} {{text}} {% endfor %}'  ).render({product: new ProductDrop})
      assert.equal(' text1  text2 ', output);
    });

    it('test_context_drop', function() {
      var output = liquid.template.parse( ' {{ context.bar }} '  ).render({context: new ContextDrop, 'bar': "carrot"})
      assert.equal(' carrot ', output);
    });

    it('test_nested_context_drop', function() {
      var output = liquid.template.parse( ' {{ product.context.foo }} '  ).render({product: new ProductDrop, 'foo': "monkey"})
      assert.equal(' monkey ', output);
    });

    it('test_protected', function() {
      var output = liquid.template.parse( ' {{ product.callmenot }} '  ).render({product: new ProductDrop})
      assert.equal('  ', output);
    });

    it('test_scope', function() {
      assert.equal('1', liquid.template.parse( '{{ context.scopes }}'  ).render({context: new ContextDrop}));
      assert.equal('2', liquid.template.parse( '{%for i in dummy%}{{ context.scopes }}{%endfor%}'  ).render({context: new ContextDrop, 'dummy': [1]}));
      assert.equal('3', liquid.template.parse( '{%for i in dummy%}{%for i in dummy%}{{ context.scopes }}{%endfor%}{%endfor%}'  ).render({context: new ContextDrop, 'dummy': [1]}));
    });

    it('test_scope_though_proc', function() {
      assert.equal('1', liquid.template.parse( '{{ s }}'  ).render({context: new ContextDrop, 's': new Proc({/*|c| c['context.scopes'] */})}));
      assert.equal('2', liquid.template.parse( '{%for i in dummy%}{{ s }}{%endfor%}'  ).render({context: new ContextDrop, 's': new Proc({/*|c| c['context.scopes'] }, 'dummy': [1]*/})}));
      assert.equal('3', liquid.template.parse( '{%for i in dummy%}{%for i in dummy%}{{ s }}{%endfor%}{%endfor%}'  ).render({context: new ContextDrop, 's': new Proc({/*|c| c['context.scopes'] }, 'dummy': [1]*/})}));
    });

    it('test_scope_with_assigns', function() {
      assert.equal('variable', liquid.template.parse( '{% assign a = "variable"%}{{a}}'  ).render({context: new ContextDrop}));
      assert.equal('variable', liquid.template.parse( '{% assign a = "variable"%}{%for i in dummy%}{{a}}{%endfor%}'  ).render({context: new ContextDrop, 'dummy': [1]}));
      assert.equal('test', liquid.template.parse( '{% assign header_gif = "test"%}{{header_gif}}'  ).render({context: new ContextDrop}));
      assert.equal('test', liquid.template.parse( "{% assign header_gif = 'test'%}{{header_gif}}"  ).render({context: new ContextDrop}));
    });
    
    it('test_scope_from_tags', function() {
      assert.equal('1', liquid.template.parse( '{% for i in context.scopes_as_array %}{{i}}{% endfor %}'  ).render({context: new ContextDrop, 'dummy': [1]}));
      assert.equal('12', liquid.template.parse( '{%for a in dummy%}{% for i in context.scopes_as_array %}{{i}}{% endfor %}{% endfor %}'  ).render({context: new ContextDrop, 'dummy': [1]}));
      assert.equal('123', liquid.template.parse( '{%for a in dummy%}{%for a in dummy%}{% for i in context.scopes_as_array %}{{i}}{% endfor %}{% endfor %}{% endfor %}'  ).render({context: new ContextDrop, 'dummy': [1]}));
    });
    
    it('test_access_context_from_drop', function() {
      assert.equal('123', liquid.template.parse( '{%for a in dummy%}{{ context.loop_pos }}{% endfor %}'  ).render({context: new ContextDrop, 'dummy': [1,2,3]}));
    });
    
    it('test_enumerable_drop', function() {
      assert.equal('123', liquid.template.parse( '{% for c in collection %}{{c}}{% endfor %}').render({collection: new EnumerableDrop}));
    });
    
    it('test_enumerable_drop_size', function() {
      assert.equal('3', liquid.template.parse( '{{collection.size}}').render({collection: new EnumerableDrop}));
    });
    
    it('test_empty_string_value_access', function() {
      assert.equal('', liquid.template.parse('{{ product[value] }}').render({product: new ProductDrop, 'value': ''}));
    });
    
    it('test_nil_value_access', function() {
      assert.equal('', liquid.template.parse('{{ product[value] }}').render({product: new ProductDrop, 'value': null}));
    });

  });



  describe('error handling', function() {
    
    it('test_missing_endtag_parse_time_error', function() {
      assert_raise(function() {
        var template = liquid.template.parse(' {% for a in b %} ... ')
      });
    });
    
    it('test_unrecognized_operator', function() {
      assert_nothing_raised(function() {
        var template = liquid.template.parse(' {% if 1 =! 2 %}ok{% endif %} ')
        assert.equal(' Liquid error: Unknown operator =! ', template.render());
        assert.equal(1, template.errors.length);
        assert.equal(liquid.ArgumentError, template.errors.first.type);
      });
    });

  });



  describe('file system', function() {

  });



  describe('filter', function() {
    
    it('test_local_filter', function() {
      context['var'] = 1000;
      context.add_filters(MoneyFilter);
    
      assert.equal(' 1000$ ', new Variable("var | money").render(context));
    });
    
    it('test_underscore_in_filter_name', function() {
      context['var'] = 1000;
      context.add_filters(MoneyFilter);
      assert.equal(' 1000$ ', new Variable("var | money_with_underscore").render(context));
    });
    
    it('test_second_filter_overwrites_first', function() {
      context['var'] = 1000;
      context.add_filters(MoneyFilter);
      context.add_filters(CanadianMoneyFilter);
    
      assert.equal(' 1000$ CAD ', new Variable("var | money").render(context));
    });
    
    it('test_size', function() {
      context['var'] = 'abcd';
      context.add_filters(MoneyFilter);
    
      assert.equal(4, new Variable("var | size").render(context));
    });
    
    it('test_join', function() {
      context['var'] = [1,2,3,4];
    
      assert.equal("1 2 3 4", new Variable("var | join").render(context));
    });
    
    it('test_sort', function() {
      context['value'] = 3;
      context['numbers'] = [2,1,4,3];
      context['words'] = ['expected', 'as', 'alphabetic'];
      context['arrays'] = [['flattened'], ['are']];
    
      assert.equal([1,2,3,4], new Variable("numbers | sort").render(context));
      assert.equal(['alphabetic', 'as', 'expected'], new Variable("words | sort").render(context));
      assert.equal([3], new Variable("value | sort").render(context));
      assert.equal(['are', 'flattened'], new Variable("arrays | sort").render(context));
    });
    
    it('test_strip_html', function() {
      context['var'] = "<b>bla blub</a>";
    
      assert.equal("bla blub", new Variable("var | strip_html").render(context));
    });
    
    it('test_strip_html_ignore_comments_with_html', function() {
      context['var'] = "<!-- split and some <ul> tag --><b>bla blub</a>";
    
      assert.equal("bla blub", new Variable("var | strip_html").render(context));
    });
    
    it('test_capitalize', function() {
      context['var'] = "blub";
    
      assert.equal("Blub", new Variable("var | capitalize").render(context));
    });
    
    it('test_nonexistent_filter_is_ignored', function() {
      context['var'] = 1000;
    
      assert.equal(1000, new Variable("var | xyzzy").render(context));
    });
    
    it('test_local_global', function() {
      liquid.template.register_filter(MoneyFilter);
    
      assert.equal(" 1000$ ", liquid.template.parse("{{1000 | money}}").render(null, null));
      assert.equal(" 1000$ CAD ", liquid.template.parse("{{1000 | money}}").render(null, {'filters': CanadianMoneyFilter}));
      assert.equal(" 1000$ CAD ", liquid.template.parse("{{1000 | money}}").render(null, {'filters': [CanadianMoneyFilter]}));
    });
    
    it('test_local_filter_with_deprecated_syntax', function() {
      assert.equal(" 1000$ CAD ", liquid.template.parse("{{1000 | money}}").render(null, CanadianMoneyFilter));
      assert.equal(" 1000$ CAD ", liquid.template.parse("{{1000 | money}}").render(null, [CanadianMoneyFilter]));
    });

  });



  describe('module ex', function() {

  });



  describe('output', function() {

  });



  describe('parsing quirks', function() {
    
    it('test_error_with_css', function() {
      var text = ' div { font-weight: bold; } ';
      var template = liquid.template.parse(text);
    
      assert.equal(text, template.render());
      assert.equal(["String"], template.root.nodelist.map(function(i) {return i.type;}));
    });
    
    it('test_raise_on_single_close_bracet', function() {
      assert_raise(function() {
        liquid.template.parse("text {{method} oh nos!");
      });
    });
    
    it('test_raise_on_label_and_no_close_bracets', function() {
      assert_raise(function() {
        liquid.template.parse("TEST {{ ");
      });
    });
    
    it('test_raise_on_label_and_no_close_bracets_percent', function() {
      assert_raise(SyntaxError, function() {
        liquid.template.parse("TEST {% ");
      });
    });
    
    it('test_error_on_empty_filter', function() {
      assert_nothing_raised(function() {
        liquid.template.parse("{{test |a|b|}}")
        liquid.template.parse("{{test}}")
        liquid.template.parse("{{|test|}}")
      });
    });
    
    it('test_meaningless_parens', function() {
      var assigns = {'b': 'bar', 'c': 'baz'}
      var markup = "a == 'foo' or (b == 'bar' and c == 'baz') or false"
      assert_template_result(' YES ',"{% if #{markup} %} YES {% endif %}", assigns)
    });
    
    it('test_unexpected_characters_silently_eat_logic', function() {
      var markup = "true && false"
      assert_template_result(' YES ',"{% if #{markup} %} YES {% endif %}")
      var markup = "false || true"
      assert_template_result('',"{% if #{markup} %} YES {% endif %}")
    });

  });



  describe('regexp', function() {

  });



  describe('security', function() {

  });



  describe('standard filters', function() {

    var filters = liquid.filters;

    it('test_size', function() {
      assert.equal(3, filters.size([1,2,3]));
      assert.equal(0, filters.size([]));
      assert.equal(0, filters.size(null));
    });
    
    it('test_downcase', function() {
      assert.equal('testing', filters.downcase("Testing"));
      assert.equal('', filters.downcase(null));
    });
    
    it('test_upcase', function() {
      assert.equal('TESTING', filters.upcase("Testing"));
      assert.equal('', filters.upcase(null));
    });
    
    it('test_upcase', function() {
      assert.equal('TESTING', filters.upcase("Testing"));
      assert.equal('', filters.upcase(null));
    });
    
    it('test_truncate', function() {
      assert.equal('1234...', filters.truncate('1234567890', 7));
      assert.equal('1234567890', filters.truncate('1234567890', 20));
      assert.equal('...', filters.truncate('1234567890', 0));
      assert.equal('1234567890', filters.truncate('1234567890'));
    });
    
    it('test_strip', function() {
      assert.equal(['12','34'], filters.split('12~34', '~'));
      assert.equal(['A? ',' ,Z'], filters.split('A? ~ ~ ~ ,Z', '~ ~ ~'));
      assert.equal(['A?Z'], filters.split('A?Z', '~'));
      // Regexp works although Liquid does not support.
      assert.equal(['A','Z'], filters.split('AxZ', /x/));
    });
    
    it('test_escape', function() {
      assert.equal('&lt;strong&gt;', filters.escape('<strong>'));
      assert.equal('&lt;strong&gt;', filters.h('<strong>'));
    });
    
    it('test_escape_once', function() {
      assert.equal('&lt;strong&gt;', filters.escape_once(filters.escape('<strong>')));
    });
    
    it('test_truncatewords', function() {
      assert.equal('one two three', filters.truncatewords('one two three', 4));
      assert.equal('one two...', filters.truncatewords('one two three', 2));
      assert.equal('one two three', filters.truncatewords('one two three'));
      assert.equal('Two small (13&#8221; x 5.5&#8221; x 10&#8221; high) baskets fit inside one large basket (13&#8221;...', filters.truncatewords('Two small (13&#8221; x 5.5&#8221; x 10&#8221; high) baskets fit inside one large basket (13&#8221; x 16&#8221; x 10.5&#8221; high) with cover.', 15));
    });
    
    it('test_strip_html', function() {
      assert.equal('test', filters.strip_html("<div>test</div>"));
      assert.equal('test', filters.strip_html("<div id='test'>test</div>"));
      assert.equal('', filters.strip_html("<script type='text/javascript'>document.write('some stuff');</script>"));
      assert.equal('', filters.strip_html(null));
    });
    
    it('test_join', function() {
      assert.equal('1 2 3 4', filters.join([1,2,3,4]));
      assert.equal('1 - 2 - 3 - 4', filters.join([1,2,3,4], ' - '));
    });
    
    it('test_sort', function() {
      assert.equal([1,2,3,4], filters.sort([4,3,2,1]));
      assert.equal([{"a": 1}, {"a": 2}, {"a": 3}, {"a": 4}], filters.sort([{"a": 4}, {"a": 3}, {"a": 1}, {"a": 2}], "a"));
    });
    
    it('test_map', function() {
      assert.equal([1,2,3,4], filters.map([{"a": 1}, {"a": 2}, {"a": 3}, {"a": 4}], 'a'));
      assert_template_result('abc', "{{ ary | map:'foo' | map:'bar' }}",
        {'ary': [{'foo': {'bar': 'a'}}, {'foo': {'bar': 'b'}}, {'foo': {'bar': 'c'}}]});
    });
    
    it('test_date', function() {
      assert.equal('May', filters.date(Time.parse("2006-05-05 10:00:00"), "%B"));
      assert.equal('June', filters.date(Time.parse("2006-06-05 10:00:00"), "%B"));
      assert.equal('July', filters.date(Time.parse("2006-07-05 10:00:00"), "%B"));
    
      assert.equal('May', filters.date("2006-05-05 10:00:00", "%B"));
      assert.equal('June', filters.date("2006-06-05 10:00:00", "%B"));
      assert.equal('July', filters.date("2006-07-05 10:00:00", "%B"));
    
      assert.equal('2006-07-05 10:00:00', filters.date("2006-07-05 10:00:00", ""));
      assert.equal('2006-07-05 10:00:00', filters.date("2006-07-05 10:00:00", ""));
      assert.equal('2006-07-05 10:00:00', filters.date("2006-07-05 10:00:00", ""));
      assert.equal('2006-07-05 10:00:00', filters.date("2006-07-05 10:00:00", null));
    
      assert.equal('07/05/2006', filters.date("2006-07-05 10:00:00", "%m/%d/%Y"));
    
      assert.equal("07/16/2004", filters.date("Fri Jul 16 01:00:00 2004", "%m/%d/%Y"));
    
      assert.equal(null, filters.date(null, "%B"));
    
      assert.equal("07/05/2006", filters.date(1152098955, "%m/%d/%Y"));
      assert.equal("07/05/2006", filters.date("1152098955", "%m/%d/%Y"));
    });
    
    
    it('test_first_last', function() {
      assert.equal(1, filters.first([1,2,3]));
      assert.equal(3, filters.last([1,2,3]));
      assert.equal(null, filters.first([]));
      assert.equal(null, filters.last([]));
    });
    
    it('test_replace', function() {
      assert.equal('b b b b', filters.replace("a a a a", 'a', 'b'));
      assert.equal('b a a a', filters.replace_first("a a a a", 'a', 'b'));
      assert_template_result('b a a a', "{{ 'a a a a' | replace_first: 'a', 'b' }}");
    });
    
    it('test_remove', function() {
      assert.equal('   ', filters.remove("a a a a", 'a'));
      assert.equal('a a a', filters.remove_first("a a a a", 'a '));
      assert_template_result('a a a', "{{ 'a a a a' | remove_first: 'a ' }}");
    });
    
    it('test_pipes_in_string_arguments', function() {
      assert_template_result('foobar', "{{ 'foo|bar' | remove: '|' }}");
    });
    
    it('test_strip_newlines', function() {
      assert_template_result('abc', "{{ source | strip_newlines }}", {'source': "a\nb\nc"});
    });
    
    it('test_newlines_to_br', function() {
      assert_template_result("a<br />\nb<br />\nc", "{{ source | newline_to_br }}", {'source': "a\nb\nc"});
    });
    
    it('test_plus', function() {
      assert_template_result("2", "{{ 1 | plus:1 }}");
      assert_template_result("2.0", "{{ '1' | plus:'1.0' }}");
    });
    
    it('test_minus', function() {
      assert_template_result("4", "{{ input | minus:operand }}", {'input': 5, 'operand': 1});
      assert_template_result("2.3", "{{ '4.3' | minus:'2' }}");
    });
    
    it('test_times', function() {
      assert_template_result("12", "{{ 3 | times:4 }}");
      assert_template_result("0", "{{ 'foo' | times:4 }}");
    
      // Ruby v1.9.2-rc1, or higher, backwards compatible Float test
      assert_match(/(6\.3)|(6\.(0{13})1)/, liquid.template.parse("{{ '2.1' | times:3 }}").render())
    
      assert_template_result("6", "{{ '2.1' | times:3 | replace: '.','-' | plus:0}}");
    });
    
    it('test_divided_by', function() {
      assert_template_result("4", "{{ 12 | divided_by:3 }}");
      assert_template_result("4", "{{ 14 | divided_by:3 }}");
    
      // Ruby v1.9.2-rc1, or higher, backwards compatible Float test
      assert_match(/4\.(6{13,14})7/, liquid.template.parse("{{ 14 | divided_by:'3.0' }}").render())
    
      assert_template_result("5", "{{ 15 | divided_by:3 }}");
      assert_template_result("Liquid error: divided by 0", "{{ 5 | divided_by:0 }}");
    });
    
    it('test_modulo', function() {
      assert_template_result("1", "{{ 3 | modulo:2 }}");
    });
    
    it('test_append', function() {
      var assigns = {'a': 'bc', 'b': 'd' };
      assert_template_result('bcd',"{{ a | append: 'd'}}",assigns);
      assert_template_result('bcd',"{{ a | append: b}}",assigns);
    });
    
    it('test_prepend', function() {
      var assigns = {'a': 'bc', 'b': 'a' };
      assert_template_result('abc', "{{ a | prepend: 'a'}}", assigns);
      assert_template_result('abc', "{{ a | prepend: b}}", assigns);
    });
    
    it('test_cannot_access_private_methods', function() {
      assert_template_result('a', "{{ 'a' | to_number }}");
    });

  });



  describe('strainer', function() {

  });



  describe('template', function() {
    //todo:
    var Template = function() {};
    Template.prototype.send = function() {};

    it('test_tokenize_strings', function() {
      assert.equal([' '], new Template().send('tokenize', ' '));
      assert.equal(['hello world'], new Template().send('tokenize', 'hello world'));
    });
    
    it('test_tokenize_variables', function() {
      assert.equal(['{{funk}}'], new Template().send('tokenize', '{{funk}}'));
      assert.equal([' ', '{{funk}}', ' '], new Template().send('tokenize', ' {{funk}} '));
      assert.equal([' ', '{{funk}}', ' ', '{{so}}', ' ', '{{brother}}', ' '], new Template().send('tokenize', ' {{funk}} {{so}} {{brother}} '));
      assert.equal([' ', '{{  funk  }}', ' '], new Template().send('tokenize', ' {{  funk  }} '));
    });
    
    it('test_tokenize_blocks', function() {
      assert.equal(['{%comment%}'], new Template().send('tokenize', '{%comment%}'));
      assert.equal([' ', '{%comment%}', ' '], new Template().send('tokenize', ' {%comment%} '));
      assert.equal([' ', '{%comment%}', ' ', '{%endcomment%}', ' '], new Template().send('tokenize', ' {%comment%} {%endcomment%} '));
      assert.equal(['  ', '{% comment %}', ' ', '{% endcomment %}', ' '], new Template().send('tokenize', "  {% comment %} {% endcomment %} "));
    });
    
    it('test_instance_assigns_persist_on_same_template_object_between_parses', function() {
      var t = new Template();
      assert.equal('from instance assigns', t.parse("{% assign foo = 'from instance assigns' %}{{ foo }}").render());
      assert.equal('from instance assigns', t.parse("{{ foo }}").render());
    });
    
    it('test_instance_assigns_persist_on_same_template_parsing_between_renders', function() {
      var t = new Template().parse("{{ foo }}{% assign foo = 'foo' %}{{ foo }}")
      assert.equal('foo', t.render());
      assert.equal('foofoo', t.render());
    });
    
    it('test_custom_assigns_do_not_persist_on_same_template', function() {
      var t = new Template();
      assert.equal('from custom assigns', t.parse("{{ foo }}").render({foo: 'from custom assigns'}));
      assert.equal('', t.parse("{{ foo }}").render());
    });
    
    it('test_custom_assigns_squash_instance_assigns', function() {
      var t = new Template();
      assert.equal('from instance assigns', t.parse("{% assign foo = 'from instance assigns' %}{{ foo }}").render());
      assert.equal('from custom assigns', t.parse("{{ foo }}").render({foo: 'from custom assigns'}));
    });
    
    it('test_persistent_assigns_squash_instance_assigns', function() {
      var t = new Template();
      assert.equal('from instance assigns', t.parse("{% assign foo = 'from instance assigns' %}{{ foo }}").render());
      t.assigns['foo'] = 'from persistent assigns';
      assert.equal('from persistent assigns', t.parse("{{ foo }}").render());
    });
    
    it('test_lambda_is_called_once_from_persistent_assigns_over_multiple_parses_and_renders', function() {
      var t = new Template();
      var global_var = 0;
      t.assigns['number'] = function() { return (global_var += 1) };
      assert.equal('1', t.parse("{{number}}").render());
      assert.equal('2', t.parse("{{number}}").render());
      assert.equal('3', t.render());
    });
    
    it('test_lambda_is_called_once_from_custom_assigns_over_multiple_parses_and_renders', function() {
      var t = new Template();
      var global_var = 0;
      var assigns = {'number': function() { return (global_var += 1) }};
      assert.equal('1', t.parse("{{number}}").render(assigns));
      assert.equal('2', t.parse("{{number}}").render(assigns));
      assert.equal('3', t.render(assigns));
    });



  });



  describe('variable', function() {

  });



})(app.require, assert);
