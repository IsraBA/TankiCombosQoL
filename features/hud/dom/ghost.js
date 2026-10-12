// features/hud/dom/ghost.js  [ISOLATED world]

// העותק הנסתר בגודל החלון: מדידה בלי קרב, ושכפול לציור בעורך
(function () {
  "use strict";

  window.TankiQoL = window.TankiQoL || {};
  const Q = window.TankiQoL;
  const C = () => Q.HudDomCatalog;
  const asset = (name) => (Q.HudRecipes ? Q.HudRecipes.asset(name) : null);

  // מלבן פריסה בלי טרנספורמציות: offset לאורך שרשרת ההורים
  function layoutBox(el) {
    let x = 0, y = 0, n = el;
    while (n) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  }

  function union(boxes) {
    const x0 = Math.min(...boxes.map((b) => b.x)), y0 = Math.min(...boxes.map((b) => b.y));
    const x1 = Math.max(...boxes.map((b) => b.x + b.w)), y1 = Math.max(...boxes.map((b) => b.y + b.h));
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  const labelsOn = () => {
    const s = Q.HudBridge ? Q.HudBridge.getState() : null;
    return !s || s.showButtonLabels !== false;
  };

  // {id: {rect, px, nodes}}; נמדד מחדש כשהחלון/הגופן/התוויות משתנים
  let cache = null, cacheKey = "";
  function measure() {
    const font = getComputedStyle(document.documentElement).fontSize;
    const labels = labelsOn();
    const key = [window.innerWidth, window.innerHeight, font, labels,
      !!asset("icPause"), !!asset("rank"), !!asset("experience")].join("|");
    if (cache && key === cacheKey) return cache;
    if (!document.body || !C() || !Q.DOM || !Q.HudDomMarkup) return {};

    const root = Q.HudDomMarkup.build(labels);
    document.body.appendChild(root);
    const W = window.innerWidth, H = window.innerHeight;
    const out = {};
    for (const e of C().ELEMENTS) {
      const nodes = e.find(root, C().ghostClass).map((node) => ({ node, box: layoutBox(node) }))
        .filter((n) => n.box.w > 0 && n.box.h > 0);
      if (!nodes.length) continue;
      const u = union(nodes.map((n) => n.box));
      out[e.id] = {
        rect: { x: u.x / W, y: u.y / H, w: u.w / W, h: u.h / H },
        px: u,
        nodes: nodes.map((n) => ({ html: n.node.outerHTML, box: n.box })),
      };
    }
    root.remove();
    cache = out;
    cacheKey = key;
    return out;
  }

  Q.HudDom = {
    // {id: rect} בשברי החלון, לכל רכיבי ה-HTML
    rects() {
      const m = measure();
      const out = {};
      for (const id of Object.keys(m)) out[id] = m[id].rect;
      return out;
    },

    // עותקים לעורך: [{node, x, y (שברי המלבן), w, h (פיקסלים)}]
    clone(id) {
      const m = measure()[id];
      if (!m) return [];
      return m.nodes.map((n) => {
        const host = document.createElement("div");
        host.innerHTML = n.html;
        return {
          node: host.firstElementChild,
          x: (n.box.x - m.px.x) / m.px.w, y: (n.box.y - m.px.y) / m.px.h,
          w: n.box.w, h: n.box.h,
        };
      });
    },

    layoutBox,
    union,
  };
})();
