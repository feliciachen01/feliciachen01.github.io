/* dc-lite: renders the portfolio's template (holes, <sc-for>, <sc-if>) with React.
   The page's logic class extends DCLogic and supplies renderVals(); React handles updates. */
(function () {
  'use strict';
  var h = React.createElement;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;
  var EVENTS = { onclick: 'onClick', onsubmit: 'onSubmit', onmouseenter: 'onMouseEnter', onmouseleave: 'onMouseLeave',
    onfocus: 'onFocus', onblur: 'onBlur', onkeydown: 'onKeyDown', onchange: 'onChange', oninput: 'onInput' };
  var RENAME = { 'class': 'className', 'for': 'htmlFor', tabindex: 'tabIndex', autocomplete: 'autoComplete',
    readonly: 'readOnly', maxlength: 'maxLength', srcset: 'srcSet', crossorigin: 'crossOrigin' };
  var BOOL = { required: 1, disabled: 1, hidden: 1, checked: 1, multiple: 1, autofocus: 1, open: 1 };

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.'), v = scope;
    for (var i = 0; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) { var v = lookup(scope, p); return v == null ? '' : String(v); });
  }
  function camel(s) { return s.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); }); }
  function styleObj(str) {
    var o = {};
    str.split(';').forEach(function (decl) {
      var k = decl.indexOf(':');
      if (k < 0) return;
      var name = decl.slice(0, k).trim(), val = decl.slice(k + 1).trim();
      if (!name) return;
      o[name.indexOf('--') === 0 ? name : camel(name)] = val;
    });
    return o;
  }

  function props(el, scope, key) {
    var p = { key: key };
    for (var i = 0; i < el.attributes.length; i++) {
      var a = el.attributes[i], name = a.name, raw = a.value, m = raw.match(WHOLE);
      var val = m ? lookup(scope, m[1]) : interp(raw, scope);
      if (EVENTS[name]) { p[EVENTS[name]] = val; continue; }
      if (name === 'ref') { p.ref = val; continue; }
      if (name === 'style') { p.style = styleObj(String(val)); continue; }
      if (BOOL[name]) { p[name] = m ? !!val : true; continue; }
      if (name.indexOf('aria-') === 0 || name.indexOf('data-') === 0) { p[name] = val == null ? undefined : String(val); continue; }
      p[RENAME[name] || name] = val;
    }
    return p;
  }

  function svgProps(el, key) {
    var p = { key: key, dangerouslySetInnerHTML: { __html: el.innerHTML } };
    for (var i = 0; i < el.attributes.length; i++) {
      var n = el.attributes[i].name;
      p[n.indexOf('aria-') === 0 ? n : (n === 'class' ? 'className' : camel(n))] = el.attributes[i].value;
    }
    return p;
  }

  function kids(node, scope) {
    var out = [];
    for (var i = 0; i < node.childNodes.length; i++) {
      var r = render(node.childNodes[i], scope, i);
      if (Array.isArray(r)) out.push.apply(out, r); else if (r != null) out.push(r);
    }
    return out;
  }

  function render(node, scope, key) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      return t.indexOf('{{') < 0 ? t : interp(t, scope);
    }
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (tag === 'sc-if') {
      var cond = lookup(scope, (node.getAttribute('value').match(WHOLE) || [, 'false'])[1]);
      return cond ? h(React.Fragment, { key: key }, kids(node, scope)) : null;
    }
    if (tag === 'sc-for') {
      var list = lookup(scope, node.getAttribute('list').match(WHOLE)[1]) || [];
      var as = node.getAttribute('as') || 'item';
      return list.map(function (item, idx) {
        var inner = Object.create(scope);
        inner[as] = item; inner.$index = idx;
        return h(React.Fragment, { key: key + ':' + idx }, kids(node, inner));
      });
    }
    if (tag === 'svg') return h('svg', svgProps(node, key));
    var c = kids(node, scope);
    var pr = props(node, scope, key);
    if (tag === 'textarea' || tag === 'input' || tag === 'img' || tag === 'br') return h(tag, pr);
    return h.apply(null, [tag, pr].concat(c));
  }

  var template = null;
  window.DCLogic = class extends React.Component {
    render() {
      var vals = this.renderVals();
      return h(React.Fragment, null, kids(template, vals));
    }
  };

  window.dcMount = function (templateEl, Component, rootEl, initialProps) {
    template = templateEl.content;
    ReactDOM.createRoot(rootEl).render(h(Component, initialProps || {}));
  };
})();
