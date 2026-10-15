# Holzrahmen

Viewer for the **Reuse Woodhouse** timber-frame wall catalogue (210 walls): front elevation (Riegel, Pfosten, Dämmung, openings) and plan section at a chosen height, with the catalogue parameters shown. Plain HTML/CSS/JS, no build step. Part of Doruk's PWA family (Phoenix, LabGorilla, Hedgehog, Taupunkt).

## Run locally
`python -m http.server 8141` in this folder, open http://localhost:8141 (use a fresh port after edits, the browser caches JS hard).

## Files
| File | What |
|---|---|
| `index.html`, `style.css`, `manifest.webmanifest`, `sw.js`, `icons/` | App shell (placeholder icons) |
| `js/util.js`, `js/store.js`, `js/init.js` | Starter: helpers, saving (favourites + notes only), start-up |
| `js/catalog.js` | **Generated** from the Excel by `tools/export_waende.py`. Do not edit by hand. |
| `js/geom.js` | Catalogue row -> rectangles (Riegel, posts, king posts, lintel, sill, openings). Defaults and warnings live here. |
| `js/draw.js` | SVG for elevation and plan section, dimension lines |
| `js/app.js` | Screens: Katalog (list, filters, views, parameter panel), Legende |
| `tools/export_waende.py` | `python tools/export_waende.py "<...ReuseWoodhouse.xlsx>"` rewrites `js/catalog.js` |

Every new JS file goes into index.html, the SHELL list in sw.js and this table.

## Reading the catalogue (decided with Doruk)
- `bA` = **axis** of the opening from the left wall end. `hP` = parapet height. `hST` = top of wall down to top of opening, containing the top Riegel `hOG`, the lintel Riegel and insulation between.
- Lintel / sill Riegel are not in the Excel: assumed as thick as `hUG`.
- Missing values are filled with defaults and marked with a flag in the panel; contradictions in the catalogue become warnings.

## Data
Catalogue is bundled in the app. Only favourites and notes are user data (`Holzrahmen.hrm` in a folder the user picks, plus browser storage).
