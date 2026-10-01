# The Plotting Table

Selected works laid out on a drafting table. You pan and zoom across one bounded sheet of graph paper, and each project is a numbered plate: a drawing generated in code that encodes how the system works, mounted beside a museum-style wall label. The drawings plot themselves like a pen plotter the first time they come into view.

It is the playful companion to the portfolio at [kauswhynot.vercel.app](https://kauswhynot.vercel.app/) and uses the same paper-and-ink tokens, the same three typefaces and the same single red line.

Plain HTML, CSS and JavaScript. No build step, no dependencies.

## Run it

```bash
python -m http.server 5180
```

Then open <http://localhost:5180>. Any static file server works. It also deploys as-is to Vercel (framework preset "Other", no build command).

## What is on the table

- **Plates 0 to IV**: Model, contained · Kavach · LeetCode Agent Tracker · Skill Barter · Ride Radar. Hover or tap any part of a drawing to read it.
- **Essays, credentials, chronology, materials, statement** as their own sheets, and **Enquiries** outside the sheet.
- **The red line** threads the plates in reading order and leaves through a gate in the sheet's border. It is the only way out of the drawing.
- **Key plan** (minimap), **rulers** that follow your pointer, **Show** filters, **Find** with synonyms, and a **catalogue** drawer.
- **Pen**: draw your own red line anywhere. It is kept in `localStorage`.
- **Harp**: a soft pentatonic harp that plays as you travel, and when you read parts of a drawing. Off until you switch it on.
- **Day / Night**, following the portfolio's tokens. Respects `prefers-color-scheme` and `prefers-reduced-motion`.

Deep links work: `/#kavach`, `/#essay-leetcode`, `/#chronology`.

## Keys

| Key | Does |
| --- | --- |
| Arrows | Pan |
| `+` `-` `0` | Zoom in, out, fit the whole table |
| `1` | Back to the start |
| `/` | Find |
| `[` `]` | Previous, next sheet |
| `P` | Pen |
| `M` | Sound |
| `D` | Day / night |
| `I` | Index |
| `Esc` | Close, back |

Mouse: drag to pan, scroll to pan, Ctrl or ⌘ + scroll (or pinch) to zoom, click a sheet to open its wall label. Touch: drag, pinch, tap.

## Files

| File | Holds |
| --- | --- |
| `data.js` | Every sheet, where it sits on the 4000 × 2500 sheet, and what it says. Edit this to change the content. |
| `plates.js` | The generated drawings, ported from the portfolio's `src/art`, plus the timeline and the guilloché seal |
| `sheets.js` | Markup for each kind of sheet and for the wall label |
| `app.js` | Camera, bounds, input, rulers, find, key plan, pen |
| `audio.js` | The harp |
| `styles.css` | Tokens, type, plotting treatment, layout |

### Adding a sheet

Push an object onto `sheets` in `data.js`. Positions are in world units (one grid square is 100).

```js
add({
  id: "my-thing", kind: "essay", group: "essay", short: "E·III",
  no: "Essay III", title: "A title", kicker: "A subtitle",
  project: "Something", excerpt: "The first lines.", href: "https://…",
  x: 700, y: 1900, w: 560, h: 380,
  keywords: "words people might search for"
});
```

Kinds: `title`, `plate`, `timeline`, `essay`, `statement`, `credential`, `specimen`, `gate`. A new plate needs a drawing: add a generator to `plates.js` and register it in `makers`. To add it to the red line, append to `route`.

## Embedding and tests

`window.table` exposes `open(id)`, `close()`, `home()`, `fit()`, `camera()` and `step(ms)`. `step` advances the camera by `ms` without waiting for animation frames, which makes the navigation testable headlessly.

## Notes

The idea of exploring a body of work by wandering across a canvas, with a filter, a search and a little sound, comes from playful portfolio canvases. Everything here (the drafting-table metaphor, the bounded sheet, the plotted drawings, the red line and the gate, the wall labels, the pen) is built from the portfolio's own visual language.
