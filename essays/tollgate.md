---
number: V
title: The commit point
subtitle: An LLM gateway in Go, built the way payment systems are.
project: Tollgate
status: In progress
---

# The commit point

*An LLM gateway in Go, built the way payment systems are.*

Tollgate sits between applications and the companies that serve language models. An application points any OpenAI client library at Tollgate instead of at OpenAI. When it is finished, Tollgate will check the caller’s key, enforce its rate limits and its spending budget, send the request to a provider with retries and fallback, stream the answer back, and record what it cost.

As a project it has two jobs. One is production-grade Go: concurrency, streaming, cancellation and shutdown, done properly. The other is to bring the reliability patterns of payment systems to model traffic: idempotency keys, holds that settle, and a reconciliation check. It isn’t trying to compete with the gateways that already exist. Correctness, tests and measured performance come before features, and every decision that isn’t obvious is written down, with the alternatives it beat.

It is a work in progress. Three milestones are done: the server and its configuration, chat completions through a mock provider, and streaming. The money is designed but not yet built. This essay is about the streaming, which is the core of the Go work, and about the design for the money.

## The point of no return

A streamed response is a promise made one piece at a time. Before the first piece reaches the client, a failure is cheap: the gateway can retry, or fall back to another provider, and the client never knows. Once the client holds half an answer, starting over with another model would splice two different answers together.

So the rule is to write nothing until the commit point: the first chunk that carries content or a finish reason, or the end of the stream. Until then, nothing reaches the client, and a failure becomes an ordinary error response. After it, there is no retry and no fallback.

The obvious place to commit is the first chunk of any kind, and it is wrong. OpenAI’s first chunk is an empty one that only names the role. Committing on it would mean promising an answer before knowing the provider can produce one, and losing the chance to fall back.

If a stream fails after the commit point, the client gets one last event in OpenAI’s error format, and the stream ends without the usual `data: [DONE]`. Leaving that marker out matters, because a client that only waits for `[DONE]` would take a partial reply for a complete one. The official OpenAI Python library raises an error when it sees that last event, which was checked against a mock provider set up to fail mid-stream.

## Three clocks, and one bug

A stream needs separate timeouts: one for the first token, one for the gap between chunks, and an overall deadline. A single blanket timeout won’t do. It would either cut off long, healthy streams or wait far too long for a dead one.

Each stream has one watchdog timer. Until the commit point it enforces the first-token limit. Keep-alive pings don’t extend it, because they don’t show that the model is producing anything. At the commit point it is replaced by an idle timer, which every chunk resets. When a watchdog fires, it cancels the stream’s context with a cause, so the code above can say which limit was hit.

Resetting the existing timer at the commit point looks equivalent, and isn’t. In Go, resetting an `AfterFunc` timer reschedules the function it was created with, so every timeout, idle ones included, was reported as a first-token timeout. A test caught it.

## Slow clients and closed tabs

One loop per stream reads from the provider, translates, and writes to the client. That gives backpressure for free: if the client reads slowly, the write blocks, and the loop reads from the provider more slowly too. There is no goroutine per chunk and no unbounded buffer.

A client that stops reading altogether would block a write forever, and hold the provider’s stream open with it. So each event gets its own write deadline, set to the idle limit. The server deliberately has no overall write timeout, since that would cut off long streams, so the deadline also has to be cleared when the stream ends, or the next request on the same connection would inherit it.

When a client disconnects, the call to the provider is cancelled. A test holds that to 100 milliseconds.

On shutdown, Tollgate stops accepting connections and gives streams in flight a grace period to finish. Whatever is still running after that is cancelled with a “shutting down” cause, so each stream can tell its client why it ended, and the process exits with a failure status, because cutting requests off is not a clean exit. That test runs the real binary and sends it a real SIGTERM.

The timing tests run on a fake clock, using Go’s `testing/synctest` over an in-memory network, so the real HTTP server and client can be checked to the millisecond without real sleeps. Every package that starts goroutines is also checked for leaks.

## Money is an integer

The budget design comes from card payments. Before calling a provider, Tollgate will place a hold for the worst-case cost of the request, in the same database transaction that checks the budget. If the hold doesn’t fit, the request gets a 402 and the provider is never called. After the response, the hold is settled at the actual cost, or released if nothing was used. A background job releases holds that are too old, the way an unused card authorisation expires.

Money is a whole number of micro-dollars, with no floating point anywhere near prices, costs or budgets. Prices are parsed from decimal strings, and costs round up.

The worst case has to be a real upper bound, which rules out the usual estimate of four characters per token. In Chinese or Japanese one character is often a whole token or more, so a hold based on that estimate could be exceeded. Tollgate bounds the input by its size in bytes instead, because a byte-level tokenizer never produces more tokens than bytes. For English input, that holds about four times what it will cost, which only matters close to the end of a budget, the way a fuel pump authorises more than the fill. Settling always records the actual cost, even when it goes over the budget: the tokens were used, so they are owed.

The order of operations matters too. Writing the response first and recording the outcome second leaves a window: a crash in between, and a retry with the same idempotency key calls the provider again, so the request is paid for twice. For non-streaming requests, Tollgate will record the outcome first, at the cost of a few milliseconds before the client sees anything.

Four invariants are written down for the money, and the tests will assert all four. A `tollgate reconcile` command will check the stored totals against the holds behind them.

## What it’s teaching me

**Find the point of no return, and design around it.** Before the commit point, a failure can still be handled. After it, the only honest thing left is to say what went wrong.

**Each timeout is a different fact.** No first token, a stalled stream and an overall deadline fail for different reasons, and the error should say which.

**An estimate isn’t a bound.** Anything that guards money has to hold in every language, not just on average.

Next come the real providers: OpenAI-compatible and Anthropic adapters, with retries, fallback and a circuit breaker for each model. Then the keys and rate limits, and then the money, with a test that sends 200 requests at once against a budget that fits exactly some number of holds, and expects exactly that many to succeed.

---

*The code, the design brief and the decision records are at [github.com/ktripathi2281/Tollgate](https://github.com/ktripathi2281/Tollgate).*
