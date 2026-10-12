// DOM מזויף מינימלי להרצת קוד תצוגה ב-vm: יצירת אלמנטים, עץ ילדים,
// classList, dataset, טקסט, מאזינים ו-querySelector לסלקטורים פשוטים.
// משותף להרנסים שבונים DOM אמיתי דרך הקומפוננטות (dialog, button, slider).

function makeFakeDom() {
  const docListeners = [];

  function matches(el, sel) {
    if (sel.startsWith("#")) return el.id === sel.slice(1);
    if (sel.startsWith(".")) return el.classList.contains(sel.slice(1));
    const attr = /^\[data-action="([^"]+)"\]$/.exec(sel);
    if (attr) return el.dataset.action === attr[1];
    return el.tagName === sel.toUpperCase();
  }

  function walk(el, fn) {
    for (const c of el.children) {
      if (c.nodeType !== 3) {
        fn(c);
        walk(c, fn);
      }
    }
  }

  // style עם תמיכה במאפיינים מותאמים (--cme-*), כמו CSSStyleDeclaration
  function makeStyle() {
    const custom = {};
    return {
      setProperty(k, v) { custom[k] = String(v); },
      getPropertyValue(k) { return custom[k] || ""; },
      removeProperty(k) { delete custom[k]; },
    };
  }

  function makeEl(tag) {
    const el = {
      nodeType: 1,
      tagName: String(tag).toUpperCase(),
      id: "",
      style: makeStyle(),
      dataset: {},
      children: [],
      parentNode: null,
      listeners: {},
      _class: new Set(),
      _text: "",
      _html: "",
      get className() { return [...this._class].join(" "); },
      set className(v) { this._class = new Set(String(v).split(/\s+/).filter(Boolean)); },
      classList: {
        add: (...c) => c.forEach((x) => el._class.add(x)),
        remove: (...c) => c.forEach((x) => el._class.delete(x)),
        toggle: (c, force) => {
          const on = force === undefined ? !el._class.has(c) : !!force;
          if (on) el._class.add(c); else el._class.delete(c);
          return on;
        },
        contains: (c) => el._class.has(c),
      },
      get textContent() {
        return this._text + this.children.map((c) => c.textContent || "").join("");
      },
      set textContent(v) { this._text = String(v); this.children = []; },
      get innerHTML() { return this._html || this.textContent; },
      set innerHTML(v) { this._html = String(v); this.children = []; },
      appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
      removeChild(c) { el.children = el.children.filter((x) => x !== c); c.parentNode = null; },
      remove() { if (el.parentNode) el.parentNode.removeChild(el); },
      addEventListener(type, fn) { (el.listeners[type] = el.listeners[type] || []).push(fn); },
      removeEventListener(type, fn) {
        el.listeners[type] = (el.listeners[type] || []).filter((f) => f !== fn);
      },
      click() { (el.listeners.click || []).forEach((fn) => fn({ target: el, stopPropagation() {} })); },
      querySelector(sel) { let found = null; walk(el, (c) => { if (!found && matches(c, sel)) found = c; }); return found; },
      querySelectorAll(sel) { const out = []; walk(el, (c) => { if (matches(c, sel)) out.push(c); }); return out; },
      // _rect ניתן לקביעה מהבדיקה; ברירת מחדל היא תיבה ריקה
      getBoundingClientRect() { return el._rect || { left: 0, top: 0, width: 0, height: 0 }; },
      // שיגור אירוע אל המאזינים של האלמנט עצמו
      fire(type, evt) {
        const e = Object.assign({ type, target: el, currentTarget: el, preventDefault() {}, stopPropagation() {} }, evt);
        (el.listeners[type] || []).forEach((fn) => fn(e));
        return e;
      },
    };
    return el;
  }

  const body = makeEl("body");
  const document = {
    body,
    documentElement: makeEl("html"),
    createElement: makeEl,
    createTextNode: (t) => ({ nodeType: 3, textContent: String(t) }),
    addEventListener(type, fn) { docListeners.push({ type, fn }); },
    removeEventListener(type, fn) {
      const i = docListeners.findIndex((l) => l.type === type && l.fn === fn);
      if (i >= 0) docListeners.splice(i, 1);
    },
    getElementById(id) { return body.querySelector("#" + id); },
    querySelector: (sel) => body.querySelector(sel),
    querySelectorAll: (sel) => body.querySelectorAll(sel),
  };

  // שיגור אירוע לכל המאזינים על document
  function fire(type, evt) {
    for (const l of [...docListeners]) if (l.type === type) l.fn(Object.assign({ type }, evt));
  }
  const keydown = (key) => fire("keydown", { key });

  return { document, body, docListeners, fire, keydown };
}

module.exports = { makeFakeDom };
