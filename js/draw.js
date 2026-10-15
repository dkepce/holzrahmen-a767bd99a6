/* Holzrahmen — drawing. Builds SVG strings (cm units) from APP.G.resolve() output.
   Both views use the same x scale and the same side margins, so a post in the plan sits right under its post in the elevation.
   CSS classes (style.css): ins, wood, wsec, board, aufb, open, dim, axis ... */
window.APP = window.APP || {};
(function (APP) {
  const U = APP.U, D = (APP.Draw = {});
  const f = v => (Math.round(v * 100) / 100).toString();
  const num = v => (Math.round(v * 10) / 10).toString().replace(".", ",");

  D.fontSize = R => Math.max(4, (R.L + 60) / 80);
  const margins = (R, nOps, fsOver) => { const fs = fsOver || D.fontSize(R); return { fs, l: fs * 8, r: fs * (6 + 3.6 * Math.max(1, nOps)), t: fs * 4, b: fs * (8 + 2.4 * Math.max(1, nOps)) }; };

  /* ---------- dimension helpers ---------- */
  function dh(x1, x2, y, label, fs, o) {                     // horizontal dimension, text above the line
    o = o || {};
    const t = fs * 0.5;
    let s = '<g class="dim">';
    if (o.ext != null) s += '<line class="ext" x1="' + f(x1) + '" x2="' + f(x1) + '" y1="' + f(y) + '" y2="' + f(o.ext) + '"/><line class="ext" x1="' + f(x2) + '" x2="' + f(x2) + '" y1="' + f(y) + '" y2="' + f(o.ext) + '"/>';
    s += '<line x1="' + f(x1) + '" x2="' + f(x2) + '" y1="' + f(y) + '" y2="' + f(y) + '"/>';
    s += '<line x1="' + f(x1 - t) + '" x2="' + f(x1 + t) + '" y1="' + f(y + t) + '" y2="' + f(y - t) + '"/><line x1="' + f(x2 - t) + '" x2="' + f(x2 + t) + '" y1="' + f(y + t) + '" y2="' + f(y - t) + '"/>';
    const small = (x2 - x1) < label.length * fs * 0.55;
    s += '<text x="' + f(small ? x2 + fs * 0.4 : (x1 + x2) / 2) + '" y="' + f(y - fs * 0.35) + '" text-anchor="' + (small ? "start" : "middle") + '" font-size="' + f(fs) + '">' + U.esc(label) + "</text></g>";
    return s;
  }
  function dv(z1, z2, x, label, fs, H, o) {                   // vertical dimension in elevation (z up, y = H - z)
    o = o || {};
    const y1 = H - z1, y2 = H - z2, t = fs * 0.5, ym = (y1 + y2) / 2;
    let s = '<g class="dim">';
    if (o.ext != null) s += '<line class="ext" x1="' + f(x) + '" x2="' + f(o.ext) + '" y1="' + f(y1) + '" y2="' + f(y1) + '"/><line class="ext" x1="' + f(x) + '" x2="' + f(o.ext) + '" y1="' + f(y2) + '" y2="' + f(y2) + '"/>';
    s += '<line x1="' + f(x) + '" x2="' + f(x) + '" y1="' + f(y1) + '" y2="' + f(y2) + '"/>';
    s += '<line x1="' + f(x - t) + '" x2="' + f(x + t) + '" y1="' + f(y1 + t) + '" y2="' + f(y1 - t) + '"/><line x1="' + f(x - t) + '" x2="' + f(x + t) + '" y1="' + f(y2 + t) + '" y2="' + f(y2 - t) + '"/>';
    s += '<text transform="translate(' + f(x - fs * 0.35) + "," + f(ym) + ') rotate(-90)" text-anchor="middle" font-size="' + f(fs) + '">' + U.esc(label) + "</text></g>";
    return s;
  }
  function txt(x, y, s, fs, cls, anchor) { return '<text class="' + (cls || "") + '" x="' + f(x) + '" y="' + f(y) + '" font-size="' + f(fs) + '" text-anchor="' + (anchor || "middle") + '">' + U.esc(s) + "</text>"; }

  /* Dämmstoff, plan section: honeycomb (pointy-top hexagons) inside a thin box. The grid starts at the top-left corner of each field and is
     clipped to it. Hexagon size follows the field depth (circumradius = depth / 5, between 1.2 and 6 cm), so it is never tiny or huge. */
  let clipN = 0;
  function loops(x0, x1, y0, y1) {
    const w = x1 - x0, h = y1 - y0, across = Math.min(w, h), r = Math.min(6, Math.max(1.2, Math.max(h, 1) / 5)), cw = Math.sqrt(3) * r, id = "ci" + (++clipN);
    let d = "";
    for (let j = 0, cy = y0 + r; cy - r < y1 + 0.01; j++, cy = y0 + r + j * 1.5 * r) {
      for (let i = -1, cx = x0 + cw / 2 - cw + (j % 2 ? cw / 2 : 0); cx - cw / 2 < x1 + 0.01; i++, cx = x0 + cw / 2 + i * cw + (j % 2 ? cw / 2 : 0)) {
        for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 30); d += (k ? "L" : "M") + f(cx + r * Math.cos(a)) + " " + f(cy + r * Math.sin(a)); }
        d += "Z";
      }
    }
    return '<clipPath id="' + id + '"><rect x="' + f(x0) + '" y="' + f(y0) + '" width="' + f(w) + '" height="' + f(h) + '"/></clipPath>' +
      '<g clip-path="url(#' + id + ')"><path class="insl" d="' + d + '"/></g><rect class="insbox" x="' + f(x0) + '" y="' + f(y0) + '" width="' + f(w) + '" height="' + f(h) + '"/>';
  }

  /* ---------- front elevation ---------- */
  D.elevation = function (R, opt) {
    opt = opt || {};
    const m = margins(R, R.ops.length), fs = m.fs, L = R.L, H = R.H;
    const vb = [-m.l, -m.t, L + m.l + m.r, H + m.t + m.b];
    const zy = z => H - z;
    let s = '<svg class="view" viewBox="' + vb.map(f).join(" ") + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Ansicht ' + U.esc(R.w.id) + '">';

    // insulation fills the frame zone, wood members and openings sit on top
    APP.G.cavities(R).forEach(c => {
      s += '<rect class="ins" x="' + f(c.x0) + '" y="' + f(zy(c.z1)) + '" width="' + f(c.x1 - c.x0) + '" height="' + f(c.z1 - c.z0) + '"/>';
    });
    R.members.forEach(mb => { s += '<rect class="wood k-' + mb.kind + '" x="' + f(mb.x0) + '" y="' + f(zy(mb.z1)) + '" width="' + f(mb.x1 - mb.x0) + '" height="' + f(mb.z1 - mb.z0) + '"/>'; });
    s += '<rect class="outline" x="0" y="0" width="' + f(L) + '" height="' + f(H) + '"/>';

    R.ops.forEach(p => {
      const x0 = Math.max(0, p.x0), x1 = Math.min(L, p.x1), z0 = Math.max(0, p.z0), z1 = Math.min(H, p.z1), w = x1 - x0, h = z1 - z0;
      s += '<g class="opening"><rect class="open" x="' + f(x0) + '" y="' + f(zy(z1)) + '" width="' + f(w) + '" height="' + f(h) + '"/>';
      const teil = Math.max(1, Math.round(p.raw.teilung || 1));
      for (let i = 1; i < teil; i++) s += '<line class="sash" x1="' + f(x0 + w * i / teil) + '" x2="' + f(x0 + w * i / teil) + '" y1="' + f(zy(z1)) + '" y2="' + f(zy(z0)) + '"/>';
      if (/DF|DKF|DRT/.test(p.typ)) {                           // Drehflügel: Öffnungsdreieck in the first sash
        const sw = w / teil;
        s += '<polyline class="sash" points="' + f(x0) + ',' + f(zy(z0)) + ' ' + f(x0 + sw) + ',' + f(zy((z0 + z1) / 2)) + ' ' + f(x0) + ',' + f(zy(z1)) + '"/>';
      }
      s += txt((x0 + x1) / 2, zy((z0 + z1) / 2) - fs * 0.2, "A" + p.n + " · " + p.typ, fs, "olabel") +
        txt((x0 + x1) / 2, zy((z0 + z1) / 2) + fs * 1.1, "RBL " + num(p.W) + " × " + num(p.H), fs * 0.85, "olabel2") + "</g>";
      if (opt.dims) {
        s += '<line class="axis" x1="' + f(p.cx) + '" x2="' + f(p.cx) + '" y1="' + f(zy(Math.min(H, p.z1 + 12))) + '" y2="' + f(H + fs * (2.5 + 2.4 * p.n)) + '"/>';
      }
    });

    // cut line of the plan view
    if (opt.cutZ != null) {
      const y = zy(opt.cutZ);
      s += '<line class="cut" x1="' + f(-fs * 1.5) + '" x2="' + f(L + fs * 1.5) + '" y1="' + f(y) + '" y2="' + f(y) + '"/>' +
        txt(-fs * 1.8, y - fs * 0.3, "Schnitt", fs * 0.9, "cutlbl", "end");
    }

    if (opt.dims) {
      // overall
      s += dh(0, L, H + fs * 2.5, "b = " + num(L), fs, { ext: H });
      R.ops.forEach(p => { s += dh(0, p.cx, H + fs * (2.5 + 2.4 * p.n), "bA" + p.n + " = " + num(p.cx), fs); });
      s += dv(0, H, -fs * 3, "h = " + num(H), fs, H, { ext: 0 });
      s += dv(H - R.hOG, H, -fs * 5.6, "hOG " + num(R.hOG), fs * 0.85, H, { ext: 0 });
      s += dv(0, R.hUG, -fs * 5.6, "hUG " + num(R.hUG), fs * 0.85, H, { ext: 0 });
      // vertical chain per opening
      R.ops.forEach((p, i) => {
        const x = L + fs * (3 + 3.6 * i), e = L;
        const z0 = Math.max(0, p.z0), z1 = Math.min(H, p.z1);
        const tag = "A" + p.n;
        if (z0 > 0.01) s += dv(0, z0, x, "hP" + p.n + " " + num(p.z0), fs * 0.85, H);
        s += dv(z0, z1, x, num(p.H), fs * 0.85, H, { ext: e });
        if (H - z1 > 0.01) s += dv(z1, H, x, "hST " + num(p.hSTcalc), fs * 0.85, H);
      });
      // post spacing: first two regular posts
      const posts = R.members.filter(q => q.kind === "post").map(q => (q.x0 + q.x1) / 2).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
      for (let i = 0; i + 1 < posts.length; i++) if (Math.abs(posts[i + 1] - posts[i] - R.ap) < 0.2) { s += dh(posts[i], posts[i + 1], -fs * 1.3, "ap " + num(R.ap), fs * 0.9); break; }
    }
    return s + "</svg>";
  };

  /* ---------- plan section ---------- */
  D.layers = function (R) {                                   // outside (top of drawing) -> inside (bottom)
    const w = R.w, L = [];
    if (w.da > 0) L.push({ key: "da", t: w.da, name: "Aufbau außen", cls: "aufb" });
    if (w.dba > 0) L.push({ key: "dba", t: w.dba, name: "Beplankung außen" + (w.bepA ? " (" + w.bepA + ")" : ""), cls: "board" });
    L.push({ key: "dp", t: R.dp, name: "Rahmen: Holz + Dämmung", cls: "frame" });
    if (w.dbi > 0) L.push({ key: "dbi", t: w.dbi, name: "Beplankung innen" + (w.bepI ? " (" + w.bepI + ")" : ""), cls: "board" });
    if (w.di > 0) L.push({ key: "di", t: w.di, name: "Installationsebene", cls: "aufb" });
    return L;
  };

  D.plan = function (R, opt) {
    opt = opt || {};
    const L = R.L, zoom = Math.max(1, opt.zoom || 1);
    const vw = L / zoom, vx0 = (L - vw) * Math.min(1, Math.max(0, opt.pan || 0)), vx1 = vx0 + vw;   // visible x-range (cm)
    const m = margins(R, R.ops.length, zoom > 1 ? Math.max(1.6, (vw + 60) / 80) : null), fs = m.fs, k = 1;   // true scale: thickness and length 1:1
    const lay = D.layers(R); let y = 0; lay.forEach(l => { l.y0 = y; l.y1 = y + l.t * k; y = l.y1; });
    const T = y, planT = fs * 3.2, planB = fs * 8;
    const pa = APP.G.planAt(R, opt.cutZ != null ? opt.cutZ : R.H / 2);
    const vb = [vx0 - m.l, -planT, vw + m.l + m.r, T + planT + planB];
    let s = '<svg class="view" viewBox="' + vb.map(f).join(" ") + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Schnitt ' + U.esc(R.w.id) + '">';
    const clipId = "pc" + Math.round(vx0);
    s += '<defs><clipPath id="' + clipId + '"><rect x="' + f(vx0) + '" y="' + f(-planT) + '" width="' + f(vw) + '" height="' + f(T + planT + planB) + '"/></clipPath></defs><g clip-path="url(#' + clipId + ')">';

    lay.forEach(l => {
      pa.solid.forEach(sg => {
        s += '<rect class="' + l.cls + '" x="' + f(sg[0]) + '" y="' + f(l.y0) + '" width="' + f(sg[1] - sg[0]) + '" height="' + f(l.y1 - l.y0) + '"/>';
      });
      if (l.key === "dp") {                                   // insulation between the wood pieces, loops fitted to each field
        pa.solid.forEach(sg => {
          const ws = pa.wood.filter(q => q.x1 > sg[0] && q.x0 < sg[1]).sort((a, b) => a.x0 - b.x0); let x = sg[0];
          ws.concat([{ x0: sg[1], x1: sg[1] }]).forEach(q => { if (q.x0 - x > 0.3) s += loops(x, q.x0, l.y0, l.y1); x = Math.max(x, q.x1); });
        });
      }
      if (l.key === "dp") pa.wood.forEach(wd => {            // Holz im Schnitt: one X corner to corner (long pieces: one X per cell about as wide as the depth)
        const w = wd.x1 - wd.x0, h = l.y1 - l.y0, n = Math.max(1, Math.round(w / h));
        s += '<rect class="wsec k-' + wd.kind + '" x="' + f(wd.x0) + '" y="' + f(l.y0) + '" width="' + f(w) + '" height="' + f(h) + '"/>';
        for (let i = 0; i < n; i++) {
          const a = wd.x0 + w * i / n, b = wd.x0 + w * (i + 1) / n;
          s += '<path class="wx" d="M' + f(a) + ' ' + f(l.y0) + ' L' + f(b) + ' ' + f(l.y1) + ' M' + f(b) + ' ' + f(l.y0) + ' L' + f(a) + ' ' + f(l.y1) + '"/>';
        }
      });
    });
    pa.gaps.forEach(g => {                                    // openings: dashed reveal lines through the full thickness
      s += '<rect class="gap" x="' + f(g.x0) + '" y="0" width="' + f(g.x1 - g.x0) + '" height="' + f(T) + '"/>' +
        txt((Math.max(g.x0, vx0) + Math.min(g.x1, vx1)) / 2, T + fs * 1.6, "A" + g.n + " · " + g.typ, fs * 0.9, "olabel");
    });
    s += txt(vx0, -fs * 0.8, "links " + (R.w.L.typ || "–"), fs * 0.85, "endlbl", "start");
    s += txt(vx1, -fs * 0.8, "rechts " + (R.w.R.typ || "–"), fs * 0.85, "endlbl", "end");
    s += txt((vx0 + vx1) / 2, -fs * 0.8, R.w.cls === "aw" ? "außen" : "Seite A", fs * 0.9, "sidelbl");
    s += txt((vx0 + vx1) / 2, T + fs * 1.6 + (pa.gaps.length ? fs * 1.4 : 0), R.w.cls === "aw" ? "innen" : "Seite B", fs * 0.9, "sidelbl");

    if (opt.dims) {
      const yb = T + fs * 4.4 + (pa.gaps.length ? fs * 0 : 0);
      // all wood pieces cut at this height, with their width
      pa.wood.filter(q => q.x1 > vx0 && q.x0 < vx1 && (q.x1 - q.x0) * (zoom > 3 ? 1 : 0) >= 0 && zoom >= 2).forEach(q => {
        s += dh(q.x0, q.x1, T + fs * 3.2, num(q.x1 - q.x0), fs * 0.7);
      });
      if (zoom < 2) {
        s += dh(0, R.bPl, yb, "bPl " + num(R.bPl), fs * 0.85);
        s += dh(L - R.bPr, L, yb, "bPr " + num(R.bPr), fs * 0.85);
      }
      const reg = pa.wood.filter(q => q.kind === "post").sort((a, b) => a.x0 - b.x0);
      for (let i = 0; i + 1 < reg.length; i++) {
        const c0 = (reg[i].x0 + reg[i].x1) / 2, c1 = (reg[i + 1].x0 + reg[i + 1].x1) / 2;
        if (Math.abs(c1 - c0 - R.ap) < 0.2 && c1 > vx0 && c0 < vx1) { s += dh(c0, c1, yb + fs * 2.6, "ap " + num(R.ap), fs * 0.85, { ext: T }); break; }
      }
    }
    s += "</g>";
    if (opt.dims) {                                           // layer thicknesses, outside the clip so the labels stay readable
      const x = vx1 + fs * 2.5;
      lay.forEach(l => { s += dvPlan(l.y0, l.y1, x, num(l.t), fs * 0.85); });
      s += dvPlan(0, T, x + fs * 3.6, "dges " + num(R.w.dges != null ? R.w.dges : lay.reduce((a, l) => a + l.t, 0)), fs * 0.85);
    }
    s += txt(vx0 - fs * 1.2, T / 2 + fs * 0.3, zoom > 1 ? "1:1 · Ausschnitt" : "1:1", fs * 0.8, "note", "end");
    return s + "</svg>";
  };
  function dvPlan(y1, y2, x, label, fs) {                     // vertical dimension in plan (y down)
    const t = fs * 0.5, ym = (y1 + y2) / 2;
    return '<g class="dim"><line x1="' + f(x) + '" x2="' + f(x) + '" y1="' + f(y1) + '" y2="' + f(y2) + '"/>' +
      '<line x1="' + f(x - t) + '" x2="' + f(x + t) + '" y1="' + f(y1 + t) + '" y2="' + f(y1 - t) + '"/><line x1="' + f(x - t) + '" x2="' + f(x + t) + '" y1="' + f(y2 + t) + '" y2="' + f(y2 - t) + '"/>' +
      '<text x="' + f(x + fs * 0.6) + '" y="' + f(ym + fs * 0.35) + '" font-size="' + f(fs) + '">' + U.esc(label) + "</text></g>";
  }
})(window.APP);
