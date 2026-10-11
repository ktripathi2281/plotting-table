---
number: I
title: Confidently wrong
subtitle: Building an AI assistant a fraud victim can rely on at 2 a.m.
project: Kavach
with: Ashutosh Kumar
---

# Confidently wrong

*Building an AI assistant a fraud victim can rely on at 2 a.m.*

Kavach started as a better cybercrime complaint form, and we threw that version away. Filing the complaint turned out to be about one percent of the job.

A person in India who has just lost money to a scam faces a sequence of separate actions, several of them on legal clocks, and nobody hands them the list. Call 1930. File on the national portal. Notify your bank in writing, because one RBI route depends on reporting within three working days. Ask the police for an FIR where the facts require one, since a portal complaint is not an FIR. Wait for provisional credit, then a liability decision, then escalate to the RBI Ombudsman if the bank’s reply falls short. Each step has its own office, its own form and its own deadline, and the person doing all of it is frightened, possibly not reading in English, and may be on a slow phone.

So Kavach became a case file instead. You describe what happened in your own language, by voice or text, with no login. It builds an ordered list of ten action tracks, puts clocks only on the deadlines that the law actually sets, and drafts the letters.

Language models are very good at the hard middle of that: reading a panicked, mixed Hindi-English account and turning it into something structured. They are also the one component in the system that can be fluently, confidently wrong. Most of what we built is about that second fact.

## Structure or nothing

Every model call in Kavach goes through one thin client written against the OpenAI HTTP API rather than an SDK, so the same code runs against any OpenAI-compatible endpoint. Every call requests a strict JSON schema. The response either matches our TypeScript types exactly or we treat it as no answer at all. There is no code that tries to rescue half-formed JSON.

No answer is a normal outcome, not an error. If there is no API key, the call fails, it times out, or the provider rate-limits us, the client returns `null`, and every route has a deterministic rules engine behind it: keyword classification, regular-expression extraction, and document templates filled from the case file. The interface says “demo mode” when this happens instead of implying a model ran. Someone who has just been defrauded should never see an error screen.

The provider-agnostic client paid for itself in an unexpected way. When we pointed it at Google’s OpenAI-compatible endpoint, chat worked but voice silently didn’t: that layer does not implement the transcription endpoint, so recordings failed everywhere except desktop Chrome, which has its own speech recognition. The fix was a small branch that asks Gemini to transcribe through its native API. The lesson was that “compatible” describes a set of endpoints, not a guarantee.

## Regex first, the model second

A UPI transaction reference (UTR) is a twelve-digit number. A regular expression finds it correctly every time; a language model occasionally does not. What the model can do, and regex cannot, is understand “he took eighty-five thousand from me”, or decide whether an account number belongs to the fraudster or the victim. So Kavach runs both, independently, and merges the results. Every extracted value is shown to the citizen to confirm.

Money was harder than it looks. Two bugs from real sentences:

- **“10,000 ka fraud hua”**, which is about the most natural way to say “I lost ten thousand” in romanised Hindi. The amount pattern allowed `k` as shorthand for thousand, and it matched the first letter of *ka* (“of”). The case file recorded one crore. The fix was to make scale words match only as whole words, longest first.
- **“10,000 lekar 30,000 diya jayega”**, meaning “give ten thousand, get thirty thousand back”: the classic shape of an investment or task scam. The extractor took the largest figure, which put the fraudster’s promise into the victim’s case file as their loss. Now a figure beside a word about losing (“lost”, “sent”, “gaya”, “bheje”) beats a figure beside a word about gaining (“return”, “double”, “milega”). Where the words still leave two candidates, the summary asks the citizen which one it was, rather than guessing.

## The one fact the model may never flip

Some facts matter more than others. For a bank complaint, the most consequential is who initiated the payment: whether the victim approved a transfer they were tricked into, or money left without their authorisation. The two are treated differently under RBI rules, and a letter that states the wrong one can undermine the person it was written for.

The citizen answers that question directly. After the model drafts the documents, a small guard checks the drafts against the answer: if a victim-approved transfer has become “I did not authorise this payment”, or the reverse, the entire bundle is rejected and replaced with deterministic, answer-backed templates. We don’t try to patch legal prose sentence by sentence. It is a narrow guard for one fact, not a legal review, and the project documents it that way.

The prompts carry the same principle. Anything missing stays a `[square-bracketed placeholder]`, because a fabricated UTR in a police application is worse than a blank one. And no output may repeat an Aadhaar number, PAN, PIN, password or OTP, even when the citizen typed one.

## The fallback is the product at the worst moment

The rules engine runs exactly when things are going badly: the provider is down, the key is missing, or traffic has spiked. So when we built an evaluation harness, the first thing we scored was the fallback, not the model.

It was twenty hand-built complaints across six of the national portal’s categories. Twenty cases can tell you something got worse; they cannot tell you a classifier is good. Even so, the first run was humbling. The fallback scored **58%** balanced accuracy, with **zero recall on crimes against women and children**. One case, a fourteen-year-old being groomed through a game, was filed as “other”. Worse, the intake flow read that guess as the child-age question having been *answered*, so it stopped asking, and the child helpline, 1098, was never offered.

The fix was in two places: better category hints, and a rule that a guess can no longer close a safety question. The fallback now scores **92%**, with no confidently wrong answers, and because it is deterministic and needs no key, CI scores it on every pull request.

The live model (Gemini 3.5 Flash-Lite, through the same client) also scored 92%, with one confidently wrong answer: *“My WhatsApp got taken over after I forwarded a six digit code”* was filed under social media rather than hacking. That’s defensible in plain English but wrong against the portal’s category tree. We left the test set as it was rather than bend it until it agreed.

The first live run actually scored 69%, with four cases returning nothing, and that turned out not to be the model at all. The free tier allowed 15 requests a minute, and the harness sent twenty back to back. A third of the run measured HTTP 429. The same limit applies in production, where a failed call quietly falls through to the rules engine, marked only by `source: "rules"` in the response. The evaluation found an operations problem that accuracy numbers on their own would have hidden.

## What it taught me

**Design for the model being wrong, not for it being right.** Strict schemas, independent checks and a fallback worth running are not defensive extras. They are the reason anyone can trust the parts where the model is right.

**Evaluate the path that runs when everything else has failed.** Our worst bug lived in the fallback, and it only showed up because we measured it.

**Make degradation visible.** “Demo mode” on the screen and `source: "rules"` in the response are small things, but they are how a silent failure becomes a known one.

Kavach is still a prototype. It submits nothing to any authority, its translations are machine-made and labelled unreviewed, and one class, hacking, sits at 50% on a test set too small to trust. But its failures are the kind you can see coming.

---

*Kavach was built with Ashutosh Kumar for the Build What Moves India hackathon. The code, including the evaluation results quoted here, is at [github.com/ashusnapx/hackathon](https://github.com/ashusnapx/hackathon).*
