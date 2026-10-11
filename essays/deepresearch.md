---
number: III
title: Pointing is not proving
subtitle: A research system that checks its own citations, and says so when it can’t.
project: DeepResearch
---

# Pointing is not proving

*A research system that checks its own citations, and says so when it can’t.*

A citation in an AI answer looks like evidence. Usually it is only a pointer: the model put a number in square brackets after a sentence. Whether the passage behind that number says what the sentence says is a separate question, and it often goes unasked.

DeepResearch asks it. You put a question to a collection of documents. It finds the passages that matter, writes an answer from those passages only, numbers its citations, and checks every cited sentence against the passages it cites. Each answer also carries a verdict on itself: answered, not enough evidence, conflicting evidence, or no evidence at all.

It runs entirely on one machine, with no paid APIs: a four-billion-parameter model, Qwen3 4B, through Ollama; small local models for embedding and reranking; and PostgreSQL with pgvector. That constraint shaped most of what follows.

## Two searches that fail differently

Vector search finds passages that mean the same as the question, even in different words, but it blurs exact terms: names, codes, rare keywords. Keyword search (BM25) is the opposite. It finds the exact term every time and misses a paraphrase entirely. DeepResearch runs both and fuses them with Reciprocal Rank Fusion, which scores a passage by its rank in each list rather than by its raw score. Cosine similarities and BM25 scores live on unrelated scales, and adding them would only let one of them dominate. Ranks need no calibration, and no extra setting to justify.

The top twenty fused passages go to a local cross-encoder, which reads the question and each passage together and keeps the best five. Those five, and only those, become the evidence. The design record for the fusion step is careful to say that no claim is made that hybrid is better: it is the baseline to beat, and an experiment may show otherwise.

## Answer from the evidence, or not at all

The prompt keeps trusted instructions apart from untrusted data. The evidence arrives in numbered, delimited blocks, and the instructions say that anything inside them is material to read, never orders to follow. They also say to cite only the numbers shown, never to invent a source, and to say plainly when the evidence isn’t enough.

If retrieval finds nothing, the model is never asked. The system returns a fixed “no evidence” answer without a single model call, and a test holds it to that.

Citations are read with a strict pattern: digits in square brackets, nothing else. A citation to a block that doesn’t exist, say [7] when there were five, is not quietly dropped or renumbered. It is kept and reported as an invalid reference, and the answer is preserved exactly as the model wrote it. Rewriting the output to tidy its citations would fabricate the record of what the model said.

## Pointing is not proving

A valid number proves only that the model pointed at a passage, not that the passage supports the claim. So each cited sentence goes back to the model with the passages it cites, as a separate question: does this evidence support this claim?

The reply must be JSON: a verdict and a short explanation. If it doesn’t parse, the verifier gets one chance to repair it, with its own output and the schema in front of it. After that, the claim is marked unverifiable. It is never retried indefinitely, never handed to another model, and never silently counted as supported.

The verdicts are deliberately more than yes and no. A claim can be supported, unsupported, or short of evidence. A citation can be invalid. A sentence with no citation is tracked as uncited, which is not the same as unsupported. And a verdict the model failed to give is unverifiable, not a guess.

## Disagreement is an answer

Sources sometimes disagree, and the easy failure is to pick one without saying so. DeepResearch looks for one kind of disagreement deterministically: numbers that share their surrounding words but differ in value, such as “introduced in 2022” and “introduced in 2024”, or “5 stages” and “eight stages”. When it finds one, both passages stay in the evidence, the prompt names the disagreement and forbids settling it, and the answer’s status becomes conflicting evidence, even if every individual citation checks out. Supported parts do not settle a disputed whole.

The demonstration corpus has a plant that one document says was introduced in 2022 and another says in 2024. Asked when it was introduced, DeepResearch attributes each year to its source and declines to choose. Asked for the capital of Atlantis, it says the evidence doesn’t cover it, rather than inventing one. Asked what some field notes say about “the system prompt and secrets”, when the notes contain a planted instruction, it quotes the instruction as content, with a citation, and does none of what it says.

The detector is narrow, and the project says so. It doesn’t catch negations, paraphrased quantities or mismatched units, and it can flag a coincidence. A model could judge conflicts more broadly, but it would make the status itself unpredictable, for cases no evaluation has yet shown are needed.

## A small agent, on a short leash

For questions that need more than one search, a research agent can look around before the answer is written. It has exactly three tools, all read-only: search the documents, read a passage, look up a document. No code, no SQL, no network, no writes. Each decision it makes is validated before anything runs, and it stops after eight iterations, twelve tool calls or sixty seconds, whichever comes first. It ends in one of six named ways, so a run that ran out of time can be told apart from one that finished.

The loop is written directly, without an agent framework, because its termination and validation are the part that matters, and they should be visible and tested.

## Null, not zero

The evaluation set is eight hand-written cases over seven documents, one for each kind of question: single-document, multi-document, exact lookup, semantic, multi-hop, no answer, conflict and injection. Eight cases are enough to compare one configuration with another. They are not enough to say a system is good, and the project never uses them to.

On the real local pipeline in September 2026, every case’s relevant sources were in the top three (Recall@3 of 1.0, MRR 0.93), answer correctness was 0.86 and citation completeness 1.0. With seven documents, that shows the pipeline works, not that it is good. One result was simply a miss: the single no-answer case didn’t abstain, by the metric’s definition, on that run. And two numbers didn’t come out at all. Faithfulness and citation correctness were reported as null, not zero.

The cause was the model’s thinking. Qwen3 4B reasons before it answers, and when a call caps its output, the reasoning can use up the whole budget and leave an empty reply. Writing the answer runs uncapped and is reliable. The verifier ran with a small cap, and during the evaluation it repeatedly came back empty. With no verdicts, there was nothing to score, so the framework refused to score it. A zero would have said the answers were unfaithful. Null says, correctly, that this run couldn’t tell.

The same thing can happen in use, and there the job fails closed: a failed status, a safe message and a request ID, never a partial answer. Asking again normally works.

## What it taught me

**A citation is a claim, so check it.** Pointing at evidence and being supported by it are different facts, and they need different code.

**Keep “I don’t know” apart from “no”.** Uncited, unverifiable and null each mean something different from unsupported, unfaithful and zero. Merging them would make the system look more certain than it is.

**The judge needs judging too.** The headline numbers depend on a verifier that flaked. Until it is measured against labelled examples, its verdicts are a baseline, not a proof.

DeepResearch is complete through its twenty-one planned milestones, with 429 backend and 46 frontend tests. Its research jobs live in memory, so they don’t survive a restart, and it has no accounts and no web search. Because everything runs locally, it is not fast: about twelve seconds for a typical question on the development machine, and a minute for the slowest.

---

*The code, the design records and the evaluation results quoted here are at [github.com/ktripathi2281/DeepResearch](https://github.com/ktripathi2281/DeepResearch).*
