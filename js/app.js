/* Holzrahmen — screens. Two tabs: Katalog (list + elevation + plan + parameters) and Legende (what the codes mean).
   The catalogue itself (APP.CATALOG, js/catalog.js) is generated from the Excel and never saved with the user's data;
   APP.D only holds what Doruk adds: favourites and notes per wall. */
(function (APP) {
  const U = APP.U, $ = U.$, $$ = U.$$, esc = U.esc;
  const num = v => v == null ? "–" : (Math.round(v * 100) / 100).toString().replace(".", ",");
  const CLS = { aw: "Außenwand", iw: "Innenwand", tw: "Trennwand" };
  const TYP = {
    "DRT": "Drehtür", "DRT + FIX": "Drehtür + Fixteil", "HST": "Hebeschiebetür", "PSK": "Parallel-Schiebe-Kipp-Tür",
    "DKF": "Drehkippfenster", "DF": "Drehfenster", "KF": "Kippfenster", "DKF + FIX": "Drehkippfenster + Fixverglasung", "FIX": "Fixverglasung",
    "DG": "Durchgang", "ASP": "Aussparung"
  };
  const BEP = { GFP: "Gipsfaserplatte", GKB: "Gipskartonplatte", SPP: "Spanplatte", OSB: "OSB", MDF: "MDF", VS: "Vollschalung", SPHP: "Sperrholzplatte", SPS: "Sparschalung" };
  const KA = { h: "Hinterlüftung", o: "ohne Hinterlüftung", t: "trocken (Trockenbau)", n: "nass (Nass-/Fließestrich)", x: "–" };
  const KI = { i: "Installationsebene", o: "ohne Installationsebene", a: "abgehängte Decke", n: "nicht abgehängte Decke", x: "–" };
  const FAS = { p: "Putz", h: "Holz & Holzwerkstoffe", z: "Dachziegel/Betondachstein", b: "Blech/Kunststoff", g: "Gründach", x: "–" };

  /* ---------- filter state ---------- */
  APP.DEFAULT_UI.f = { cls: "", maker: "", ops: false, fav: false, min: "", max: "", q: "" };
  APP.DEFAULT_UI.dims = true; APP.DEFAULT_UI.zoom = 0; APP.DEFAULT_UI.pan = 0; APP.DEFAULT_UI.sel = null; APP.DEFAULT_UI.cutZ = null;
  APP.ui.f = Object.assign({}, APP.DEFAULT_UI.f, APP.ui.f || {});
  APP.ui.dims = APP.ui.dims !== false; APP.ui.zoom = APP.ui.zoom || 0; APP.ui.pan = APP.ui.pan || 0;   // zoom 0 = automatic

  function filtered() {
    const f = APP.ui.f, q = f.q.trim().toLowerCase(), min = parseFloat(String(f.min).replace(",", ".")), max = parseFloat(String(f.max).replace(",", "."));
    return APP.CATALOG.filter(w => {
      if (f.cls && w.cls !== f.cls) return false;
      if (f.maker && w.maker !== f.maker) return false;
      if (f.ops && !w.ops.length) return false;
      if (f.fav && !APP.D.favs.includes(w.id)) return false;
      if (!isNaN(min) && w.b < min) return false;
      if (!isNaN(max) && w.b > max) return false;
      if (q && !(w.id + " " + w.maker + " " + w.aufbau + " " + w.ops.map(o => o.typ).join(" ")).toLowerCase().includes(q)) return false;
      return true;
    });
  }
  function current() { return APP.CATALOG.find(w => w.row === APP.ui.sel) || filtered()[0] || APP.CATALOG[0]; }

  /* ---------- Katalog ---------- */
  APP.views = {};
  APP.views.katalog = function () {
    const st = $("#stage"), f = APP.ui.f;
    const makers = [...new Set(APP.CATALOG.map(w => w.maker))].sort();
    st.innerHTML =
      '<div class="layout">' +
      '<aside class="side"><div class="filters">' +
      '<input id="fq" type="text" placeholder="Suche: Name, Hersteller, DKF…" value="' + esc(f.q) + '">' +
      '<div class="frow"><select id="fcls"><option value="">Alle Wände</option><option value="aw">Außenwände</option><option value="iw">Innenwände</option></select>' +
      '<select id="fmk"><option value="">Alle Hersteller</option>' + makers.map(m => '<option>' + esc(m) + '</option>').join("") + '</select></div>' +
      '<div class="frow"><label>Breite von <input id="fmin" type="text" inputmode="decimal" value="' + esc(f.min) + '"></label><label>bis <input id="fmax" type="text" inputmode="decimal" value="' + esc(f.max) + '"></label> cm</div>' +
      '<div class="frow"><label><input type="checkbox" id="fops"' + (f.ops ? " checked" : "") + '> nur mit Öffnungen</label><label><input type="checkbox" id="ffav"' + (f.fav ? " checked" : "") + '> ★ Favoriten</label></div>' +
      '<div class="count" id="fcount"></div></div><div id="list" class="list" tabindex="0"></div></aside>' +
      '<section class="main" id="main"></section>' +
      '<aside class="params" id="params"></aside></div>';
    $("#fcls").value = f.cls; $("#fmk").value = f.maker;
    const refilter = () => { renderList(); };
    $("#fq").addEventListener("input", e => { f.q = e.target.value; APP.saveUI(); refilter(); });
    $("#fcls").addEventListener("change", e => { f.cls = e.target.value; APP.saveUI(); refilter(); });
    $("#fmk").addEventListener("change", e => { f.maker = e.target.value; APP.saveUI(); refilter(); });
    $("#fmin").addEventListener("input", e => { f.min = e.target.value; APP.saveUI(); refilter(); });
    $("#fmax").addEventListener("input", e => { f.max = e.target.value; APP.saveUI(); refilter(); });
    $("#fops").addEventListener("change", e => { f.ops = e.target.checked; APP.saveUI(); refilter(); });
    $("#ffav").addEventListener("change", e => { f.fav = e.target.checked; APP.saveUI(); refilter(); });
    $("#list").addEventListener("keydown", e => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault(); const l = filtered(), i = l.findIndex(w => w.row === APP.ui.sel), n = l[Math.max(0, Math.min(l.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))];
      if (n) select(n.row, true);
    });
    renderList(); renderWall();
  };

  function renderList() {
    const l = filtered(), box = $("#list"); if (!box) return;
    $("#fcount").textContent = l.length + " von " + APP.CATALOG.length + " Wänden";
    box.innerHTML = l.map(w =>
      '<button class="item' + (w.row === APP.ui.sel ? " on" : "") + '" data-row="' + w.row + '">' +
      '<span class="nm">' + (APP.D.favs.includes(w.id) ? "★ " : "") + esc(w.id) + '</span>' +
      '<span class="sub">' + esc(w.maker) + " · " + num(w.b) + " × " + num(w.h) + (w.ops.length ? " · " + w.ops.map(o => esc(o.typ)).join(", ") : "") + '</span></button>').join("") ||
      '<p class="muted pad">Keine Wand passt zu den Filtern.</p>';
    $$(".item", box).forEach(b => b.addEventListener("click", () => select(+b.dataset.row)));
  }
  function select(row, scroll) {
    APP.ui.sel = row; APP.ui.cutZ = null; APP.saveUI();
    $$(".item").forEach(b => b.classList.toggle("on", +b.dataset.row === row));
    if (scroll) { const b = $('.item[data-row="' + row + '"]'); if (b) b.scrollIntoView({ block: "nearest" }); }
    renderWall();
  }

  function autoCut(R) { const o = R.ops[0]; return Math.round(o ? Math.min(R.H - 1, Math.max(1, (o.z0 + o.z1) / 2)) : R.H / 2); }

  function renderWall() {
    const w = current(), main = $("#main"); if (!main) return;
    APP.ui.sel = w.row;
    const R = APP.G.resolve(w), z = APP.ui.cutZ != null ? Math.min(R.H, APP.ui.cutZ) : autoCut(R);
    main.innerHTML =
      '<div class="head"><div><h2>' + esc(w.id) + '</h2><div class="muted">' + esc(CLS[w.cls] || w.cls) + " · " + esc(w.maker) + " · " + num(w.year) +
      (w.plan ? " · Plan " + esc(w.plan) : "") + '</div></div><span class="grow"></span>' +
      '<button id="bFav" class="' + (APP.D.favs.includes(w.id) ? "on" : "") + '" title="Favorit">' + (APP.D.favs.includes(w.id) ? "★" : "☆") + '</button></div>' +
      '<div class="card viewcard"><div class="vt"><b>Ansicht</b> <span class="muted">Rahmen sichtbar, ohne Beplankung</span></div><div id="elev"></div></div>' +
      '<div class="card viewcard"><div class="vt"><b>Schnitt (Draufsicht)</b> <span class="muted">in Höhe z = <span id="zv"></span> cm</span><span class="grow"></span>' +
      '<label class="inl">Höhe <input id="cutz" type="range" min="1" max="' + Math.max(2, Math.round(R.H - 1)) + '" step="1" value="' + z + '"></label>' +
      '<label class="inl">Zoom <select id="zm"><option value="0">auto</option>' + [1, 2, 4, 8].map(k => '<option value="' + k + '"' + (k === APP.ui.zoom ? " selected" : "") + '>' + k + '×</option>').join("") + '</select></label>' +
      '<label class="inl" id="panl">Ausschnitt <input id="pan" type="range" min="0" max="100" step="1" value="' + Math.round(APP.ui.pan * 100) + '"></label>' +
      '<label class="inl"><input type="checkbox" id="dimchk"' + (APP.ui.dims ? " checked" : "") + '> Maße</label></div><div id="plan"></div></div>' +
      '<p class="muted foot">Gelb schraffiert = Dämmung, braun = Holz (Riegel, Pfosten), grau = Beplankung. Aus dem Katalog nicht angegebene Werte sind ergänzt und rechts mit ⚑ markiert.</p>';
    const draw = () => {
      const zz = +$("#cutz").value; APP.ui.cutZ = zz; $("#zv").textContent = zz;
      $("#elev").innerHTML = APP.Draw.elevation(R, { dims: APP.ui.dims, cutZ: zz });
      const zm = APP.ui.zoom || Math.max(1, Math.min(8, Math.round(R.L / 250)));
      $("#panl").style.display = zm > 1 ? "" : "none";
      $("#plan").innerHTML = APP.Draw.plan(R, { dims: APP.ui.dims, cutZ: zz, zoom: zm, pan: APP.ui.pan });
    };
    $("#cutz").addEventListener("input", draw);
    $("#zm").addEventListener("change", e => { APP.ui.zoom = +e.target.value; APP.saveUI(); draw(); });
    $("#pan").addEventListener("input", e => { APP.ui.pan = +e.target.value / 100; APP.saveUI(); draw(); });
    $("#dimchk").addEventListener("change", e => { APP.ui.dims = e.target.checked; APP.saveUI(); draw(); });
    $("#bFav").addEventListener("click", () => {
      const i = APP.D.favs.indexOf(w.id); if (i >= 0) APP.D.favs.splice(i, 1); else APP.D.favs.push(w.id);
      APP.save(); renderList(); renderWall();
    });
    draw(); renderParams(w, R);
  }

  /* ---------- parameter panel ---------- */
  function renderParams(w, R) {
    const flag = key => { const d = R.derived.find(x => x.key === key); return d ? ' <span class="flag" title="' + esc(d.why) + '">⚑</span>' : ""; };
    const row = (k, v, unit, hint, key) => '<div class="pr"><span class="pk">' + k + '</span><span class="pv">' + (v == null || v === "" ? "<i>–</i>" : esc(v) + (unit ? " " + unit : "")) + (hint ? ' <span class="muted">' + esc(hint) + "</span>" : "") + (key ? flag(key) : "") + "</span></div>";
    const sec = (t, body) => "<details open><summary>" + t + "</summary>" + body + "</details>";
    const nPosts = new Set(R.members.filter(m => m.kind === "post").map(m => Math.round(m.x0 * 10))).size;

    let h = "";
    if (R.warn.length) h += '<div class="warnbox"><b>Hinweise zu den Katalogdaten</b><ul>' + R.warn.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul></div>";
    h += sec("Allgemein",
      row("Bauteilklasse", CLS[w.cls] || w.cls) + row("Hersteller", w.maker) + row("Baujahr", num(w.year)) + row("Plan Nr.", w.plan) + row("Zulassung", w.approval) +
      row("Qualität", w.q, "", "1 = beste") + row("Sonderform", w.special === "J" ? "ja" : "nein") + row("Aufbau-Code", w.aufbau) + row("Dataholz", w.dataholz) +
      (w.desc ? row("Beschreibung", w.desc) : ""));
    h += sec("Abmessungen",
      row("b Länge", num(w.b), "cm") + row("h Höhe", num(w.h), "cm") + row("dges Dicke gesamt", num(w.dges), "cm") + row("dR ges Rohbau", num(w.dRges), "cm"));
    h += sec("Aufbau (außen → innen)", APP.Draw.layers(R).map(l => row(l.name, num(l.t), "cm")).join(""));
    h += sec("Konstruktion",
      row("bp Pfostenbreite", num(R.bp), "cm", "", "bp") + row("dp Pfostentiefe", num(R.dp), "cm", "", "dp") +
      row("ap Pfostenabstand (Achse)", num(R.ap), "cm", "", "ap") +
      row("hOG oberer Riegel", num(R.hOG), "cm", "", "hOG") + row("hUG unterer Riegel", num(R.hUG), "cm", "", "hUG") +
      row("Pfosten im Raster", nPosts, "Stk", "ohne End- und Leibungspfosten") +
      row("Sturz-/Brüstungsriegel", num(R.lintelT), "cm", "Annahme = hUG ⚑") +
      (R.merged ? row("Leibungspfosten verbreitert", R.merged, "×", "Lücke < " + num(R.minGap) + " cm zum Nachbarpfosten geschlossen") : ""));
    h += sec("Kennwerte",
      row("U-Wert", w.U, "W/m²K") + row("Masse", w.m, "kg/m²") + row("Brandschutz", w.REI) + row("Schallschutz RW ≥", w.RW, "dB") + row("Tragl.", w.load, "kN/m"));
    h += sec("Bauteilanschluss",
      row("Links", (w.L.typ || "–") + (w.L.b != null ? " · bPl " + num(w.L.b) + " cm" : "") + " · α " + num(w.L.a) + "°") +
      row("Rechts", (w.R.typ || "–") + (w.R.b != null ? " · bPr " + num(w.R.b) + " cm" : "") + " · α " + num(w.R.a) + "°") +
      row("Oben", (w.O.typ || "–") + " · hOG " + num(w.O.h) + " cm") + row("Unten", (w.Un.typ || "–") + " · hUG " + num(w.Un.h) + " cm"));
    h += sec("Öffnungen (" + w.ops.length + ")", w.ops.length ? w.ops.map(o => {
      const p = R.ops.find(q => q.n === o.n);
      return '<div class="op"><b>A' + o.n + " · " + esc(o.typ) + '</b> <span class="muted">' + esc(TYP[o.typ] || "") + "</span>" +
        row("Teilung", o.teilung) + row("Material", o.mat) + row("bA Achse", num(o.bA), "cm", "von linkem Wandende") + row("hP Brüstung", num(o.hP), "cm") + row("hST Sturz", num(o.hST), "cm") +
        row("AL", o.AL ? num(o.AL.b) + " × " + num(o.AL.h) : null, "cm") + row("DL", o.DL ? num(o.DL.b) + " × " + num(o.DL.h) : null, "cm") + row("RBL", o.RBL ? num(o.RBL.b) + " × " + num(o.RBL.h) : null, "cm") +
        row("Uw", o.uw, "W/m²K") + (o.note ? row("Anmerkung", o.note) : "") +
        (p && p.d.length ? '<div class="muted">⚑ ergänzt: ' + esc(p.d.join("; ")) + "</div>" : "") + "</div>";
    }).join("") : '<p class="muted">Keine Öffnungen.</p>');
    h += sec("Notiz", '<textarea id="note" rows="3" placeholder="Eigene Notiz zu dieser Wand…">' + esc(APP.D.notes[w.id] || "") + "</textarea>");
    $("#params").innerHTML = h;
    $("#note").addEventListener("input", e => { if (e.target.value) APP.D.notes[w.id] = e.target.value; else delete APP.D.notes[w.id]; APP.saveSoon(); });
  }

  /* ---------- Legende ---------- */
  APP.views.legende = function () {
    const tbl = (o, t) => '<table class="leg"><caption>' + t + "</caption>" + Object.keys(o).map(k => "<tr><td><code>" + esc(k) + "</code></td><td>" + esc(o[k]) + "</td></tr>").join("") + "</table>";
    $("#stage").innerHTML = '<div class="legwrap">' +
      '<div class="card"><h2>Woher die Daten kommen</h2><p>Katalog: <b>Reuse Woodhouse – Bauteilkatalog Wände</b> (' + APP.CATALOG_INFO.count + ' Wände, Datei ' + esc(APP.CATALOG_INFO.source) + ', Export am ' + esc(APP.CATALOG_INFO.exported) + '). ' +
      'Die Zeichnung ist eine Darstellung der Katalogwerte, kein Werkplan. Fehlende Werte werden mit ⚑ ergänzt, Widersprüche in den Daten stehen als Hinweis.</p>' +
      '<p>Lesart der Maße: <code>bA</code> = Achse der Öffnung, vom linken Wandende; <code>hP</code> = Brüstungshöhe; <code>hST</code> = Wandoberkante bis Öffnungsoberkante (enthält den oberen Riegel <code>hOG</code>, den Sturzriegel und die Dämmung dazwischen); ' +
      '<code>RBL</code> = Rohbaulichte, <code>DL</code> = Türlichte, <code>AL</code> = Architekturlichte. Sturz- und Brüstungsriegel sind nicht im Katalog; sie sind so dick wie der untere Riegel angenommen.</p></div>' +
      '<div class="cols">' + tbl(CLS, "Bauteilklasse") + tbl(TYP, "Öffnungstyp") + tbl(BEP, "Beplankung") + tbl(KA, "Konstr. außen/oben") + tbl(KI, "Konstr. innen/unten") + tbl(FAS, "Fassade") +
      tbl({ E1: "Eckausbildung 1 (Detail im PDF)", E2: "Eckausbildung 2", O1: "Abschluss oben 1", O2: "Abschluss oben 2", U1: "Abschluss unten 1", U2: "Abschluss unten 2" }, "Anschlüsse") + "</div></div>";
  };

  APP.render = function () {
    $$(".tab").forEach(t => t.classList.toggle("on", t.dataset.view === APP.ui.view));
    (APP.views[APP.ui.view] || APP.views.katalog)();
  };
  APP.setView = function (v) { APP.ui.view = v; APP.saveUI(); APP.render(); };

  /* top-bar pill that shows where the data is saved */
  APP.onFileState = function () {
    const b = $("#btnFile"), F = APP.file; if (!b) return;
    const map = {
      local: ["Gespeichert im Browser", ""], none: ["Gespeichert im Browser · Ordner wählen", "warn"],
      ok: ["Gespeichert in " + F.name + "/", ""], saving: ["Speichert…", ""],
      needs: ["Klicken zum Verbinden: " + F.name + "/", "warn"], error: ["Fehler beim Speichern: " + (F.msg || "error"), "err"]
    };
    const m = map[F.state] || map.local; b.textContent = m[0]; b.className = "pill " + m[1];
    const info = $("#fileInfo"); if (info) info.textContent = F.dir ? "Favoriten und Notizen werden in " + F.name + "/Holzrahmen.hrm gespeichert." : "Favoriten und Notizen liegen bisher nur in diesem Browser. Mit einem Ordner (z. B. in Google Drive) landen sie in einer Datei, die du sichern und am anderen PC nutzen kannst. Der Katalog selbst ist in der App eingebaut.";
  };

  APP.start = function () {
    $$(".tab").forEach(t => t.addEventListener("click", () => APP.setView(t.dataset.view)));
    const dlg = $("#dlgFile");
    $("#btnFile").addEventListener("click", () => { APP.onFileState(); if (APP.file.state === "needs") APP.reconnect(); else dlg.showModal(); });
    $("#btnChoose").addEventListener("click", async () => { await APP.chooseFolder(); dlg.close(); });
    $("#btnReconnect").addEventListener("click", async () => { await APP.reconnect(); dlg.close(); });
    $("#btnBackup").addEventListener("click", APP.downloadBackup);
    $("#fileRestore").addEventListener("change", e => { if (e.target.files[0]) APP.restoreFrom(e.target.files[0]); e.target.value = ""; dlg.close(); });
    $("#btnUnlink").addEventListener("click", async () => { await APP.unlinkFolder(); dlg.close(); });
    $("#btnCloseFile").addEventListener("click", () => dlg.close());
    document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); APP.save(); APP.writeFileNow(); } });
    if (APP.ui.view !== "legende") APP.ui.view = "katalog";
    APP.render();
  };
})(window.APP);
