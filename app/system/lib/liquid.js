/**
 * Port of Tobias Luetke's Liquid Template Engine
 * from Ruby to JavaScript. Implements safe, non-eval'ing
 * rendering from template source.
 *
 * Requires:
 *  - es5-shim
 *  - cross-browser string.split() fix
 *
 * To Do:
 *  - refactor test suite
 *  - implement getter/method_missing functionality: page['about-us'].content
 *  - better typeof function to handle null, arrays, etc
 *
 */
define('liquid', function(require, exports, module) {

  var utils = (function(exports) {
    try {
      var crypto = require('crypto');
    } catch(e) {}

    try {
      var lib_md5 = require('md5');
    } catch(e) {}

    /**
     * MD5
     *
     * @param {string} str
     * @return {string}
     */
    var md5 = function(str) {
      if (typeof hex_md5 == 'function') {
        return hex_md5(str);
      }
      var hash;
      if (crypto) {
        hash = crypto.createHash('md5');
      } else
      if (lib_md5) {
        hash = lib_md5.create();
      }
      if (hash) {
        hash.update(str, 'utf8');
        return hash.digest('hex');
      } else {
        throw new Error('md5 not implemented');
      }
    };
    exports.md5 = md5;

    /**
     * 去掉字符串外面的引号
     *
     * @param {string} input
     * @return {string}
     */
    exports.stripQuotes = function (input) {
      input = String(input);
      var s = 0;
      var e = input.length;
      var ei = e - 1;
      if (input[0] === '\'' || input[0] === '"') {
        s++;
        e--;
      }
      if (input[ei] === '\'' || input[ei] === '"')
        e--;
      return input.substr(s, e);
    };

    /**
     * 合并多个对象
     *
     * @param {object} obja
     * @param {object} objb
     * @return {object}
     */
    exports.merge = function () {
      var ret = {};
      for (var i in arguments) {
        var obj = arguments[i];
        for (var j in obj)
          ret[j] = obj[j];
      }
      return ret;
    };

    /**
     * 将对象转换为数组
     *
     * @param {object} data
     * @return {array}
     */
    exports.toArray = function (data) {
      if (Array.isArray(data))
        return data;
      var ret = [];
      for (var i = 0, len = data.length; i < len; i++) {
        ret.push(data[i]);
      }
      return ret;
    };

    /**
     * 取指定范围的数字数组
     *
     * @param {int} s
     * @param {int} e
     * @return {array}
     */
    exports.range = function (s, e) {
      s = parseInt(s);
      e = parseInt(e);
      var r = [];
      if (isNaN(s) || isNaN(e))
        return r;
      for (; s <= e; s++)
        r.push(s);
      return r;
    };

    /**
     * 输出文本
     *
     * @param {string} html
     * @return {string}
     */
    exports.escape = function (html) {
      return String(html)
        .replace(/&(?!\w+;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    /**
     * 输出HTML
     *
     * @param {string} html
     * @return {string}
     */
    exports.outputHtml = function (html) {
      return html.replace(/\\/img, '\\\\')
        .replace(/'/img, '\\\'')
        .replace(/"/img, '\\\"')
        .replace(/\r/img, '\\r')
        .replace(/\n/img, '\\n');
    };
    var $_html = exports.outputHtml;

    /**
     * 出错信息
     *
     * @param {string} msg
     */
    exports.errorMessage = function (msg) {
      var html = '<pre style="font-weight:bold; font-size:14px; color:red; padding:4px 20px 4px 20px; border:1px solid #CCC; background-color:#FFF5F0;">' + msg + '</pre>';
      //console.log(html);
      return html;
    };
    var $_err = exports.errorMessage;


    /**
     * 抛出运行时出错信息
     *
     * @param {Error} err
     * @param {string} filename
     */
    exports.rethrowError = function (err, filename) {
      var msg = 'An error occurred while rendering\n'
        + 'Line: ' + $_line_num + (filename !== '' ? '  File: ' + filename : '') + '\n'
        + '    ' + err;
      $_buf+=($_err(msg));
    };
    var $_buf;

    /**
     * 包装变量
     *
     * @param {string} n
     * @param {string} locals
     * @param {function} saveFunc
     * @return {string}
     */
    exports.localsWrap = function (n, locals, saveFunc) {
      if (!locals)
        locals = 'locals';
      locals += '.';
      n = n.trim();
      // 是否为常量
      if (CONST_VAL.indexOf(n) > -1)
        return n;
      // 是否为字符串
      if (/^['"].*['"]$/.test(n))
        return n;
      // 是否为数值
      if (/^\d[\d\.]*\d?$/.test(n))
        return n;
      // 是否为标识符
      if (/^[a-zA-Z_][a-zA-Z0-9_\.]*$/.test(n) && n.substr(-1) !== '.') {
        if (typeof saveFunc === 'function')
          saveFunc(n);
        return locals + n;
      }

      var i = n.indexOf('[');
      if (i !== -1 && typeof saveFunc === 'function') {
        var s = n.substr(0, i);
        if (s.substr(-1) === '.')
          s = s.substr(0, s.length - 1);
        saveFunc(s);
      }

      //转换为字符串索引
      n = n.replace(/\.?((([\w\d\_]*[^\w\d\_\.\[\]]+[\w\d\_]*)+)|([\d]+[\w].*))\.?/img, function (a) {
        if (/^["']|["']$/img.test(a))
          return a;
        if (a[0] === '.')
          a = a.substr(1);
        if (a.substr(-1) === '.')
          a = a.substr(0, a.length - 1);
        a = a.replace(/"/img, '\\"');
        return '["' + a + '"]';
      });
      n = n.replace(/"\]/img, '"].');

      // 变量索引
      var left = n.indexOf('[');
      var right = n.lastIndexOf(']');
      if (left !== -1 && right !== -1) {
        if (typeof saveFunc === 'function') {
          n.split('[').forEach(function (item) {
            var i = item.indexOf(']');
            if (i === -1)
              return;
            var n = item.substr(0, i);
            if (!/^['"].*['"]$/.test(n) && !/^\d[\d\.]*\d?$/.test(n) &&
              /^[a-zA-Z_][a-zA-Z0-9_\.]*$/.test(n))
              saveFunc(n);
          });
        }
        n = n.replace(/\.?\[/img, '[' + locals)
          .replace(RegExp((locals + '[\'"\\d]').replace(/\./img, '\\.'), 'img'), function (a) {
            return a.substr(locals.length);
          });
      }

      if (n.substr(-1) === '.')
        n = n.substr(0, n.length - 1);
      // console.log('--------', n);
      if (n[0] === '[')
        var ret = locals.substr(0, locals.length - 1) + n;
      else
        var ret = locals + n;

      // 修正一些很奇怪的问题
      ret = ret.replace(/\.\["/img, '["')
        .replace(/"\]\.\]/img, '"]]');
      return ret;
    };
// 常量
    var CONST_VAL = ['nil', 'null', 'empty', 'blank', 'true', 'false'];

    /**
     * 解析函数调用
     *
     * @param {string} js
     * @param {object} options
     * @param {object} context
     * @return {string}
     */
    exports.filtered = function (js, options, context) {
      options = options || {}
      if (!options.locals)
        options.locals = 'locals';
      if (!options.filters)
        options.filters = 'filters';
      options.locals += '.';
      options.filters += '.';

      if (!context)
        context = {};

      var localsWrap = exports.localsWrap;

      var isFirst = true;
      var hasFilters = false;

      var ret = exports.splitBy(js, '|').reduce(function (js, filter) {
        hasFilters = true;
        var parts = exports.splitBy(filter, ':');
        var name = parts.shift();
        var args = (parts.shift() || '').trim();
        if (isFirst) {
          js = localsWrap(js, null, context.saveLocalsName);
          isFirst = false;
        }
        if (args) {
          var a = exports.splitBy(args, ',');
          for (var i in a)
            a[i] = localsWrap(a[i], null, context.saveLocalsName);
          args = ', ' + a.join(', ');
        }
        return options.filters + name.trim() + '(' + js + args + ')';
      });

      if (!hasFilters)
        ret = localsWrap(ret, null, context.saveLocalsName);

      return ret;
    };

    /**
     * 解析条件语句
     *
     * @param {string} cond
     * @param {object} context
     * @return {string}
     */
    exports.condition = function (cond, context) {
      if (!context)
        context = {};
      var localsWrap = function (a) {
        return exports.localsWrap(a, null, context.saveLocalsName);
      };

      var blocks = exports.split(cond);
      // console.log(blocks);
      // 拆分成多个子条件
      var conds = [[]];
      var condi = 0;
      for (var i in blocks) {
        var b = blocks[i];
        switch (b) {
          // 连接元素
          case '&&':
          case '||':
          case 'and':
          case 'or':
            if (b === '&&')
              b = 'and';
            else if (b === '||')
              b = 'or';
            condi++;
            conds[condi] = b;
            condi++;
            conds[condi] = [];
            break;
          // 其他元素
          default:
            conds[condi].push(b);
        }
      }

      // 生成单个条件的js代码
      var op = ['>', '<', '==', '!=', '>=', '<>', '<=', 'contains', 'hasValue', 'hasKey'];
      var vempty = ['nil', 'null', 'empty', 'blank'];
      var one = function (ca) {
        if (ca.length === 1) {
          return '(' + localsWrap(ca[0]) + ')';
        }
        if (ca.length === 3) {
          var op1 = localsWrap(ca[0]);
          var op2 = localsWrap(ca[2]);
          ca[1] = ca[1].toLowerCase();
          // console.log(ca[1]);
          // contains 语句
          if (ca[1] === 'contains') {
            return '(Array.isArray(' + op1 + ') ? (' + op1 + '.indexOf(' + op2 + ') !== -1) : '
              + '(String(' + op1
              + ').toLowerCase().indexOf(' + op2
              + ') !== -1))';
          }
          // hasValue 语句
          else if (ca[1] === 'hasvalue') {
            return '(Array.isArray(' + op1 + ') ? (' + op1 + '.indexOf(' + op2 + ') !== -1 ? true : false) : '
              + '(function () {  for (var i in ' + op1 + ') if (' + op1 + '[i] == ' + op2 + ') return true;'
              + '  return false; })())';
          }
          // hasKey 语句
          else if (ca[1] === 'haskey') {
            return '(' + op1 + ' && typeof ' + op1 + '[' + op2 + '] !== \'undefined\')';
          }
          // nil, empty
          else if (vempty.indexOf(ca[2]) > -1) {
            switch (ca[1]) {
              case '!=':
              case '<>':
                return '(' + op1 + ')';
              case '==':
                return '(!' + op1 + ')';
              default:
                return null;
            }
          }
          // 其他
          else if (op.indexOf(ca[1]) > -1) {
            if (ca[1] === '<>')
              ca[1] = '!=';
            return '(' + op1 + ca[1] + op2 + ')';
          }
          else {
            return null;
          }
        }
        else {
          return null;
        }
      };

      var ret = [];
      for (var i in conds) {
        var c = conds[i];
        if (Array.isArray(c)) {
          var s = one(c);
          if (s === null)
            return null;
          else
            ret.push(s);
        }
        else if (c === 'and') {
          ret.push('&&');
        }
        else if (c === 'or') {
          ret.push('||');
        }
      }

      if (ret.length > 1)
        return '(' + ret.join(' ') + ')';
      else
        return ret.join(' ');
    };

    /**
     * 空格分割字符串
     *
     * @param {string} text
     * @return {array}
     */
    exports.split = function (text) {
      var isString = false;
      var lastIndex = 0;
      var ret = [];
      var add = function (end) {
        var w = text.slice(lastIndex, end).trim();
        if (w.length > 0)
          ret.push(w);
        lastIndex = end;
      };

      for (var i = 0, len = text.length; i < len; i++) {
        var c = text[i];
        // console.log(i, c);
        // 字符串开始或结束
        if ((c === '"' || c === '\'') && text[i - 1] !== '\\') {
          // 结束
          if (isString === c) {
            i++;
            add(i);
            isString = false;
          }
          // 开始
          else if (!isString) {
            add(i);
            isString = c;
          }
        }
        // 非字符串
        else if (!isString) {
          var isOpChar = function (c) {
            return (c === '<' || c === '>' || c === '=' || c === '!');
          };
          // 空格
          if (c === ' ') {
            add(i);
          }
          // 中间的比较运算符 如 a<b
          else if (isOpChar(c)) {
            add(i);
            do {
              i++;
            } while (isOpChar(text[i]));
            add(i);
            i--;
          }
        }
      }
      add(i);

      return ret;
    };

    /**
     * 使用指定字符分割
     *
     * @param {string} text
     * @param {string} sep
     * @return {array}
     */
    exports.splitBy = function (text, sep) {
      var arr = text.split(sep);
      var ret = [];
      for (var i = 0, len = arr.length; i < len; i++) {
        var g = arr[i];
        // 合并误分割的字符串内分割符
        var gl = g.trimLeft();
        var gr = g.trimRight();
        if ((gl[0] === '"' || gl[0] === "'") && gl[0] !== gr.substr(-1)) {
          var j = i;
          do {
            j++;
          } while (j < len && arr[j].trimRight().substr(-1) !== gl[0])
          if (j < len) {
            g = arr.slice(i, j + 1).join(sep);
            i = j;
          }
        }
        ret.push(g.trim());
      }
      return ret;
    };

    /**
     * 解析for循环
     *
     * @param {string} loops
     * @param {object} context
     * @return {string}
     */
    exports.forloops = function (loops, context) {
      var blocks = loops.split(/\s+/);

      // 如果为for array，自动转化为默认的 for item in array
      if (blocks.length === 1) {
        blocks[1] = 'in';
        blocks[2] = blocks[0];
        blocks[0] = 'item';
      }

      var loopIndex = context.loop;

      var localsWrap = exports.localsWrap;
      var n = '$_loop_' + loopIndex;        // 索引
      var ni = '$_loop_i_' + loopIndex;     // 数字索引
      var array = localsWrap(blocks[2], null, context.saveLocalsName);    // 数组的名称
      var item = localsWrap(blocks[0], null, context.saveLocalsName);     // 当前元素的名称

      // loop item临时名称
      context.loopName[context.loopName.length - 1].itemName = item;

      var header = '(function (locals) {\n'
        + 'var ' + ni + ' = 0;\n'
        + 'locals.forloop = {};\n';

      // for i in (1..item.quantity)
      var r = /^\((.+)\.\.(.+)\)$/.exec(blocks[2]);
      if (r !== null) {
        array = localsWrap('_range_' + loopIndex, null, context.saveLocalsName);
        header += array + ' = $_range(' + localsWrap(r[1], null, context.saveLocalsName) + ', '
          + localsWrap(r[2], null, context.saveLocalsName) + ');\n';
      }

      // 将对象转换为数组
      var _array = '$_loop_arr_' + loopIndex;
      header += 'var ' + _array + ' = $_array(' + array + ');\n';
      array = _array;

      // 允许增加的标记属性
      var OPTIONS = ['limit', 'offset'];
      var options = {};
      var getOptions = function (block) {
        var b = block.split(':');
        if (b.length !== 2)
          return false;
        var name = b[0].trim();
        var value = localsWrap(b[1], null, context.saveLocalsName);
        if (OPTIONS.indexOf(name) === -1)
          return false;
        options[name] = value;
        return true;
      };

      // 格式化参数 limit: N offset: M  =>  limit:N offset:M
      for (var i = 3; i < blocks.length; i++) {
        if (blocks[i].substr(-1) === ':') {
          blocks[i] += blocks[i + 1];
          blocks.splice(i + 1, 1);
        }
      }
      // for item in arrays limit:N offset:M
      for (var i = 3; i < blocks.length; i++) {
        if (getOptions(blocks[i]) === false)
          return null;
      }
      if (options.limit && options.offset)
        header += array + ' = ' + array + '.slice(' + options.offset + ', ' + options.offset + ' + ' + options.limit + ');\n';
      else if (options.limit)
        header += array + ' = ' + array + '.slice(0, ' + options.limit + ');\n';
      else if (options.offset)
        header += array + ' = ' + array + '.slice(' + options.offset + ');\n';

      // 生成基本代码
      var script = header
        + 'locals.forloop.length = ' + array + '.length;\n'
        + 'var forloop = locals.forloop;\n'
        + 'for (var ' + n + ' = 0; ' + n + ' < forloop.length; ' + n + '++) {\n'
        + item + ' = ' + array + '[' + n + '];\n'
        + 'forloop.name = \'' + blocks[0] + '\';\n'
        + 'forloop.index0 = ' + ni + ';\n'
        + 'forloop.index = ++' + ni + ';\n'
        + 'forloop.rindex0 = forloop.length - forloop.index;\n'
        + 'forloop.rindex = forloop.length - forloop.index0;\n'
        + 'forloop.first = ' + ni + ' === 1 ? true : false;\n'
        + 'forloop.last = ' + ni + ' === forloop.length ? true : false;\n'
        + '/* for loops body */';

      return script;
    };

    /**
     * 解析tablerowloop循环
     *
     * @param {string} loops
     * @param {object} context
     * @return {string}
     */
    exports.tablerow = function (loops, context) {
      var blocks = loops.split(/\s+/);

      var loopIndex = context.loop;

      if (blocks.length < 2)
        return null;

      // 如果为tablerow array，自动转化为默认的 tablerow item in array
      if (blocks.length === 2) {
        blocks[3] = blocks[1];
        blocks[1] = 'in';
        blocks[2] = blocks[0];
        blocks[0] = 'item';
      }

      var localsWrap = exports.localsWrap;
      var n = '$_loop_' + loopIndex;        // 索引
      var ni = '$_loop_i_' + loopIndex;     // 数字索引
      var array = localsWrap(blocks[2], null, context.saveLocalsName);    // 数组的名称
      var item = localsWrap(blocks[0], null, context.saveLocalsName);     // 当前元素的名称

      // loop item临时名称
      context.loopName[context.loopName.length - 1].itemName = item;

      var header = '(function (locals) {\n'
        + 'var ' + ni + ' = 0;\n'
        + 'locals.tablerowloop = {};\n';

      // tablerow i in (1..item.quantity)
      var r = /^\((.+)\.\.(.+)\)$/.exec(blocks[2]);
      if (r !== null) {
        array = localsWrap('_range_' + loopIndex, null, context.saveLocalsName);
        header += array + ' = $_range(' + localsWrap(r[1], null, context.saveLocalsName) + ', '
          + localsWrap(r[2], null, context.saveLocalsName) + ');\n';
      }

      // 将对象转换为数组
      var _array = '$_loop_arr_' + loopIndex;
      header += 'var ' + _array + ' = $_array(' + array + ');\n';
      array = _array;

      // 允许增加的标记属性
      var OPTIONS = ['cols', 'limit', 'offset'];
      var options = {};
      var getOptions = function (block) {
        var b = block.split(':');
        if (b.length !== 2)
          return false;
        var name = b[0].trim();
        var value = localsWrap(b[1], null, context.saveLocalsName);
        if (OPTIONS.indexOf(name) === -1)
          return false;
        options[name] = value;
        return true;
      };

      // 格式化参数 limit: N offset: M  =>  limit:N offset:M
      for (var i = 3; i < blocks.length; i++) {
        if (blocks[i].substr(-1) === ':') {
          blocks[i] += blocks[i + 1];
          blocks.splice(i + 1, 1);
        }
      }
      // tablerow item in arrays cols:3 limit:N offset:M
      for (var i = 3; i < blocks.length; i++) {
        if (getOptions(blocks[i]) === false)
          return null;
      }
      if (options.limit && options.offset)
        header += array + ' = ' + array + '.slice(' + options.offset + ', ' + options.offset + ' + ' + options.limit + ');\n';
      else if (options.limit)
        header += array + ' = ' + array + '.slice(0, ' + options.limit + ');\n';
      else if (options.offset)
        header += array + ' = ' + array + '.slice(' + options.offset + ');\n';

      // 生成基本代码
      var script = header
        + 'locals.tablerowloop.length = ' + array + '.length;\n'
        + 'var tablerowloop = locals.tablerowloop;\n'
        + 'var ' + n + '_row = 0;\n'
        + 'for (var ' + n + ' = 0; ' + n + ' < tablerowloop.length; ) {\n'
        + n + '_row++;\n'
        + '$_buf += \'<tr class=\"row\' + (' + n + '_row) + \'\">\\n\';'
        + 'for (tablerowloop.col0 = 0; tablerowloop.col0 < ' + options.cols + ' && ' + n + ' < tablerowloop.length; tablerowloop.col0++, ' + n + '++) {\n'
        + item + ' = ' + array + '[' + n + '];\n'
        + 'tablerowloop.name = \'' + blocks[0] + '\';\n'
        + 'tablerowloop.col = tablerowloop.col0 + 1;\n'
        + 'tablerowloop.col_first = tablerowloop.col === 1 ? true : false;\n'
        + 'tablerowloop.col_last = tablerowloop.col === ' + options.cols + ' ? true : false;\n'
        + 'tablerowloop.index0 = ' + ni + ';\n'
        + 'tablerowloop.index = ++' + ni + ';\n'
        + 'tablerowloop.rindex0 = tablerowloop.length - tablerowloop.index;\n'
        + 'tablerowloop.rindex = tablerowloop.length - tablerowloop.index0;\n'
        + 'tablerowloop.first = ' + ni + ' === 1 ? true : false;\n'
        + 'tablerowloop.last = ' + ni + ' === tablerowloop.length ? true : false;\n'
        + 'if (tablerowloop.last === true) tablerowloop.col_last = true;\n'
        + '$_buf += \'<td class=\"col\' + tablerowloop.col + \'\">\';'
        + '/* tablerow loops body */';

      return script;
    };

    /**
     * 解析assign
     *
     * @param {string} expression
     * @param {object} context
     * @return {string}
     */
    exports.assign = function (expression, context) {
      // console.log(expression, context);
      // 如果为 [], array() 则创建一个数组
      if (expression === '[]' || expression === 'array()')
        var ret = '[]';
      // 如果为 {}, object(), {"a":"xxx"} 则创建相应的对象
      else if (expression === 'object()')
        var ret = '{}';
      else if (/^\{.*\}$/img.test(expression))
        var ret = 'JSON.parse(\'' + expression + '\')';
      else
        var ret = exports.filtered(expression, null, context);
      // console.log(expression, ret);
      // 替换用assign定义的名称为global
      // console.log(expression, context.assignNames);
      for (var i in context.assignNames) {
        // 忽略loop中的名称名称（即优先使用loop内定义的名称）
        if (context.loopName.length > 0) {
          if (i === context.loopName[context.loopName.length - 1].itemName ||
            i.substr(0, 8) === 'forloop.' || i.substr(0, 13) === 'tablerowloop.')
            continue;
        }

        ret = ret.replace(RegExp(i, 'img'), 'global.' + i);
      }
      // console.log(ret);
      return ret;
    };

    /**
     * 解析cycle
     *
     * @param {string} strlist
     * @param {object} context
     * @return {string}
     */
    exports.cycle = function (strlist, context) {
      var localsWrap = exports.localsWrap;

      var list = exports.splitBy(strlist, ',');

      var hasKey = false;
      var _list = exports.splitBy(list[0], ':');
      if (_list.length > 1) {
        hasKey = _list[0];
        list[0] = _list[1];
      }
      else if (list[0].substr(-1) === ':') {
        hasKey = list[0].substr(0, list[0].length - 1);
        list.splice(0, 1);
      }
      else if (list[1] === ':') {
        hasKey = list[0];
        list.splice(0, 2);
      }
      // console.log(hasKey, list);
      for (var i in list) {
        list[i] = localsWrap(list[i], null, context.saveLocalsName);
      }

      var cycleKey = md5((hasKey || list.join(','))).substr(0, 8);
      context.addCycle(cycleKey, list);

      var cycleName = '$_cycle_' + cycleKey;
      var script = '$_buf+=(' + cycleName + '.items[' + cycleName + '.i])\n'
        + '$_cycle_next(' + cycleName + ');\n';
      return script;
    };

    return exports;
  })({});

  var parser = (function(exports) {
    exports.output = function (text, start, context) {
      if (context.isRaw || context.isComment)
        return null;

      // 查找结束标记
      var end = text.indexOf('}}', start);
      if (end === -1)
        return null;

      // 检查结束标记是否为同一行的
      var lineend = text.indexOf('\n', start);
      if (lineend > -1 && lineend < end)
        return null;

      context.ignoreOutput = false;

      var line = text.slice(start + 2, end).trim();
      end += 2;

      // 支持函数调用
      var script = '$_line_num = ' + context.line_num + ';\n'
        + '$_buf+=(' + utils.filtered(line, null, context) + ');';

      return {start: start, end: end, script: script};
    };


    exports.tags = function (text, start, context) {
      // 查找结束标记
      var end = text.indexOf('%}', start);
      if (end === -1)
        return null;

      // 检查结束标记是否为同一行的
      var lineend = text.indexOf('\n', start);
      if (lineend > -1 && lineend < end)
        return null;

      var line = text.slice(start + 2, end).trim();
      end += 2;
      // console.log('Line: ' + line);

      // 解析语句
      var space_start = line.indexOf(' ');
      var script = '';

      // 设置行号，以便检查运行时错误
      var setLineNumber = function () {
        if (script.substr(-1) === '\n')
          script += '$_line_num = ' + context.line_num + ';\n';
        else
          script += '\n$_line_num = ' + context.line_num + ';\n';
      };

      // 当前在raw标记内，则只有遇到 enddraw 标记时才能终止
      if (context.isRaw) {
        if (line === 'endraw') {
          context.isRaw = false;
          setLineNumber();
          script += '/* endraw */';
          return {start: start, end: end, script: script};
        }
        else {
          return null;
        }
      }

      // 当前在comment标记内，则只有遇到 endcomment 标记时才能终止
      if (context.isComment) {
        if (line === 'endcomment') {
          context.isComment = false;
          context.ignoreOutput = true;
          setLineNumber();
          return {start: start, end: end, script: script};
        }
        else {
          return null;
        }
      }

      // 嵌套开始
      var enterLoop = function (name) {
        context.loop++;
        context.loopName.push({
          name:     name,
          start:    start,
          end:      end,
          line:     line,
          line_num: context.line_num
        });
      };

      // 退出嵌套
      var outLoop = function () {
        context.loop--;
        context.loopName.pop();
      };

      // 嵌套结束标记不匹配
      var loopNotMatch = function () {
        context.error = {
          message:    'Unexpected token: ' + line,
          start:      start,
          end:        end,
          line:       line
        }
      };

      // 意外的标记
      var syntaxError = function () {
        context.error = {
          message:    'SyntaxError: ' + line,
          start:      start,
          end:        end,
          line:       line
        }
      };

      // 无法识别的标记
      var unknowTag = function () {
        context.error = {
          message:    'UnknowTag: ' + line,
          start:      start,
          end:        end,
          line:       line
        }
      };

      var methods = {
        enterLoop:    enterLoop,
        outLoop:      outLoop,
        loopNotMatch: loopNotMatch,
        syntaxError:  syntaxError,
        unknowTag:    unknowTag,
        filtered:     utils.filtered,
        localsWrap:   utils.localsWrap
      };

      // 当前嵌套名称
      if (context.loopName.length > 0)
        var loopName = context.loopName[context.loopName.length - 1].name;
      else
        var loopName = '';

      context.ignoreOutput = false;

      // 简单标记(一般为标记结尾)
      if (space_start === -1) {
        // 是否为自定义标记
        if (typeof context.customTags[line] === 'function') {
          setLineNumber();
          var s = context.customTags[line]([], line, context, methods);
          if (s === null)
            syntaxError();
          else if (typeof s === 'string')
            script += s + '\n';
        }
        else {
          switch (line) {
            // raw 标记
            case 'raw':
              context.isRaw = true;
              setLineNumber();
              script += '/* raw */';
              break;
            // endif
            case 'endif':
              if (loopName !== 'if')
                loopNotMatch();
              else {
                setLineNumber();
                script += '}';
                outLoop();
              }
              break;
            // endunless
            case 'endunless':
              if (loopName !== 'unless')
                loopNotMatch();
              else {
                setLineNumber();
                script += '}';
                outLoop();
              }
              break;
            // else
            case 'else':
              if (loopName === 'if' || loopName === 'unless') {
                setLineNumber();
                script += '} else {';
                setLineNumber();
              }
              else if (loopName === 'case') {
                setLineNumber();
                script += 'break;\n' +
                  'default:';
                setLineNumber();
              }
              else if (loopName === 'for') {
                setLineNumber();
                script += '}\n'
                  + 'if (forloop.length < 1) {';
              }
              else
                loopNotMatch();
              break;
            // endcase
            case 'endcase':
              if (loopName !== 'case')
                loopNotMatch();
              else {
                setLineNumber();
                script += '}';
                outLoop();
              }
              break;
            // endfor
            case 'endfor':
              if (loopName !== 'for')
                loopNotMatch();
              else {
                setLineNumber();
                script += '}\n'
                  + '})($_merge(locals));';
                outLoop();
              }
              break;
            // endtablerow
            case 'endtablerow':
              if (loopName !== 'tablerow')
                loopNotMatch();
              else {
                setLineNumber();
                script += '$_buf += \'</td>\';\n'
                  + '}\n'
                  + '$_buf += \'</tr>\\n\';\n'
                  + '}\n'
                  + '})($_merge(locals));';
                outLoop();
              }
              break;
            // endcapture
            case 'endcapture':
              if (loopName !== 'capture')
                loopNotMatch();
              else {
                setLineNumber();
                script += '} catch (err) {\n'
                  + '  $_rethrow(err);\n'
                  + '}\n'
                  + 'return $_buf;\n'
                  + '})();';
                outLoop();
              }
              break;
            // comment
            case 'comment':
              setLineNumber();
              context.isComment = true;
              break;
            // 出错
            default:
              unknowTag();
          }
        }
      }
      // 复杂标记(一般为标记开头)
      else {
        var line_left = line.substr(0, space_start);
        var line_right = line.substr(space_start).trim();
        // 是否为自定义标记
        if (typeof context.customTags[line_left] === 'function') {
          setLineNumber();
          var s = context.customTags[line_left](line_right.split(/\s+/), line_right, context, methods);
          if (s === null)
            syntaxError();
          else if (typeof s === 'string')
            script += s + '\n';
        }
        else {
          switch (line_left) {
            // if / unless 判断
            case 'if':
              enterLoop(line_left);
              setLineNumber();
              script += 'if ' + utils.condition(line_right, context) + ' {';
              break;
            case 'unless':
              enterLoop(line_left);
              setLineNumber();
              script += 'if (!' + utils.condition(line_right, context) + ') {';
              break;
            // elsif / elseif
            case 'elsif':
            case 'elseif':
              if (loopName !== 'if')
                loopNotMatch();
              else {
                setLineNumber();
                script += '} else if ' + utils.condition(line_right, context) + ' {';
              }
              break;
            // case 判断
            case 'case':
              enterLoop(line_left);
              setLineNumber();
              script += 'switch (' + utils.localsWrap(line_right, null, context.saveLocalsName) + ') {';
              break;
            case 'when':
              if (context.hasWhen) {
                script += 'break;\n';
                context.ignoreOutput = false;
              }
              else
                context.ignoreOutput = true;
              if (loopName !== 'case')
                loopNotMatch();
              else {
                script += 'case ' + utils.localsWrap(line_right, null, context.saveLocalsName) + ':';
                setLineNumber();
                context.hasWhen = true;
              }
              break;
            // for 循环
            case 'for':
              enterLoop(line_left);
              var s = utils.forloops(line_right, context);
              if (s === null)
                syntaxError();
              else {
                setLineNumber();
                script += s;
              }
              break;
            // tablerow 循环
            case 'tablerow':
              enterLoop(line_left);
              var s = utils.tablerow(line_right, context);
              if (s === null)
                syntaxError();
              else {
                setLineNumber();
                script += s;
              }
              break;
            // assign 定义变量
            case 'assign':
              var eq_op = line_right.indexOf('=');
              if (eq_op === -1) {
                syntaxError();
              }
              else {
                var assign_name = utils.localsWrap(line_right.substr(0, eq_op).trim(), null, context.saveLocalsName);
                context.assignNames[assign_name] = true;
                var assign_expr = utils.assign(line_right.substr(eq_op + 1).trim(), context);
                setLineNumber();
                script += 'global.' + assign_name + ' = ' + assign_expr + ';';
              }
              break;
            // capture 定义变量块
            case 'capture':
              enterLoop(line_left);
              var n = utils.localsWrap(line_right, null, context.saveLocalsName);
              setLineNumber();
              script += 'global.' + n + ' = ' + n + ' = (function () {\n'
                + 'var $_buf = \'\';\n'
                + 'try {\n'
                + '/* captures */\n';
              break;
            // include 标记
            case 'include':
              var inc_blocks = utils.split(line_right);
              var inc_tag = {};
              var inc_ok = false;
              if (inc_blocks.length === 1) {
                inc_tag.name = utils.stripQuotes(inc_blocks[0]);
                inc_ok = true;
              }
              else if (inc_blocks.length === 3) {
                inc_tag.name = utils.stripQuotes(inc_blocks[0]);
                inc_tag.with = utils.stripQuotes(inc_blocks[2]);
                inc_ok = true;
              }
              else {
                syntaxError();
              }
              if (inc_ok) {
                // 添加到依赖的资源文件
                context.addIncludes(inc_tag.name);
                // 如果提供了该资源文件，则插入代码
                if (context.files[inc_tag.name]) {
                  setLineNumber();
                  script += '/* === include "' + inc_tag.name + '"' + (inc_tag.with ? ' with "' + inc_tag.with + '"' : '') + ' === */\n'
                    + 'try {\n'
                    + '$_buf+=((function (locals) {\n'
                    + context.files[inc_tag.name] + '\n'
                    + 'return $_buf;\n'
                    + '})(' + (inc_tag.with ? utils.localsWrap(inc_tag.with) : 'locals') + '));\n'
                    + '} catch (err) {\n'
                    + '  $_rethrow(err);\n'
                    + '}\n'
                    + '/* === end include "' + inc_tag.name + '" === */';
                }
              }
              break;
            // cycle 循环字符串
            case 'cycle':
              var s = utils.cycle(line_right, context);
              if (s === null)
                syntaxError();
              else {
                setLineNumber();
                script += s;
              }
              break;
            // 其他
            default:
              unknowTag();
          }
        }
      }

      return {start: start, end: end, script: script}
    };

    return exports;
  })({});

  var filters = (function(exports) {
    /*---------------------------- HTML Filters ----------------------------------*/
    /**
     * 创建一个img标签
     *
     * @param {string} url
     * @param {string} alt
     * @return {string}
     */
    exports.img_tag = function(url, alt) {
      return '<img src="' + exports.escape(url) + '" alt="' + exports.escape(alt || '') + '">';
    };

    /**
     * 创建一个script标签
     *
     * @param {string} url
     * @return {string}
     */
    exports.script_tag = function(url) {
      return '<script src="' + exports.escape(url) + '"></script>';
    };

    /**
     * 创建一个样式表link标签
     *
     * @param {string} url
     * @param {string} media
     * @return {string}
     */
    exports.stylesheet_tag = function(url, media) {
      return '<link href="' + exports.escape(url) + '" rel="stylesheet" type="text/css" media="' + exports.escape(media || 'all') + '" />';
    };

    /**
     * A链接标签
     *
     * @param {string} link
     * @param {string} url
     * @param {string} title
     * @return {string}
     */
    exports.link_to = function(link, url, title) {
      return '<a href="' + exports.escape(url || '') + '" title="' + exports.escape(title || '') + '">' + exports.escape(link) + '</a>';
    };

    /*-----------------------------Math Filters-----------------------------------*/
    /**
     * 相加
     *
     * @param {number} input
     * @param {number} operand
     * @return {number}
     */
    exports.plus = function(input, operand) {
      input = Number(input) || 0;
      operand = Number(operand) || 0;
      return  input + operand;
    };

    /**
     * 相减
     *
     * @param {number} input
     * @param {number} operand
     * @return {number}
     */
    exports.minus = function(input, operand) {
      input = Number(input) || 0;
      operand = Number(operand) || 0;
      return  input - operand;
    };

    /**
     * 相乘
     *
     * @param {number} input
     * @param {number} operand
     * @return {number}
     */
    exports.times = function(input, operand) {
      input = Number(input) || 0;
      operand = Number(operand) || 0;
      operand = 0;
      return  input * operand;
    };

    /**
     * 相除
     *
     * @param {number} input
     * @param {number} operand
     * @return {number}
     */
    exports.divided_by = function(input, operand) {
      input = Number(input) || 0;
      operand = Number(operand) || 0;
      return  input / operand;
    };

    /**
     * 四舍五入
     *
     * @param {number} input
     * @param {int} point
     * @return {number}
     */
    exports.round = function(input, point) {
      point = parseInt(point, 10) || 0;
      if (point < 1)
        return Math.round(input);
      var n = Math.pow(10, point);
      return Math.round(input * n) / n;
    };

    /**
     * 整数
     *
     * @param {number} input
     * @return {int}
     */
    exports.integer = function(input) {
      return parseInt(input, 10) || 0;
    };

    /**
     * 返回指定范围的随机数
     *
     * @param {number} m
     * @param {number} n
     * @return {number}
     */
    exports.random = function(m, n) {
      m = parseInt(m);
      n = parseInt(n);
      if (!isFinite(m))
        return Math.random();
      if (!isFinite(n)) {
        n = m;
        m = 0;
      }
      return Math.random() * (n - m) + m;
    };

    /*---------------------------Manipulation Filters-----------------------------*/
    /**
     * 在后面拼接字符串
     *
     * @param {string} input
     * @param {string} characters
     * @return {string}
     */
    exports.append = function(input, characters) {
      if (!characters)
        return String(input);
      return String(input) + String(characters);
    };

    /**
     * 在前面拼接字符串
     *
     * @param {string} input
     * @param {string} characters
     * @return {string}
     */
    exports.prepend = function(input, characters) {
      if (!characters)
        return String(input);
      return String(characters) + String(input);
    };

    /**
     * 将字符串转化为驼峰命名方式
     *
     * @param {string} input
     * @return {string}
     */
    exports.camelize = function(input) {
      input = String(input);
      return input.replace(/[^a-zA-Z0-9]+(\w)/g, function(_, ch) {
        return ch.toUpperCase();
      });
    };

    /**
     * 字符串首字母大写
     *
     * @param {string} input
     * @return {string}
     */
    exports.capitalize = function(input) {
      input = String(input);
      return input[0].toUpperCase() + input.substr(1);
    };

    /**
     * 取当前毫秒时间戳
     *
     * @param {int} input
     * @return {int}
     */
    exports.timestamp = function(input) {
      input = parseInt(input, 10) || 0;
      return new Date().getTime() + input;
    };

    /**
     * 格式化日期字符串
     *
     * @param {string} input
     * @param {string} format
     * @return {string}
     */
    exports.date = function(input, format) {
      var time;
      if (String(input).toLowerCase() == 'now')
        time = new Date();
      else {
        var timestamp = parseInt(input, 10);
        if (timestamp == input)
          time = new Date(timestamp);
        else
          time = new Date(input);
      }
      if (!time || !isFinite(time.valueOf()))
        return 'Invalid Date';
      if (!format)
        format = '%Y-%m-%j %H:%M:%S';
      var dates = time.toDateString().split(/\s/);      // ["Wed", "Apr", "11", "2012"]
      var dateS = time.toLocaleDateString().split(/\s/);// ["Wednesday,", "April", "11,", "2012"]
      var times = time.toTimeString().split(/[\s:\+]/); // ["10", "37", "44", "GMT", "0800", "(中国标准时间)"]
      var replace = {
        a:      dates[0], // 星期
        A:      dateS[0],
        b:      dates[1], // 月份
        B:      dateS[1],
        c:      time.toLocaleString(),
        d:      dates[2],
        H:      times[0],       // 24小时制
        I:      times[0] % 12,  // 12小时制
        j:      dates[2], // 日
        m:      time.getMonth() + 1,  // 月份
        M:      times[1], // 分钟
        p:      Number(times[0]) < 12 ? 'AM' : 'PM',  // 上午/下午
        S:      times[2], // 秒
        U:      weekNo(time),         // 当年的第几周，星期日开始
        W:      weekNo(time, true),   // 星期一开始
        w:      time.getDay(),  // 星期几(0-6)
        x:      time.toDateString(),
        X:      time.toTimeString(),
        y:      dates[3].substr(-2),  // 年份
        Y:      dates[3],
        Z:      times[4]   // 时区
      };
      var ret = String(format);
      for (var i in replace) {
        ret = ret.replace(new RegExp('%' + i, 'g'), replace[i]);
      }
      return ret;
    };

    function weekNo(now, mondayFirst) {
      var totalDays = 0;
      var years = now.getFullYear();
      var days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (years % 100 === 0) {
        if (years % 400 === 0)
          days[1] = 29;
      }
      else if (years % 4 === 0)
        days[1] = 29;

      if (now.getMonth() === 0) {
        totalDays = totalDays + now.getDate();
      }
      else {
        var curMonth = now.getMonth();
        for (var count = 1; count <= curMonth; count++)
          totalDays = totalDays + days[count - 1];
        totalDays = totalDays + now.getDate();
      }
      // 默认是以星期日开始的
      var week = Math.round(totalDays / 7);
      if (mondayFirst && new Date(String(years)).getDay() === 0)
        week += 1;
      return week;
    }

    /**
     * 将字符串转换为小写
     *
     * @param {string} input
     * @return {string}
     */
    exports.downcase = function(input) {
      return String(input).toLowerCase();
    };

    /**
     * 将字符串转换为大写
     *
     * @param {string} input
     * @return {string}
     */
    exports.upcase = function(input) {
      return String(input).toUpperCase();
    };

    /**
     * 字符串转义（HTML）
     *
     * @param {string} input
     * @return {string}
     */
    exports.escape = function(input) {
      return String(input)
        .replace(/&(?!\w+;)/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    function getFirstKey(obj) {
      if (Array.isArray(obj)) {
        return 0;
      }
      else {
        var keys = Object.keys(obj);
        return keys[0] || '';
      }
    }

    function getLastKey(obj) {
      if (Array.isArray(obj)) {
        return obj.length - 1;
      }
      else {
        var keys = Object.keys(obj);
        return keys.pop() || '';
      }
    }

    /**
     * 返回对象的所有键
     *
     * @param {object} input
     * @return {array}
     */
    exports.keys = function(input) {
      try {
        return Object.keys(input);
      }
      catch (err) {
        return [];
      }
    };

    /**
     * 取第一个元素
     *
     * @param {array} array
     * @return {object}
     */
    exports.first = function(array) {
      return array[getFirstKey(array)];
    };

    /**
     * 取最后一个元素
     *
     * @param {array} array
     * @return {object}
     */
    exports.last = function(array) {
      return array[getLastKey(array)];
    };

    /**
     * 转化为handle字符串
     *
     * @param {string} input
     * @return {string}
     */
    exports.handleize = function(input) {
      return String(input)
        .replace(/[^0-9a-zA-Z ]/g, '')
        .replace(/[ ]+/g, '-')
        .toLowerCase();
    };

    /**
     * 将数组以指定的字符串拼接起来
     *
     * @param {array} input
     * @param {string} segmenter
     * @return {string}
     */
    exports.join = function(input, segmenter) {
      if (!segmenter)
        segmenter = ' ';
      if (Array.isArray(input))
        return input.join(segmenter);
      else
        return '';
    };

    /**
     * 替换第一次出现的字符串
     *
     * @param {string} input
     * @param {string} substring
     * @param {string} replacement
     * @return {string}
     */
    exports.replace_first = function(input, substring, replacement) {
      return String(input).replace(substring, replacement);
    };

    /**
     * 替换指定字符串
     *
     * @param {string} input
     * @param {string} substring
     * @param {string} replacement
     * @return {string}
     */
    exports.replace = function(input, substring, replacement) {
      input = String(input);
      while (input.indexOf(substring) > -1)
        input = input.replace(substring, replacement);
      return input;
    };

    /**
     * 删除指定字符串
     *
     * @param {string} input
     * @param {string} substring
     * @return {string}
     */
    exports.remove = function(input, substring) {
      return exports.replace(input, substring, '');
    };

    /**
     * 删除第一次出现的指定字符串
     *
     * @param {string} input
     * @param {string} substring
     * @return {string}
     */
    exports.remove_first = function(input, substring) {
      return exports.replace_first(input, substring, '');
    };

    /**
     * 将\n转换为<br>
     *
     * @param {string} input
     * @return {string}
     */
    exports.newline_to_br = function(input) {
      return String(input).replace(/\n/img, '<br>');
    };

    /**
     * 如果输入的数大于1则输出第2个参数，否则输出第3个参数
     *
     * @param {int} input
     * @param {string} singular
     * @param {string} plural
     * @return {string}
     */
    exports.pluralize = function(input, singular, plural) {
      return Number(input) > 1 ? plural : singular;
    };

    /**
     * 返回数组或字符串的长度
     *
     * @param {array|string} input
     * @return {string}
     */
    exports.size = function(input) {
      if (!input)
        return 0;
      var len = input.length;
      return len > 0 ? len : 0;
    };

    /**
     * 分割字符串
     *
     * @param {string} input
     * @param {string} delimiter
     * @return {string}
     */
    exports.split = function(input, delimiter) {
      if (!delimiter)
        delimiter = '';
      return String(input).split(delimiter);
    };

    /**
     * 去除HTML标签
     *
     * @param {string} text
     * @return {string}
     */
    exports.strip_html = function(text) {
      return String(text).replace(/<[^>]*>/img, '');
    };

    /**
     * 去除换行符
     *
     * @param {string} input
     * @return {string}
     */
    exports.strip_newlines = function(input) {
      return String(input).replace(/[\r\n]+/g, '');
    };

    /**
     * 截断字符串
     *
     * @param {string} input
     * @param {int} characters
     * @return {string}
     */
    exports.truncate = function(input, characters) {
      characters = parseInt(characters, 10);
      if (!isFinite(characters) || characters < 0)
        characters = 100;
      return String(input).substr(0, characters);
    };

    /**
     * 取字符串的前N个单词
     *
     * @param {string} input
     * @param {int} words
     * @return {string}
     */
    exports.truncatewords = function(input, words) {
      words = parseInt(words, 10);
      if (!isFinite(words) || words < 0)
        words = 15;
      return String(input).trim().split(/\s+/).slice(0, words).join(' ');
    };

    /**
     * 转换为json字符串
     *
     * @param {object} input
     * @return {string}
     */
    exports.json = function(input) {
      try {
        var ret = JSON.stringify(input);
      } catch (err) {
      }
      return (typeof ret == 'string') ? ret : '{}';
    };

    /**
     * 取指定属性值
     *
     * @param {object} obj
     * @param {string} prop
     * @return {object}
     */
    exports.get = function(obj, prop){
      if (!obj)
        obj = {};
      return obj[prop];
    };

    /**
     * 反转字符串或数组
     *
     * @param {string|array} arr
     * @return {string|array}
     */
    exports.reverse = function(arr) {
      return Array.isArray(arr)
        ? arr.reverse()
        : String(arr).split('').reverse().join('');
    };

    /**
     * 取数组的指定列的数据
     *
     * @param {array} arr
     * @param {string} prop
     * @return {array}
     */
    exports.map = function(arr, prop) {
      if (!Array.isArray(arr))
        return [];
      return arr.map(function(obj){
        return obj && obj[prop];
      });
    };

    /**
     * 数组排序，默认升序
     *
     * @param {array} obj
     * @param {int} order
     * @return {array}
     */
    exports.sort = function(obj, order) {
      if (!Array.isArray(obj))
        return [];
      order = String(order).trim().toLowerCase();
      var ret1 = order === 'desc' ? -1 : 1;
      var ret2 = 0 - ret1;
      return obj.sort(function(a, b) {
        if (a > b)  return ret1;
        if (a < b)  return ret2;
        return 0;
      });
    };

    /**
     * 按照数组元素的指定属性排序
     *
     * @param {array} arr
     * @param {string} prop
     * @param {int} order
     * @return {array}
     */
    exports.sort_by = function(arr, prop, order) {
      if (!Array.isArray(arr))
        return [];
      order = String(order).trim().toLowerCase();
      var ret1 = order === 'desc' ? -1 : 1;
      var ret2 = 0 - ret1;
      arr = arr.slice(0); //clone array
      return arr.sort(function(a, b) {
        a = a[prop];
        b = b[prop];
        if (a > b) return ret1;
        if (a < b) return ret2;
        return 0;
      });
    };

    /**
     * 根据数量生成导航页码
     *
     * @param {int} count 总数
     * @param {int} size 每页显示数量
     * @param {int} page 当前页码
     * @return {array}
     */
    exports.pagination = function(count, size, page) {
      var maxPage;
      if (count % size === 0)
        maxPage = parseInt(count / size, 10);
      else
        maxPage = parseInt(count / size, 10) + 1;

      if (isNaN(page) || page < 1)
        page = 1;
      page = parseInt(page, 10);

      var list = [page - 2, page - 1, page, page + 1, page + 2];
      for (var i = 0; i < list.length;) {
        if (list[i] < 1 || list[i] > maxPage)
          list.splice(i, 1);
        else
          i++;
      }
      if (list[0] !== 1) {
        list.unshift('...');
        list.unshift(1);
      }
      if (list[list.length - 1] < maxPage) {
        list.push('...');
        list.push(maxPage);
      }

      var ret = {
        current:    page,
        next:       page + 1,
        previous:   page - 1,
        list:       list
      };
      if (ret.next > maxPage)
        ret.next = maxPage;
      if (ret.previous < 1)
        ret.previous = 1;

      return ret;
    };

    return exports;
  })({});

  var template = (function(exports) {
    /**
     * 编译代码(仅解析模板)
     *
     * @param {string} text
     * @param {object} options  files:子模版文件代码,用parse编译
     * @return {object}
     */
    exports.parse = function (text, options) {
      options = options || {};
      options.tags = options.tags || {};

      var line_number = 1; // 行号
      var html_start = 0;  // HTML代码开始
      var scripts = [];    // 编译后的代码
      var context = {}     // 编译时传递的环境变量

      scripts.add = function (s) {
        scripts.push(s);
      };

      // 初始化编译环境
      context.customTags = options.tags;  // 自定义的标记解析
      context.loop = 0;           // { 嵌套层数
      context.loopName = [];      // 当前嵌套标记名称
      context.isRaw = false;      // 是否为raw标记
      context.isComment = false;  // 是否为comment标记
      context.ignoreOutput = false; // 忽略该部分的HTML代码
      context.assignNames = {};   // 使用assign标记定义的变量名称
      context.varNames = {};      // 变量的名称及引用的次数
      context.saveLocalsName = function (name) {  // 使用变量名称
        // 忽略tablerowloop和forloop
        if (name.substr(0, 13) === 'tablerowloop.' || name.substr(0, 8) === 'forloop.')
          return;
        if (!context.varNames[name])
          context.varNames[name] = 1;
        else
          context.varNames[name]++;
      };
      context.includes = {};                  // 包含的子模版
      context.files = options.files || {};    // 提供的资源文件
      context.addIncludes = function (name) { // 包含子模版
        if (!context.includes[name])
          context.includes[name] = 1;
        else
          context.includes[name]++;
      };
      context.cycles = {};        // cycle标记中的变量列表
      context.addCycle = function (key, list) {  // 添加cycle
        context.cycles[key] = list;
      };

      // 捕捉严重的错误
      var catchError = function (data) {
        if (!context.error && data) {
          context.error = {
            start:      data.start,
            end:        data.end,
            line:       data.line,
            message:    'SyntaxError: Unexpected end of input'
          }
        }

        // 生成出错信息描述
        var html_top = utils.outputHtml(text.slice(0, context.error.start));
        var html_bottom = utils.outputHtml(text.slice(context.error.end));
        var html_error = 'Line:' + line_number + '\n'
          + '    ' + context.error.line + '\n\n'
          + context.error.message + '\n';
        // 嵌套栈
        var loop;
        while (loop = context.loopName.pop()) {
          html_error += '    at ' + loop.line + ' (line: ' + loop.line_num + ')\n';
        }

        // 输出出错信息
        html_error = utils.outputHtml(html_error);
        scripts.splice(0, scripts.length);
        scripts.add('$_buf+=(\'' + html_top + '\');');
        scripts.add('$_buf+=($_err(\'' + html_error + '\'));');
        scripts.add('$_buf+=(\'' + html_bottom + '\');');

        html_start = text.length;
      };

      for (var i = 0, len; len = text.length, i < len; i++) {
        var block = text.substr(i, 2);
        if (text[i] === '\n')
          line_number++;
        context.line_num = line_number;

        //console.log('Block: ' + block);
        switch (block) {
          // 变量
          case '{{':
            var ret = parser.output(text, i, context);
            break;
          // 语句
          case '{%':
            var ret = parser.tags(text, i, context);
            break;
          // HTML代码
          default:
            var ret = null;
        }

        // 检查是否出错
        if (context.error) {
          catchError();
          break;
        }

        if (ret !== null) {
          //console.log(ret);
          var html = text.slice(html_start, ret.start);
          if (html.length > 0 && context.ignoreOutput !== true) {
            html = utils.outputHtml(html);
            scripts.add('$_buf+=(\'' + html + '\');');
          }
          // 代码
          scripts.add(ret.script);

          i = ret.end - 1;
          html_start = ret.end;
        }
      }

      // 最后一部分的HTML
      var html = text.slice(html_start, len);
      if (html.length > 0) {
        html = utils.outputHtml(html);
        scripts.add('$_buf+=(\'' + html + '\');');
      }

      // 检查是否出错(嵌套是否匹配)
      if (context.loopName.length > 0) {
        catchError(context.loopName.pop());
      }

      // 生成cycle定义
      var define_cycle = '/* == define cycles == */\n';
      for (var i in context.cycles) {
        var c = context.cycles[i];
        var n = '$_cycle_' + i;
        var s = 'var ' + n + ' = {i: 0, length: ' + c.length + ', items: [' + c.join(',') + ']}\n';
        define_cycle += s;
      }
      define_cycle += 'var $_cycle_next = function (n) {\n'
        + 'n.i++;\n'
        + 'if (n.i >= n.length) n.i = 0;\n'
        + '}\n';

      // 包装
      var wrap_top =    '/* == Template Begin == */\n'
        +    'var $_buf = \'\';\n'
        +    'var $_line_num = 0;\n'
        +    define_cycle;
      var wrap_bottom = '\n/* == Template End == */\n';
      var code = wrap_top + scripts.join('\n') + wrap_bottom;

      // console.log('names', context.varNames);
      // console.log('includes', context.includes);

      return {code: code, names: context.varNames, includes: context.includes};
    };

    /**
     * 编译代码(可运行的函数代码)
     *
     * @param {string} text 模板内容
     * @param {object} options 选项  files:子模版文件代码, original:是否返回原始代码
     *                               tags:自定义标记解析,  filename:当前模板文件名(用于显示出错信息)
     *                               noeval:不执行eval(用于调试)，直接返回 {code, names, includes}
     * @return {function}
     */
    exports.compile = function (text, options) {
      options = options || {};

      // 编译代码
      var tpl = exports.parse(text, options);

      var script = '(function (locals, filters) { \n'
        //+ '\'use strict\';\n'
        + 'locals = locals || {};\n'
        + 'filters = filters || {};\n'
        + 'var global = {locals: locals, filters: filters};\n'
        + 'var $_html = ' + utils.outputHtml.toString() + ';\n'
        + 'var $_err = ' + utils.errorMessage.toString() + ';\n'
        + 'var $_rethrow = ' + utils.rethrowError.toString() + ';\n'
        + 'var $_merge = ' + utils.merge.toString() + ';\n'
        + 'var $_range = ' + utils.range.toString() + ';\n'
        + 'var $_array = ' + utils.toArray.toString() + ';\n'
        + 'try { \n'
        + tpl.code + '\n'
        + '} catch (err) {\n'
        + '  $_rethrow(err, "' + (options.filename || '').replace(/"/img, '\\"') + '");\n'
        + '}\n'
        + 'return $_buf;\n'
        + '})';
      //console.log(script);

      // 用于调试
      if (options.noeval) {
        return {
          code:     script,
          names:    tpl.names,
          includes: tpl.includes
        };
      }

      try {
        var fn = eval(script);

        // 设置依赖的资源
        fn.names = tpl.names;         // 变量
        fn.includes = tpl.includes;   // 子模版

        // 如果设置了original=true选项，则直接返回原始代码，否则自动封装filters
        if (options.original)
          return fn;

        // 封装filters
        var fnWrap = function (d, f) {
          return fn(d, f || filters);
        };
        fnWrap.names = fn.names;
        fnWrap.includes = fn.includes;
        return fnWrap;
      }
      catch (err) {
        throw Error('Compile error: ' + err);
      }
    };

    /**
     * 渲染
     *
     * @param {string} text 模板内容
     * @param {object} data 数据
     * @param {object} f 自定义函数
     * @return {text}
     */
    exports.render = function (text, data, f) {
      var fn = exports.compile(text);
      return fn(data, f);
    };

    return exports;
  })({});

  module.exports = {
    utils: utils,
    template: template,
    filters: filters,
    parser: parser
  };

});