/* Holzrahmen — geometry. Turns one catalogue row into rectangles (cm). No drawing here, so it can be tested in node.
   Elevation coordinates: x from the left wall end, z from the underside of the wall (z = 0) up to h.
   Everything the Excel does not say is filled with a default AND listed in R.derived / R.warn so the UI can mark it. */
window.APP = window.APP || {};
(function (APP) {
  const G = (APP.G = {});
  const DOOR = /DRT|DG|HST|PSK/;                       // door-like types: no sill, bottom Riegel is interrupted
  const r1 = v => Math.round(v * 10) / 10;

  G.isDoor = typ => DOOR.test(typ || "");

  /* resolve(wall, {lintelT}) -> everything needed to draw */
  G.resolve = function (w, o) {
    o = o || {};
    const R = { w, L: w.b, H: w.h, warn: [], derived: [], members: [], ops: [] };
    const need = (key, val, why) => { R.derived.push({ key, val, why }); return val; };

    R.hOG = w.O.h != null ? w.O.h : need("hOG", 5, "nicht angegeben");
    R.hUG = w.Un.h != null ? w.Un.h : need("hUG", 5, "nicht angegeben");
    R.dp = w.dp != null ? w.dp : need("dp", 10, "nicht angegeben");
    R.bp = w.bp != null ? w.bp : need("bp", 5, "Pfostenbreite nicht angegeben");
    if (w.ap != null) R.ap = w.ap;
    else R.ap = need("ap", 62.5, "Pfostenabstand '" + (w.apRaw || "leer") + "' im Katalog, 62,5 cm angenommen");
    R.minGap = 2 * R.bp;                                   // a gap between two posts narrower than this is closed (see end of resolve)
    R.bPl = w.L.b != null ? w.L.b : R.bp;
    R.bPr = w.R.b != null ? w.R.b : R.bp;
    R.lintelT = o.lintelT != null ? o.lintelT : R.hUG;   // Sturz-/Brüstungsriegel: Annahme = wie hUG (Doruk: ähnlich hUG / Pfostenbreite)
    const zTop = R.H - R.hOG, zBot = R.hUG;

    /* ---- openings ---- */
    w.ops.forEach(op => {
      const door = G.isDoor(op.typ);
      let W = op.RBL && op.RBL.b, Hh = op.RBL && op.RBL.h, d = [];
      if (W == null && op.DL && op.DL.b != null) { W = op.DL.b + 10; d.push("Breite = Türlichte + 10"); }
      if (W == null && op.AL && op.AL.b != null) { W = op.AL.b + 2.4; d.push("Breite = Architekturlichte + 2,4"); }
      if (Hh == null && op.DL && op.DL.h != null) { Hh = op.DL.h + 2.5; d.push("Höhe = Türlichte + 2,5"); }
      if (Hh == null && op.AL && op.AL.h != null) { Hh = op.AL.h + 2.4; d.push("Höhe = Architekturlichte + 2,4"); }
      if (W == null) { R.warn.push("Öffnung A" + op.n + " (" + op.typ + "): keine Breite im Katalog, nicht gezeichnet."); return; }
      if (op.bA == null) { R.warn.push("Öffnung A" + op.n + " (" + op.typ + "): keine Achslage bA, nicht gezeichnet."); return; }
      if (Hh == null) { Hh = door ? 210 : 120; d.push("Höhe nicht angegeben, " + Hh + " angenommen"); }
      let z0;
      if (op.hP != null) z0 = op.hP;
      else if (door) { z0 = 0; d.push("Brüstung 0 (Tür)"); }
      else if (op.hST != null) { z0 = R.H - op.hST - Hh; d.push("Brüstung aus Sturzhöhe berechnet"); }
      else { z0 = 90; d.push("Brüstung nicht angegeben, 90 angenommen"); }
      const z1 = z0 + Hh;
      const x0 = op.bA - W / 2, x1 = op.bA + W / 2;
      const hSTcalc = R.H - z1;
      if (op.hST != null && Math.abs(hSTcalc - op.hST) > 3)
        R.warn.push("Öffnung A" + op.n + " (" + op.typ + "): Höhen passen nicht zusammen. Gezeichnet mit hP + Höhe = " + r1(z1) + " cm; aus hA" + op.n + "ST " + op.hST + " ergäbe sich " + r1(R.H - op.hST) + " cm als Oberkante.");
      if (z1 + R.lintelT > zTop + 0.01) R.warn.push("Öffnung A" + op.n + ": zu wenig Platz für Sturzriegel unter dem oberen Riegel.");
      if (x0 < -0.01 || x1 > R.L + 0.01 || z0 < -0.01 || z1 > R.H + 0.01)
        R.warn.push("Öffnung A" + op.n + " (" + op.typ + "): liegt teilweise außerhalb der Wand (Achse " + op.bA + ", Breite " + r1(W) + ", Oberkante " + r1(z1) + " bei h = " + R.H + "). Katalogwerte prüfen.");
      else if (x0 < R.bPl - 0.01 || x1 > R.L - R.bPr + 0.01) R.warn.push("Öffnung A" + op.n + ": reicht in den Endpfosten.");
      R.ops.push({ n: op.n, typ: op.typ, door, cx: op.bA, W, H: Hh, x0, x1, z0, z1, hSTcalc, hSTgiven: op.hST, hPgiven: op.hP, d, raw: op });
    });
    R.ops.sort((a, b) => a.cx - b.cx);

    /* ---- members (rectangles) ---- */
    const add = (kind, x0, x1, z0, z1) => {            // clipped to the wall, so bad catalogue values cannot draw outside it
      x0 = Math.max(0, x0); x1 = Math.min(R.L, x1); z0 = Math.max(0, z0); z1 = Math.min(R.H, z1);
      if (x1 - x0 > 0.01 && z1 - z0 > 0.01) R.members.push({ kind, x0, x1, z0, z1 });
    };

    // bottom Riegel (interrupted at doors), top Riegel
    let cuts = R.ops.filter(p => p.door && p.z0 <= R.hUG + 10).map(p => [p.x0, p.x1]);
    let x = 0;
    cuts.forEach(c => { add("riegel", x, c[0], 0, R.hUG); x = c[1]; });
    add("riegel", x, R.L, 0, R.hUG);
    add("riegel", 0, R.L, R.H - R.hOG, R.H);

    // end posts
    add("end", 0, R.bPl, zBot, zTop);
    add("end", R.L - R.bPr, R.L, zBot, zTop);

    // king posts + lintel / sill
    const kings = [];
    R.ops.forEach(p => {
      add("king", p.x0 - R.bp, p.x0, zBot, zTop); add("king", p.x1, p.x1 + R.bp, zBot, zTop);
      kings.push([p.x0 - R.bp, p.x0], [p.x1, p.x1 + R.bp]);
      add("lintel", p.x0, p.x1, p.z1, p.z1 + R.lintelT);
      if (!(p.door && p.z0 <= R.hUG + 10)) add("sill", p.x0, p.x1, p.z0 - R.lintelT, p.z0);
    });

    // regular posts on the ap grid, starting at the axis of the left end post
    const eps = 0.05;
    for (let k = 0, c = R.bPl / 2; ; k++, c = R.bPl / 2 + k * R.ap) {
      if (k === 0) continue;                                    // k = 0 is the end post itself
      const a = c - R.bp / 2, b = c + R.bp / 2;
      if (a > R.L - R.bPr + eps) break;
      if (a < R.bPl - eps || b > R.L - R.bPr + eps) continue;
      if (a < R.bPl + R.minGap - eps || b > R.L - R.bPr - R.minGap + eps) continue;     // would leave a sliver next to the end post
      if (kings.some(kg => a < kg[1] - eps && b > kg[0] + eps)) continue;       // would sit on a king post
      if (R.ops.some(p => a < p.x1 - eps && b > p.x0 + eps)) continue;       // over/under an opening the short posts are placed separately (equal fields)
      add("post", a, b, zBot, zTop);
    }

    // short posts above the lintel and below the sill: they divide the opening width into equal fields (field axis spacing <= ap), not the wall grid
    R.ops.forEach(p => {
      const span = p.x1 - p.x0, n = Math.max(1, Math.ceil(span / R.ap - 1e-9)), field = (span - (n - 1) * R.bp) / n;
      const zones = [[p.z1 + R.lintelT, zTop]];
      if (!(p.door && p.z0 <= R.hUG + 10)) zones.push([zBot, p.z0 - R.lintelT]);
      zones.forEach(zn => { for (let i = 1; i < n; i++) { const a = p.x0 + i * field + (i - 1) * R.bp; add("post", a, a + R.bp, zn[0], zn[1]); } });
    });

    /* A king post next to another full-height post with only a sliver of insulation between them is not realistic:
       widen the king post until it touches its neighbour (gap smaller than minGap = 2 x post width). */
    R.merged = 0;
    const full = R.members.filter(m => m.kind !== "riegel" && m.kind !== "lintel" && m.kind !== "sill" && m.z0 <= zBot + 0.01 && m.z1 >= zTop - 0.01);
    full.filter(m => m.kind === "king").sort((a, b) => a.x0 - b.x0).forEach(k => {
      const others = full.filter(m => m !== k);
      const left = others.filter(m => m.x1 <= k.x0 + 0.01).reduce((a, m) => (a == null || m.x1 > a.x1 ? m : a), null);
      const right = others.filter(m => m.x0 >= k.x1 - 0.01).reduce((a, m) => (a == null || m.x0 < a.x0 ? m : a), null);
      if (left && k.x0 - left.x1 > 0.01 && k.x0 - left.x1 < R.minGap) { k.x0 = left.x1; R.merged++; }
      if (right && right.x0 - k.x1 > 0.01 && right.x0 - k.x1 < R.minGap) { k.x1 = right.x0; R.merged++; }
    });
    // king posts lying on an end post (opening reaches the wall end): trim or drop them
    const ends = R.members.filter(m => m.kind === "end");
    R.members = R.members.filter(m => {
      if (m.kind !== "king") return true;
      ends.forEach(e => { if (m.x0 < e.x1 && m.x1 > e.x0) { if (m.x0 >= e.x0 - 0.01) m.x0 = Math.max(m.x0, e.x1); else m.x1 = Math.min(m.x1, e.x0); } });
      return m.x1 - m.x0 > 0.01;
    });
    const kg = R.members.filter(m => m.kind === "king").sort((a, b) => a.x0 - b.x0), drop = new Set();   // openings so close that their king posts overlap: one post
    for (let i = 0, cur = null; i < kg.length; i++) {
      if (cur && kg[i].x0 < cur.x1 - 0.01) { cur.x1 = Math.max(cur.x1, kg[i].x1); drop.add(kg[i]); } else cur = kg[i];
    }
    R.members = R.members.filter(m => !drop.has(m));
    return R;
  };

  /* insulation fields of the elevation: the free rectangles of the frame zone (between posts, Riegel, lintel/sill, around openings) */
  G.cavities = function (R) {
    const zB = R.hUG, zT = R.H - R.hOG, r = v => Math.round(v * 1000) / 1000;
    const xs = new Set([0, R.L]), zs = new Set([zB, zT]);
    R.members.forEach(m => { xs.add(r(m.x0)); xs.add(r(m.x1)); zs.add(r(m.z0)); zs.add(r(m.z1)); });
    R.ops.forEach(p => { xs.add(r(p.x0)); xs.add(r(p.x1)); zs.add(r(p.z0)); zs.add(r(p.z1)); });
    const X = [...xs].filter(v => v >= 0 && v <= R.L).sort((a, b) => a - b), Z = [...zs].filter(v => v >= zB - 1e-6 && v <= zT + 1e-6).sort((a, b) => a - b);
    const out = [], open = {};
    for (let j = 0; j + 1 < Z.length; j++) {
      const za = Z[j], zb = Z[j + 1], cz = (za + zb) / 2, runs = [];
      for (let i = 0; i + 1 < X.length; i++) {
        const xa = X[i], xb = X[i + 1], cx = (xa + xb) / 2;
        const covered = R.members.some(m => cx > m.x0 && cx < m.x1 && cz > m.z0 && cz < m.z1) || R.ops.some(p => cx > p.x0 && cx < p.x1 && cz > p.z0 && cz < p.z1);
        if (covered) continue;
        if (runs.length && Math.abs(runs[runs.length - 1][1] - xa) < 1e-6) runs[runs.length - 1][1] = xb; else runs.push([xa, xb]);
      }
      const next = {};
      runs.forEach(rn => {
        const key = rn[0] + "|" + rn[1], o = open[key];
        if (o && Math.abs(o.z1 - za) < 1e-6) { o.z1 = zb; next[key] = o; } else { const n = { x0: rn[0], x1: rn[1], z0: za, z1: zb }; out.push(n); next[key] = n; }
      });
      Object.keys(open).forEach(k => { delete open[k]; }); Object.assign(open, next);
    }
    return out.filter(c => c.x1 - c.x0 > 0.3 && c.z1 - c.z0 > 0.3);
  };

  /* what the plan section shows at height z: wood pieces (x-ranges), gaps (openings), boards */
  G.planAt = function (R, z) {
    const wood = R.members.filter(m => z >= m.z0 - 1e-6 && z <= m.z1 + 1e-6).map(m => ({ kind: m.kind, x0: m.x0, x1: m.x1 }));
    const gaps = R.ops.filter(p => z > p.z0 + 1e-6 && z < p.z1 - 1e-6).map(p => ({ n: p.n, typ: p.typ, x0: p.x0, x1: p.x1 }));
    // solid wall ranges = [0, L] minus gaps
    const solid = []; let x = 0;
    gaps.sort((a, b) => a.x0 - b.x0).forEach(g => { if (g.x0 > x) solid.push([x, g.x0]); x = g.x1; });
    if (x < R.L) solid.push([x, R.L]);
    return { wood, gaps, solid };
  };
})(window.APP);
