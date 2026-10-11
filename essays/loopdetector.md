---
number: IV
title: The same failure, again
subtitle: Noticing when a coding agent is stuck, without asking another model.
project: Loop Detector
---

# The same failure, again

*Noticing when a coding agent is stuck, without asking another model.*

A coding agent edits a file, runs the tests and gets a failure. It edits the file again, runs the tests again, and gets the same failure. Each attempt looks reasonable on its own. Together they are a loop, and a loop can burn a lot of time and tokens before anyone notices.

Loop Detector is a mod for Claude Code that notices. It watches the tool calls Claude makes and what they return, and keeps a running score of how loop-like the recent work looks. A light in the status line shows it at all times: normal, suspicious, possible loop. When the score gets high enough, a small card appears above the prompt, with what keeps repeating, the cycle it’s in, and four buttons.

Two rules shaped it from the start. Detection is deterministic: plain heuristics, no model calls and no network, so nothing leaves the machine and the same history always gets the same verdict. And nothing it does stops Claude on its own. Every intervention is a button you press.

## What counts as the same

Most of the work is deciding when two things are the same. Every tool call becomes a small record: what kind of action it was, what it acted on, whether it failed, a fingerprint of the failure, and a fingerprint of the output.

Commands are compared by what they actually run. `cd app && npm test 2>&1 | tail -n 20` does the same work as `npm test`, so the change of directory, the redirection and the `tail` are stripped before comparing. Failures are compared after blanking out whatever differs between two identical runs: timings, clock times, line and column numbers, ids. Without that, every run of a failing test would look new, because its duration changed.

Test output is parsed for six runners: Jest, Vitest, pytest, Go, mocha and cargo. The failure markers count even when the command reported success. A test run piped through `tail` exits with `tail`’s status, so a run that printed “2 failed” can still exit with zero, and it is still a failure.

## Repetition is not a loop

The obvious design counts repeats, and it is wrong. Writing code means editing the same file many times. Test-driven work means running the same command over and over. Both are repetition, and both are progress.

So the score multiplies three things: how much is repeating, whether the results are repeating too, and whether anything has visibly improved.

```
score = 100 × repetition × (0.25 + 0.75 × stagnation) × progress decay
stagnation = 0.55 × same result + 0.45 × no progress
```

Repetition on its own tops out at 25, well inside the normal band. Only repetition with the same result and no visible progress reaches 70 and above, where the card appears. The project’s reference points show the difference. Editing `auth.ts`, running `npm test` and seeing the same two tests fail, three times over, scores 86. The same history where the third run passes scores 0. Edit, test and a new error each time, which is what test-driven work looks like, scores 10. Seven edits to one file with no runs in between, which is simply writing code, scores 20.

Seven signals feed the score, each from 0 to 100: repeated actions, repeated commands, repeated edits to one file, repeated errors, the same tests failing the same way, edit-test-failure cycles, and how long it has been since anything improved. The subtlest is the cycle. It catches attempts at the same check that end in a failure already seen, within a small set of files, even when every edit is different. It is the approach that goes round, not the exact tool call.

## What counts as progress

Progress lowers the score, and some progress counts for more than other progress. A failing command that now passes, or a task marked done, wipes the slate clean: the stretch of work being scored ends there. Weaker signs discount the score while they are recent: some failing tests now passing, editing a different part of the code, a new error, more tests passing.

One rule is worth spelling out: flipping back to an error seen before is not progress. An agent alternating between two failures changes its output every time, and it is still stuck.

The score is a heuristic for ranking how loop-like the recent history looks. It is not a probability, and the project says plainly that it hasn’t been validated as one.

## One warning per loop

A detector that warns on every tool call is soon ignored. So every loop has an identity: its own key, and a family it shares with related readings, such as the same failure or the same files. A loop warns once. It warns again only when it gets meaningfully worse: its band rises, its repetitions double, or it disappears for fifteen tool calls and comes back. Pressing Continue hides the card, and the same loop stays quiet unless one of those things happens.

## A nudge, not a takeover

Rethink is the intervention. It writes Claude a short summary of the loop: the approach and how many times it has been tried, the repeated failure, the files it keeps changing, and a request to stop, reconsider the underlying assumption, and propose a different approach before changing anything else.

What happens next is a setting. By default, the summary is only placed in your prompt box: Claude keeps working, and nothing is sent until you press Enter. The other two settings end Claude’s current turn, then either ask you to confirm or send the summary at once. The default is the cautious one because nothing reaches Claude without you.

When the summary is sent, Claude reads it framed as a message from the Loop Detector plugin, and it appears in the transcript. Nothing is hidden, and nothing is attributed to you. The mod API could also slip a hidden note into the turn already running. Rethink doesn’t use it, because a note wouldn’t stop the step the loop is on.

## What it taught me

**Define “the same” before you count anything.** Most of the code is normalisation: stripping what never changes the work, and blanking what changes every time.

**Measure the result, not just the action.** Repeating an action is how work gets done. Repeating it, getting the same result, and improving nothing is the loop.

**Leave the decision with the person.** A detector that interrupts on its own has to be right every time. One that shows its reasons and offers buttons only has to be useful.

The README lists its limits. The mod API it is built on is early access, and may change. Subagents’ tool calls aren’t tracked yet. Failures are read from text output with regular expressions, and long outputs may already be cut short. Only Claude’s own edit tools count as edits, so a file rewritten with `sed -i` isn’t seen as one. And the history lasts for one session.

---

*The code, the scoring and the tests are at [github.com/ktripathi2281/LoopDetector](https://github.com/ktripathi2281/LoopDetector).*
