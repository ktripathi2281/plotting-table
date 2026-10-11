# Kaustubh Tripathi · terminal edition

A portfolio set out as a developer's own terminal. It opens on an editor that types out real code from three of
my repositories (Tollgate, DeepResearch and Loop Detector) until you press Enter. Then every section is a command:
`whoami`, `fetch`, `ls -l ~/projects`, `cat experience.log`, `cat stack.toml`, `ls ~/writing` and `mail`.

- **Commands:** `:` opens a command line that lists the site's own commands. It's vim, sort of: the rest is
  left for you to find.
- **Live:** `git log --recent` reads the latest commit in each of my most recently pushed repositories from
  GitHub's public API, cached for half an hour. The page ships with a snapshot, used when the API is unavailable.
- **Portrait:** a photograph traced into flat comic tones and ink lines, then set in braille, whose 2×4 dots per
  character make an even grid in Noto Sans Symbols 2.
- **Essays:** one per project, in [`essays/`](essays/), read in a vim-style buffer over the page. Essay links and
  `:read` open one; `:q` brings you back.
- **Mail:** sent through Web3Forms with a public access key, with the visitor's own mail app as the fallback.
- **Themes:** amber (default), paper, phosphor and daylight; `:theme` cycles, and the choice is kept.

Plain HTML, CSS and JavaScript modules. No build step, no dependencies.

```bash
python -m http.server 5192   # or any static server, then open http://localhost:5192
```

The plotting table that used to live on this branch's `main` is tagged `plotting-table-v1`.
