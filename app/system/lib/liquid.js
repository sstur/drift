/**
 * Port of Tobias Luetke's Liquid Template Engine
 * from Ruby to JavaScript. Implements non-evaling
 * "safe" rendering from template source.
 *
 * Requires:
 *  - es5-shim
 *  - cross-browser string.split() fix (or full regexp patch)
 *  - strftime [ http://code.google.com/p/strftime-js/ ]
 *  - Simple JavaScript Inheritance "Class" library by John Resig
 *
 * To Do:
 *  - implement readTemplateFile
 *  - refactor test suite
 *  - implement "method_missing" -like functionality: page.block0.content
 *  - better typeof function to handle null, arrays, etc
 *  - extensions are just helpers and can be local
 *
 */
define('liquid', function(require, exports, module) {

  var Class = require('class');
  var strftime = require('strftime').strftime;

  //helper functions
  function objectEach(obj, fn /*, context*/ ) {
    var i = 0;
    for (var p in obj) {
      var value = obj[p], pair = [p, value];
      pair.key = p;
      pair.value = value;
      fn.call(arguments[2] || obj, pair, i++, obj);
    }
  }

  function flattenArray(source) {
    var len = source.length, arr = [];
    for (var i = 0; i < len; i++) {
      if (source[i] instanceof Array) {
        arr = arr.concat(source[i]);
      } else {
        arr.push(source[i]);
      }
    }
    return arr;
  }

  var Liquid = module.exports = {

    author: 'M@ McCray <darthapo@gmail.com>',
    version: '1.2.1',

    readTemplateFile: function(path) {
      throw ("This liquid context does not allow includes.");
    },

    registerFilters: function(filters) {
      Liquid.Template.registerFilter(filters);
    },

    parse: function(src) {
      return Liquid.Template.parse(src);
    }

  };

  Liquid.extensions = {};
  Liquid.extensions.object = {};

  Liquid.extensions.object.update = function(newObj) {
    for (var p in newObj) {
      this[p] = newObj[p];
    }

    return this;
  };

  Liquid.extensions.object.hasKey = function(arg) {
    return !!this[arg];
  };

  Liquid.extensions.object.hasValue = function(arg) {
    for (var p in this) {
      if (this[p] == arg) return true;
    }
    return false;
  };

  Liquid.Tag = Class.extend({

    init: function(tagName, markup, tokens) {
      this.tagName = tagName;
      this.markup = markup;
      this.nodelist = this.nodelist || [];
      this.parse(tokens);
    },

    parse: function(tokens) {},

    render: function(context) {
      return '';
    }

  });

  Liquid.Block = Liquid.Tag.extend({

    init: function(tagName, markup, tokens) {
      this.blockName = tagName;
      this.blockDelimiter = "end" + this.blockName;
      this._super(tagName, markup, tokens);
    },

    parse: function(tokens) {
      if (!this.nodelist) this.nodelist = [];
      this.nodelist.length = 0;

      var token = tokens.shift();
      tokens.push(''); // To ensure we don't lose the last token passed in...
      while(tokens.length) {

        if( /^\{\%/.test(token) ) { // It's a tag...
          var tagParts = token.match(/^\{\%\s*(\w+)\s*(.*)?\%\}$/);

          if(tagParts) {
            if( this.blockDelimiter == tagParts[1] ) {
              this.endTag();
              return;
            }
            if( tagParts[1] in Liquid.Template.tags ) {
              this.nodelist.push( new Liquid.Template.tags[tagParts[1]]( tagParts[1], tagParts[2], tokens ) );
            } else {
              this.unknownTag( tagParts[1], tagParts[2], tokens );
            }
          } else {
            throw ( "Tag '"+ token +"' was not properly terminated with: %}");
          }
        } else
        if (/^\{\{/.test(token)) { // It's a variable...
          this.nodelist.push( this.createVariable(token) );
        } else { //if(token != '') {
          this.nodelist.push( token );
        } // Ignores tokens that are empty
        token = tokens.shift(); // Assign the next token to loop again...
      }

      this.assertMissingDelimitation();
    },

    endTag: function() {},

    unknownTag: function(tag, params, tokens) {
      switch(tag) {
        case 'else': throw (this.blockName +" tag does not expect else tag"); break;
        case 'end':  throw ("'end' is not a valid delimiter for "+ this.blockName +" tags. use "+ this.blockDelimiter); break;
        default:     throw ("Unknown tag: "+ tag);
      }
    },

    createVariable: function(token) {
      var match = token.match(/^\{\{(.*)\}\}$/);
      if(match) { return new Liquid.Variable(match[1]); }
      else { throw ("Variable '" + token + "' was not properly terminated with: }}"); }
    },

    render: function(context) {
      return this.renderAll(this.nodelist, context);
    },

    renderAll: function(list, context) {
      return (list || []).map(function(token, i) {
        var output = '';
        try { // hmmm... feels a little heavy
          output = ( token['render'] ) ? token.render(context) : token;
        } catch(e) {
          output = context.handleError(e);
        }
        return output;
      });
    },

    assertMissingDelimitation: function() {
      throw (this.blockName + " tag was never closed");
    }
  });

  Liquid.Document = Liquid.Block.extend({

    init: function(tokens) {
      this.blockDelimiter = [];
      this.parse(tokens);
    },

    assertMissingDelimitation: function() {
    }
  });

  Liquid.Strainer = Class.extend({

    init: function(context) {
      this.context = context;
    },

    respondTo: function(methodName) {
      methodName = methodName.toString();
      if (methodName.match(/^__/)) return false;
      if (~Liquid.Strainer.requiredMethods.indexOf(methodName)) return false;
      return (methodName in this);
    }
  });

  Liquid.Strainer.filters = {};

  Liquid.Strainer.globalFilter = function(filters) {
    for (var f in filters) {
      Liquid.Strainer.filters[f] = filters[f];
    }
  };

  Liquid.Strainer.requiredMethods = ['respondTo', 'context'];

  Liquid.Strainer.create = function(context) {
    var strainer = new Liquid.Strainer(context);
    for (var f in Liquid.Strainer.filters) {
      strainer[f] = Liquid.Strainer.filters[f];
    }
    return strainer;
  };

  Liquid.Context = Class.extend({

    init: function(assigns, registers, rethrowErrors) {
      this.scopes = [ assigns ? assigns : {} ];
      this.registers = registers ? registers : {};
      this.errors = [];
      this.rethrowErrors = rethrowErrors;
      this.strainer = Liquid.Strainer.create(this);
    },

    get: function(varname) {
      return this.resolve(varname);
    },

    set: function(varname, value) {
      this.scopes[0][varname] = value;
    },

    hasKey: function(key) {
      return (this.resolve(key)) ? true : false;
    },

    push: function() {
      var scpObj = {};
      this.scopes.unshift(scpObj);
      return scpObj // Is this right?
    },

    merge: function(newScope) {
      return Liquid.extensions.object.update.call(this.scopes[0], newScope);
    },

    pop: function() {
      if(this.scopes.length == 1) { throw "Context stack error"; }
      return this.scopes.shift();
    },

    stack: function(lambda, bind) {
      var result = null;
      this.push();
      try {
        result = lambda.apply(bind ? bind : this.strainer);
      } finally {
        this.pop();
      }
      return result;
    },

    invoke: function(method, args) {
      if( this.strainer.respondTo(method) ) {
        var result = this.strainer[method].apply(this.strainer, args);
        return result;
      } else {
        return (args.length == 0) ? null : args[0]; // was: $pick
      }
    },

    resolve: function(key) {
      switch(key) {
        case null:
        case 'nil':
        case 'null':
        case '':
          return null;

        case 'true':
          return true;

        case 'false':
          return false;

        case 'blank':
        case 'empty':
          return '';

        default:
          if((/^'(.*)'$/).test(key))      // Single quoted strings
            { return key.replace(/^'(.*)'$/, '$1'); }

          else if((/^"(.*)"$/).test(key)) // Double quoted strings
            { return key.replace(/^"(.*)"$/, '$1'); }

          else if((/^(\d+)$/).test(key)) // Integer...
            { return parseInt( key.replace(/^(\d+)$/ , '$1'), 10); }

          else if((/^(\d[\d\.]+)$/).test(key)) // Float...
            { return parseFloat( key.replace(/^(\d[\d\.]+)$/, '$1') ); }

          else if((/^\((\S+)\.\.(\S+)\)$/).test(key)) {// Ranges
            var range = key.match(/^\((\S+)\.\.(\S+)\)$/),
                left  = parseInt(range[1], 10),
                right = parseInt(range[2], 10),
                arr   = [];
            if (isNaN(left) || isNaN(right)) {
              left = range[1].charCodeAt(0);
              right = range[2].charCodeAt(0);

              var limit = right-left+1;
              for (var i=0; i<limit; i++) arr.push(String.fromCharCode(i+left));
            } else { // okay to make array
              var limit = right-left+1;
              for (var i=0; i<limit; i++) arr.push(i+left);
            }
            return arr;
          } else {
            var result = this.variable(key);
            return result;
          }
      }
    },

    findVariable: function(key) {
      for (var i=0; i < this.scopes.length; i++) {
        var scope = this.scopes[i];
        if( scope && !!scope[key] ) {
          var variable = scope[key];
          if(typeof(variable) == 'function') {
            variable = variable.apply(this);
            scope[key] = variable;
          }
          if(variable && typeof(variable) == 'object' && ('toLiquid' in variable)) {
            variable = variable.toLiquid();
          }
          if(variable && typeof(variable) == 'object' && ('setContext' in variable)) {
            variable.setContext(self);
          }
          return variable;
        }
      }
      return null;
    },

    variable: function(markup) {
      if(typeof markup != 'string') {
        return null;
      }

      var parts       = markup.match( /\[[^\]]+\]|(?:[\w\-]\??)+/g ),
          firstPart   = parts.shift(),
          squareMatch = firstPart.match(/^\[(.*)\]$/);

      if(squareMatch)
        { firstPart = this.resolve( squareMatch[1] ); }

      var object = this.findVariable(firstPart),
          self = this;

      if(object) {
        parts.forEach(function(part) {
          var squareMatch = part.match(/^\[(.*)\]$/);
          if(squareMatch) {
            var part = self.resolve( squareMatch[1] );
            if( typeof(object[part]) == 'function') { object[part] = object[part].apply(this); }// Array?
            object = object[part];
            if(typeof(object) == 'object' && ('toLiquid' in object)) { object = object.toLiquid(); }
          } else {
            if( object && typeof(object) == 'object' && (part in object)) {
              var res = object[part];
              if( typeof(res) == 'function') { res = object[part] = res.apply(self) ; }
              if( typeof(res) == 'object' && ('toLiquid' in res)) { object = res.toLiquid(); }
              else { object = res; }
            } else
            if( (/^\d+$/).test(part) ) {
              var pos = parseInt(part, 10);
              if( typeof(object[pos]) == 'function') { object[pos] = object[pos].apply(self); }
              if(typeof(object[pos]) == 'object' && typeof(object[pos]) == 'object' && ('toLiquid' in object[pos])) { object = object[pos].toLiquid(); }
              else { object  = object[pos]; }
            } else
            if( typeof(object[part]) == 'function' && ~['length', 'size', 'first', 'last'].indexOf(part) ) {
              object = object[part].apply(part);
              if('toLiquid' in object) { object = object.toLiquid(); }
            } else {
              return null;
            }
            if(typeof(object) == 'object' && ('setContext' in object)) { object.setContext(self); }
          }
        });
      }
      return object;
    },

    addFilters: function(filters) {
      filters = flattenArray(filters);
      filters.forEach(function(f) {
        if(typeof(f) != 'object') { throw ("Expected object but got: "+ typeof(f)) }
        this.strainer.addMethods(f);
      });
    },

    handleError: function(err) {
      this.errors.push(err);
      if(this.rethrowErrors) { throw err; }
      return "Liquid error: " + (err.message ? err.message : (err.description ? err.description : err));
    }

  });

  Liquid.Template = Class.extend({

    init: function() {
      this.root = null;
      this.registers = {};
      this.assigns = {};
      this.errors = [];
      this.rethrowErrors = false;
    },

    parse: function(src) {
      this.root = new Liquid.Document( Liquid.Template.tokenize(src) );
      return this;
    },

    render: function() {
      if(!this.root) { return ''; }
      var args = {
        ctx: arguments[0],
        filters: arguments[1],
        registers: arguments[2]
      };
      var context = null;

      if(args.ctx instanceof Liquid.Context ) {
        context = args.ctx;
        this.assigns = context.assigns;
        this.registers = context.registers;
      } else {
        if(args.ctx) {
          Liquid.extensions.object.update.call(this.assigns, args.ctx);
        }
        if(args.registers) {
          Liquid.extensions.object.update.call(this.registers, args.registers);
        }
        context = new Liquid.Context(this.assigns, this.registers, this.rethrowErrors)
      }

      if(args.filters) { context.addFilters(arg.filters); }

      try {
        return this.root.render(context).join('');
      } finally {
        this.errors = context.errors;
      }
    },

    renderWithErrors: function() {
      var savedRethrowErrors = this.rethrowErrors;
      this.rethrowErrors = true;
      var res = this.render.apply(this, arguments);
      this.rethrowErrors = savedRethrowErrors;
      return res;
    }
  });


  Liquid.Template.tags = {};

  Liquid.Template.registerTag = function(name, klass) {
    Liquid.Template.tags[ name ] = klass;
  };

  Liquid.Template.registerFilter = function(filters) {
    Liquid.Strainer.globalFilter(filters)
  };

  Liquid.Template.tokenize = function(src) {
    var tokens = src.split( /(\{\%.*?\%\}|\{\{.*?\}\}?)/ );
    if(tokens[0] == '') { tokens.shift(); }
    return tokens;
  };


  Liquid.Template.parse =  function(src) {
    return (new Liquid.Template()).parse(src);
  };

  Liquid.Variable = Class.extend({

    init: function(markup) {
      this.markup = markup;
      this.name = null;
      this.filters = [];
      var self = this;
      var match = markup.match(/\s*("[^"]+"|'[^']+'|[^\s,|]+)/);
      if( match ) {
        this.name = match[1];
        var filterMatches = markup.match(/\|\s*(.*)/);
        if(filterMatches) {
          var filters = filterMatches[1].split(/\|/);
          filters.forEach(function(f) {
            var matches = f.match(/\s*(\w+)/);
            if(matches) {
              var filterName = matches[1];
              var filterArgs = [];
              flattenArray(f.match(/(?:[:|,]\s*)("[^"]+"|'[^']+'|[^\s,|]+)/g) || []).forEach(function(arg) {
                var cleanupMatch = arg.match(/^[\s|:|,]*(.*?)[\s]*$/);
                if(cleanupMatch)
                  { filterArgs.push( cleanupMatch[1] );}
              });
              self.filters.push( [filterName, filterArgs] );
            }
          });
        }
      }
    },

    render: function(context) {
      if(this.name == null) { return ''; }
      var output = context.get(this.name);
      this.filters.forEach(function(filter) {
        var filterName = filter[0],
            filterArgs = (filter[1] || []).map(function(arg) {
              return context.get(arg);
            });
        filterArgs.unshift(output); // Push in input value into the first argument spot...
        output = context.invoke(filterName, filterArgs);
      });

      return output;
    }
  });

  Liquid.Condition = Class.extend({

    init: function(left, operator, right) {
      this.left = left;
      this.operator = operator;
      this.right = right;
      this.childRelation = null;
      this.childCondition = null;
      this.attachment = null;
    },

    evaluate: function(context) {
      context = context || new Liquid.Context();
      var result = this.interpretCondition(this.left, this.right, this.operator, context);
      switch(this.childRelation) {
        case 'or':
          return (result || this.childCondition.evaluate(context));
        case 'and':
          return (result && this.childCondition.evaluate(context));
        default:
          return result;
      }
    },

    or: function(condition) {
      this.childRelation = 'or';
      this.childCondition = condition;
    },

    and: function(condition) {
      this.childRelation = 'and';
      this.childCondition = condition;
    },

    attach: function(attachment) {
      this.attachment = attachment;
      return this.attachment;
    },

    isElse: false,

    interpretCondition: function(left, right, op, context) {
      if(!op)
        { return context.get(left); }

      left = context.get(left);
      right = context.get(right);
      op = Liquid.Condition.operators[op];
      if(!op)
        { throw ("Unknown operator "+ op); }

      var results = op(left, right);
      return results;
    },

    toString: function() {
      return "<Condition " + this.left + " " + this.operator + " " + this.right + ">";
    }

  });

  Liquid.Condition.operators = {
    '==': function(l,r) {  return (l == r); },
    '=':  function(l,r) { return (l == r); },
    '!=': function(l,r) { return (l != r); },
    '<>': function(l,r) { return (l != r); },
    '<':  function(l,r) { return (l < r); },
    '>':  function(l,r) { return (l > r); },
    '<=': function(l,r) { return (l <= r); },
    '>=': function(l,r) { return (l >= r); },

    'contains': function(l,r) { return ~l.indexOf(r); },
    'hasKey':   function(l,r) { return Liquid.extensions.object.hasKey.call(l, r); },
    'hasValue': function(l,r) { return Liquid.extensions.object.hasValue.call(l, r); }
  };

  Liquid.ElseCondition = Liquid.Condition.extend({

    isElse: true,

    evaluate: function(context) {
      return true;
    },

    toString: function() {
      return "<ElseCondition>";
    }

  });

  Liquid.Drop = Class.extend({
    setContext: function(context) {
      this.context = context;
    },
    beforeMethod: function(method) {

    },
    invokeDrop: function(method) {
      var results = this.beforeMethod();
      if( !results && (method in this) )
        { results = this[method].apply(this); }
      return results;
    },
    hasKey: function(name) {
      return true;
    }
  });

  Liquid.Template.registerTag( 'assign', Liquid.Tag.extend({

    tagSyntax: /((?:\(?[\w\-\.\[\]]\)?)+)\s*=\s*((?:"[^"]+"|'[^']+'|[^\s,|]+)+)/,

    init: function(tagName, markup, tokens) {
      var parts = markup.match(this.tagSyntax)
      if( parts ) {
        this.to   = parts[1];
        this.from = parts[2];
      } else {
        throw ("Syntax error in 'assign' - Valid syntax: assign [var] = [source]");
      }
      this._super(tagName, markup, tokens)
    },
    render: function(context) {
      context.scopes[context.scopes.length - 1][this.to.toString()] = context.get(this.from);
      return '';
    }
  }));

  Liquid.Template.registerTag( 'cache', Liquid.Block.extend({
    tagSyntax: /(\w+)/,

    init: function(tagName, markup, tokens) {
      var parts = markup.match(this.tagSyntax)
      if( parts ) {
        this.to = parts[1];
      } else {
        throw ("Syntax error in 'cache' - Valid syntax: cache [var]");
      }
      this._super(tagName, markup, tokens);
    },
    render: function(context) {
      var output = this._super(context);
      context.scopes[context.scopes.length - 1][this.to] = flattenArray([output]).join('');
      return '';
    }
  }));


  Liquid.Template.registerTag( 'capture', Liquid.Block.extend({
    tagSyntax: /(\w+)/,

    init: function(tagName, markup, tokens) {
      var parts = markup.match(this.tagSyntax)
      if( parts ) {
        this.to = parts[1];
      } else {
        throw ("Syntax error in 'capture' - Valid syntax: capture [var]");
      }
      this._super(tagName, markup, tokens);
    },
    render: function(context) {
      var output = this._super(context);
      context.set( this.to, flattenArray([output]).join('') );
      return '';
    }
  }));

  Liquid.Template.registerTag( 'case', Liquid.Block.extend({

    tagSyntax     : /("[^"]+"|'[^']+'|[^\s,|]+)/,
    tagWhenSyntax : /("[^"]+"|'[^']+'|[^\s,|]+)(?:(?:\s+or\s+|\s*\,\s*)("[^"]+"|'[^']+'|[^\s,|]+.*))?/,

    init: function(tagName, markup, tokens) {
      this.blocks = [];
      this.nodelist = [];

      var parts = markup.match(this.tagSyntax)
      if( parts ) {
        this.left = parts[1];
      } else {
        throw ("Syntax error in 'case' - Valid syntax: case [condition]");
      }

      this._super(tagName, markup, tokens);
    },
    unknownTag: function(tag, markup, tokens) {
      switch(tag) {
        case 'when':
          this.recordWhenCondition(markup);
          break;
        case 'else':
          this.recordElseCondition(markup);
          break;
        default:
          this._super(tag, markup, tokens);
      }

    },
    render: function(context) {
      var self = this,
          output = [],
          execElseBlock = true;

      context.stack(function() {
        for (var i=0; i < self.blocks.length; i++) {
          var block = self.blocks[i];
          if( block.isElse  ) {
            if(execElseBlock == true) { output = flattenArray([output, self.renderAll(block.attachment, context)]); }
            return output;
          } else if( block.evaluate(context) ) {
            execElseBlock = false;
            output = flattenArray([output, self.renderAll(block.attachment, context)]);
          }
        }
      });

      return output;
    },
    recordWhenCondition: function(markup) {
      while(markup) {
        var parts = markup.match(this.tagWhenSyntax);
        if(!parts) {
          throw ("Syntax error in tag 'case' - Valid when condition: {% when [condition] [or condition2...] %} ");
        }

        markup = parts[2];

        var block = new Liquid.Condition(this.left, '==', parts[1]);
        this.blocks.push( block );
        this.nodelist = block.attach([]);
      }
    },
    recordElseCondition: function(markup) {
      if( (markup || '').trim() != '') {
        throw ("Syntax error in tag 'case' - Valid else condition: {% else %} (no parameters) ")
      }
      var block = new Liquid.ElseCondition();
      this.blocks.push(block);
      this.nodelist = block.attach([]);
    }
  }));

  Liquid.Template.registerTag( 'comment', Liquid.Block.extend({
    render: function(context) {
      return '';
    }
  }));

  Liquid.Template.registerTag( 'cycle', Liquid.Tag.extend({

    tagSimpleSyntax: /"[^"]+"|'[^']+'|[^\s,|]+/,
    tagNamedSyntax:  /("[^"]+"|'[^']+'|[^\s,|]+)\s*\:\s*(.*)/,

    init: function(tag, markup, tokens) {
      var matches, variables;
      matches = markup.match(this.tagNamedSyntax);
      if(matches) {
        this.variables = this.variablesFromString(matches[2]);
        this.name = matches[1];
      } else {
        matches = markup.match(this.tagSimpleSyntax);
        if(matches) {
          this.variables = this.variablesFromString(markup);
          this.name = "'"+ this.variables.toString() +"'";
        } else {
          throw ("Syntax error in 'cycle' - Valid syntax: cycle [name :] var [, var2, var3 ...]");
        }
      }
      this._super(tag, markup, tokens);
    },

    render: function(context) {
      var self   = this,
          key    = context.get(self.name),
          output = '';

      if(!context.registers['cycle']) {
        context.registers['cycle'] = {};
      }

      if(!context.registers['cycle'][key]) {
        context.registers['cycle'][key] = 0;
      }

      context.stack(function() {
        var iter    = context.registers['cycle'][key],
            results = context.get( self.variables[iter] );
        iter += 1;
        if(iter == self.variables.length) { iter = 0; }
        context.registers['cycle'][key] = iter;
        output = results;
      });

      return output;
    },

    variablesFromString: function(markup) {
      return markup.split(',').map(function(varname) {
        var match = varname.match(/\s*("[^"]+"|'[^']+'|[^\s,|]+)\s*/);
        return (match[1]) ? match[1] : null
      });
    }
  }));

  Liquid.Template.registerTag( 'for', Liquid.Block.extend({
    tagSyntax: /(\w+)\s+in\s+((?:\(?[\w\-\.\[\]]\)?)+)/,

    init: function(tag, markup, tokens) {
      var matches = markup.match(this.tagSyntax);
      if(matches) {
        this.variableName = matches[1];
        this.collectionName = matches[2];
        this.name = this.variableName +"-"+ this.collectionName;
        this.attributes = {};
        var attrmarkup = markup.replace(this.tagSyntax, '');
        var attMatchs = markup.match(/(\w*?)\s*\:\s*("[^"]+"|'[^']+'|[^\s,|]+)/g);
        if(attMatchs) {
          attMatchs.forEach(function(pair) {
            pair = pair.split(":");
            this.attributes.set[pair[0].trim()] = pair[1].trim();
          }, this);
        }
      } else {
        throw ("Syntax error in 'for loop' - Valid syntax: for [item] in [collection]");
      }
      this._super(tag, markup, tokens);
    },

    render: function(context) {
      var self       = this,
          output     = [],
          collection = (context.get(this.collectionName) || []),
          range      = [0, collection.length];

      if(!context.registers['for']) { context.registers['for'] = {}; }

      if(this.attributes['limit'] || this.attributes['offset']) {
        var offset   = 0,
            limit    = 0,
            rangeEnd = 0,
            segement = null;

        if(this.attributes['offset'] == 'continue')
          { offset = context.registers['for'][this.name]; }
        else
          { offset = context.get( this.attributes['offset'] ) || 0; }

        limit = context.get( this.attributes['limit'] );

        rangeEnd = (limit) ? offset + limit + 1 : collection.length;
        range = [ offset, rangeEnd - 1 ];

        context.registers['for'][this.name] = rangeEnd;
      }

      segment = collection.slice(range[0], range[1]);
      if(!segment || segment.length == 0) { return ''; }

      context.stack(function() {
        var length = segment.length;

        segment.forEach(function(item, index) {
          context.set( self.variableName, item );
          context.set( 'forloop', {
            name:   self.name,
            length: length,
            index:  (index + 1),
            index0: index,
            rindex: (length - index),
            rindex0:(length - index - 1),
            first:  (index == 0),
            last:   (index == (length - 1))
          });
          output.push( (self.renderAll(self.nodelist, context) || []).join('') );
        });
      });

      return flattenArray([output]).join('');
    }
  }));

  Liquid.Template.registerTag( 'if', Liquid.Block.extend({

    tagSyntax: /("[^"]+"|'[^']+'|[^\s,|]+)\s*([=!<>a-z_]+)?\s*("[^"]+"|'[^']+'|[^\s,|]+)?/,

    init: function(tag, markup, tokens) {
      this.nodelist = [];
      this.blocks = [];
      this.pushBlock('if', markup);
      this._super(tag, markup, tokens);
    },

    unknownTag: function(tag, markup, tokens) {
      if( ~['elsif', 'else'].indexOf(tag) ) {
        this.pushBlock(tag, markup);
      } else {
        this._super(tag, markup, tokens);
      }
    },

    render: function(context) {
      var self = this,
          output = '';
      context.stack(function() {
        for (var i=0; i < self.blocks.length; i++) {
          var block = self.blocks[i];
          if( block.evaluate(context) ) {
            output = self.renderAll(block.attachment, context);
            return;
          }
        }
      });
      return flattenArray([output]).join('');
    },

    pushBlock: function(tag, markup) {
      var block;
      if(tag == 'else') {
        block = new Liquid.ElseCondition();
      } else {
        var expressions = markup.split(/\b(and|or)\b/).reverse(),
            expMatches  = expressions.shift().match( this.tagSyntax );

        if(!expMatches) { throw ("Syntax Error in tag '"+ tag +"' - Valid syntax: "+ tag +" [expression]"); }

        var condition = new Liquid.Condition(expMatches[1], expMatches[2], expMatches[3]);

        while(expressions.length > 0) {
          var operator = expressions.shift(),
              expMatches  = expressions.shift().match( this.tagSyntax );
          if(!expMatches) { throw ("Syntax Error in tag '"+ tag +"' - Valid syntax: "+ tag +" [expression]"); }

          var newCondition = new Liquid.Condition(expMatches[1], expMatches[2], expMatches[3]);
          newCondition[operator](condition);
          condition = newCondition;
        }

        block = condition;
      }
      block.attach([]);
      this.blocks.push(block);
      this.nodelist = block.attachment;
    }
  }));

  Liquid.Template.registerTag( 'ifchanged', Liquid.Block.extend({

    render: function(context) {
      var self = this,
          output = '';
      context.stack(function() {
        var results = self.renderAll(self.nodelist, context).join('');
        if(results != context.registers['ifchanged']) {
          output = results;
          context.registers['ifchanged'] = output;
        }
      });
      return output;
    }
  }));

  Liquid.Template.registerTag( 'include', Liquid.Tag.extend({

    tagSyntax: /((?:"[^"]+"|'[^']+'|[^\s,|]+)+)(\s+(?:with|for)\s+((?:"[^"]+"|'[^']+'|[^\s,|]+)+))?/,

    init: function(tag, markup, tokens) {
      var matches = (markup || '').match(this.tagSyntax);
      if(matches) {
        this.templateName = matches[1];
        this.templateNameVar = this.templateName.substring(1, this.templateName.length - 1);
        this.variableName = matches[3];
        this.attributes = {};

        var attMatchs = markup.match(/(\w*?)\s*\:\s*("[^"]+"|'[^']+'|[^\s,|]+)/g);
        if(attMatchs) {
          attMatchs.forEach(function(pair) {
            pair = pair.split(":");
            this.attributes[pair[0].trim()] = pair[1].trim();
          }, this);
        }
      } else {
        throw ("Error in tag 'include' - Valid syntax: include '[template]' (with|for) [object|collection]");
      }
      this._super(tag, markup, tokens);
    },

    render: function(context) {
      var self     = this,
          source   = Liquid.readTemplateFile( context.get(this.templateName) ),
          partial  = Liquid.parse(source),
          variable = context.get((this.variableName || this.templateNameVar)),
          output   = '';
      context.stack(function() {
        objectEach(self.attributes, function(pair) {
          context.set(pair.key, context.get(pair.value));
        });

        if(variable instanceof Array) {
          output = variable.map(function(variable) {
            context.set( self.templateNameVar, variable );
            return partial.render(context);
          });
        } else {
          context.set(self.templateNameVar, variable);
          output = partial.render(context);
        }
      });
      output = flattenArray([output]).join('');
      return output
    }
  }));

  Liquid.Template.registerTag( 'unless', Liquid.Template.tags['if'].extend({

    render: function(context) {
      var self = this,
          output = '';
      context.stack(function() {
        var block = self.blocks[0];
        if( !block.evaluate(context) ) {
          output = self.renderAll(block.attachment, context);
          return;
        }
        for (var i=1; i < self.blocks.length; i++) {
          var block = self.blocks[i];
          if( block.evaluate(context) ) {
            output = self.renderAll(block.attachment, context);
            return;
          }
        }
      });
      return output;
    }
  }));

  Liquid.Template.registerFilter({

    size: function(iterable) {
      return (iterable['length']) ? iterable.length : 0;
    },

    downcase: function(input) {
      return input.toString().toLowerCase();
    },

    upcase: function(input) {
      return input.toString().toUpperCase();
    },

    capitalize: function(input) {
      input = String(input);
      return input.charAt(0).toUpperCase() + input.substring(1).toLowerCase();
    },

    escape: function(input) {
      input = input.toString();
      input = input.replace(/&/g, '&amp;');
      input = input.replace(/</g, '&lt;');
      input = input.replace(/>/g, '&gt;');
      input = input.replace(/"/g, '&quot;');
      return input;
    },

    h: function(input) {
      input = input.toString();
      input = input.replace(/&/g, '&amp;');
      input = input.replace(/</g, '&lt;');
      input = input.replace(/>/g, '&gt;');
      input = input.replace(/"/g, '&quot;');
      return input;
    },

    truncate: function(input, length, string) {
      if(!input || input == '') { return ''; }
      length = length || 50;
      string = string || "...";

      var seg = input.slice(0, length);
      return seg + string;
    },

    truncatewords: function(input, words, string) {
      if(!input || input == '') { return ''; }
      words = parseInt(words || 15, 10);
      string = string || '...';
      var wordlist = input.toString().split(" "),
          l = Math.max((words), 0);
      return (wordlist.length > l) ? wordlist.slice(0,l).join(' ') + string : input;
    },

    truncate_words: function(input, words, string) {
      if(!input || input == '') { return ''; }
      words = parseInt(words || 15, 10);
      string = string || '...';
      var wordlist = input.toString().split(" "),
          l = Math.max((words), 0);
      return (wordlist.length > l) ? wordlist.slice(0,l).join(' ') + string : input;
    },

    strip_html: function(input) {
      return input.toString().replace(/<.*?>/g, '');
    },

    strip_newlines: function(input) {
      return input.toString().replace(/\n/g, '')
    },

    join: function(input, separator) {
      separator = separator ||  ' ';
      return input.join(separator);
    },

    sort: function(input) {
      return input.sort();
    },

    reverse: function(input) {
      return input.reverse();
    },

    replace: function(input, string, replacement) {
      replacement = replacement || '';
      return input.toString().replace(new RegExp(string, 'g'), replacement);
    },

    replace_first: function(input, string, replacement) {
      replacement = replacement || '';
      return input.toString().replace(new RegExp(string, ""), replacement);
    },

    newline_to_br: function(input) {
      return input.toString().replace(/\n/g, "<br/>\n");
    },

    date: function(input, format) {
      var date;
      if (input instanceof Date) {
        date = input;
      } else
      if (input == 'now') {
        date = new Date();
      } else {
        date = new Date(input) || new Date(Date.parse(input));
      }
      if(!(date instanceof Date)) { return input; } // Punt
      //TODO: pass in locale (en-US or en-GB) as third param
      return strftime(date, format);
    },

    first: function(input) {
      return input[0];
    },

    last: function(input) {
      return input[input.length -1];
    },

    //non-standard filters
    format_as_money: function(input, places) {
      var out = String(input);
      out = Number(out.replace(/[$,\s]/g, ''));
      var parts = out.toString().split('.');
      out = parts[0];
      //add thousand separator(s)
      while (out.match(/\d{4}\b/)) out = out.replace(/(\d)(\d{3})\b/g, '$1,$2');
      //decimal places defaults to 2
      if (places == null) places = 2;
      if (places && places > 0) {
        parts[1] = parts[1] || '0';
        parts[1] = Math.round(Math.pow(10, places) * Number('.' + parts[1])).toString();
        out += '.' + (new Array(places).join('0') + parts[1]).slice(-places);
      }
      return '$' + out;
    }
  });

});