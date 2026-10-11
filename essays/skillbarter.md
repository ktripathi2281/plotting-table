---
number: VII
title: A double coincidence of wants
subtitle: Trading skills without money, and the oldest problem with barter.
project: Skill Barter
---

# A double coincidence of wants

*Trading skills without money, and the oldest problem with barter.*

Barter has a well-known flaw, and economists have a name for it: the double coincidence of wants. For a trade to happen without money, I have to want what you have, and you have to want what I have, at the same time. Money is the usual way around that. Skill Barter doesn’t go around it. It tries to make the coincidence easy to find.

You list the skills you can teach and the skills you want to learn, each in one of eleven categories, from programming and design to music, languages and cooking. Then you browse the people who have done the same.

## Finding the coincidence

For every other person, the server asks two questions. Do they offer something in a category I want? Do I offer something in a category they want? Yes to both is a perfect match: a trade that works for both sides. Yes to one is a partial match: one side would have to be generous, or the conversation would have to find something else. No to both is no match, and those people are still shown, last.

The results are sorted in that order, perfect matches first. Within each group, people in your own city come first, unless you have chosen a city to browse. Location is a city, given when you register. The user model already has room for a geographic point, with a geospatial index on it, but nothing fills it in yet. For now, “near” means “in the same city”.

Matching works on categories rather than on individual skills. Two people who both list programming may mean Java and Python. A category match finds people in the right area, and the conversation settles the details.

## A trade needs two yeses

A trade request opens a conversation between two people, naming the skill offered and the skill asked for, and the trade starts out pending. Each person accepts separately, and the trade becomes active only when both have. Either of them can cancel at any time, and a cancelled trade closes its chat.

Finishing works the same way. Each person marks the trade complete on their own, and it is complete only when both have. Each side’s dashboard shows what they are learning, and a skill moves to “already learned” for you as soon as you have marked it done, whether or not the other person has yet.

Two consents at the start and two at the end is more ceremony than a single accept button. But a trade is a promise in both directions, and neither person should be able to make it, or close it, for the other.

## Talking it over

Chat is real time, over Socket.IO, with typing indicators and an unread count for each conversation. A socket connection proves who it is with the same token as the rest of the app, checked during the handshake, before any event is accepted. There is one conversation for each pair of people: starting another trade with someone you already talk to brings back the conversation you have.

## Keeping the door honest

An account has to own its email address. Registering sends a six-digit code, valid for ten minutes, and an unverified account can’t sign in until the code is entered. Registering again with an address that was never verified sends a fresh code instead of failing, so someone who lost the first email isn’t stuck.

Signing in issues two tokens: an access token that expires in fifteen minutes and a refresh token that lasts seven days. The server keeps the refresh token it issued and accepts only that one, so signing out cancels it. In the browser, a request that fails because the access token has expired is renewed and retried once, out of sight.

The API also limits how fast anyone can knock. Each address gets 100 requests every fifteen minutes, and only 20 for signing in and registering, which puts guessing a six-digit code out of reach from any one address. Cross-origin requests are accepted only from the app’s own front end.

## What it taught me

**Name the problem before solving it.** “Double coincidence of wants” turned a vague goal, matching people, into two precise questions the server can ask.

**Consent is a data structure.** A trade that needs both sides is two lists of who has agreed, checked before the state changes.

**Be honest about “near”.** A city is a coarse idea of distance. It is a sound first version, as long as the product doesn’t pretend it is more.

---

*Skill Barter is live at [skill-barter-psi.vercel.app](https://skill-barter-psi.vercel.app/), and the code is at [github.com/ktripathi2281/Skill-Barter](https://github.com/ktripathi2281/Skill-Barter).*
