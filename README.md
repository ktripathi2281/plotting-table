# The Plotting Table

An endless table of prints. Drag in any direction and it never runs out: the sheets form one block that repeats forever, each row of blocks shifted sideways like bricks. Every sheet is a print on its own paper stock, with a small label stuck across its edge, and most of them are generated drawings: they plot themselves like a pen plotter the first time they come into view, then keep a little life going (packets travel routes, rings ping, a comet runs through a tangle).

It is the playful companion to the portfolio at [kauswhynot.vercel.app](https://kauswhynot.vercel.app/) and uses the same paper-and-ink tokens, the same three typefaces and the same single red line.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run it

```bash
python -m http.server 5180
```

Then open <http://localhost:5180>. Any static file server works. It also deploys as-is to Vercel (framework preset "Other", no build command).

## What is on the table

- **Plates 0 to IV**: Model, contained · Kavach · LeetCode Agent Tracker · Skill Barter · Ride Radar. Hover or tap any part of a drawing to read it.
- **Essays, credentials, a chronology, materials, a statement** and **Enquiries** (the red card).
- **Studies**: the same wandering line held by a square, a hexagon and nothing at all, and two rosettes turning against each other.
- **Show** filters, **Find** with synonyms, and an index of every sheet.
- **A harp** that plays as you travel and as you read the parts of a drawing. Off until you switch it on.
- **Day and Night.** The table opens in daylight. Every paper stock has a night version.

Click a sheet and its wall label opens beside it. Deep links work: `/#kavach`, `/#study-open`, `/#chronology`.

## Keys

| Key | Does |
| --- | --- |
| Arrows | Pan |
| `+` `-` `0` | Zoom in, out, back to the starting zoom |
| `1` | Back to the start |
| `/` | Find |
| `[` `]` | Previous, next sheet |
| `M` | Sound |
| `D` | Day / night |
| `I` | Index |
| `Esc` | Close, back |

Mouse: drag to pan, scroll to pan, Ctrl or ⌘ + scroll (or pinch) to zoom, click a sheet to open it. Touch: drag, pinch, tap.

## Files

| File | Holds |
| --- | --- |
| `data.js` | Every sheet: its size, row, paper stock and words. Edit this to change the content. A small packer lays the rows out. |
| `plates.js` | The generated drawings (ported from the portfolio's `src/art`) and their "life" layers, plus the timeline, studies, rosette and guilloché seal |
| `sheets.js` | Markup for each kind of sheet and for the wall label |
| `app.js` | Camera, the endless table, input, find, filters |
| `audio.js` | The harp |
| `styles.css` | Tokens, paper stocks, type, plotting treatment, layout |

### How the endless table works

`data.js` defines one block (`period.w` × `period.h`). `app.js` makes only the copies of sheets near the window and drops the ones that are far, so the page holds a few dozen sheets however far you travel. Copies out of sight stop animating, and at most sixteen near the middle of the view animate at once.

### Adding a sheet

Push an object onto `sheets` in `data.js`. Give it a `row` and `col` and a size; the packer places it.

```js
add({
  id: "my-thing", kind: "essay", group: "essay", short: "E·III", row: 3, col: 5, w: 560, h: 440, stock: "sage",
  no: "Essay III", title: "A title", kicker: "A subtitle",
  project: "Something", lead: "One striking sentence.", excerpt: "The first lines.", href: "https://…",
  keywords: "words people might search for"
});
```

Kinds: `title`, `plate`, `timeline`, `essay`, `statement`, `credential`, `specimen`, `gate`. Stocks: `cream`, `blush`, `sage`, `sky`, `butter`, `lilac`, `kraft`, `ink`, `red`. A new drawing needs a generator in `plates.js`, registered in `makers`.

## Embedding and tests

`window.table` exposes `open(id)`, `close()`, `home()`, `camera()` and `step(ms)`. `step` advances the camera by `ms` without waiting for animation frames, which makes navigation testable headlessly.

## Notes

The idea of exploring a body of work by wandering across a canvas, with a filter, a search and a little sound, comes from playful portfolio canvases. Everything here (the paper stocks, the stickers, the plotted and living drawings, the studies, the red line, the wall labels) is built from the portfolio's own visual language.
