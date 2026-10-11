---
number: VI
title: Where is everyone?
subtitle: A live map for a group ride, and what to show when a rider goes quiet.
project: Ride Radar
---

# Where is everyone?

*A live map for a group ride, and what to show when a rider goes quiet.*

On a long ride with friends, someone falls behind, gets lost or takes a wrong turn, and there is no easy way to find them. Ride Radar is for that: one map with everyone on it. One rider creates a trip and shares its six-character invite code. The others join, and from then on each rider’s position, speed and battery appear on the same map, with a group chat beside it and an SOS button.

Underneath is a small set of decisions: what is worth keeping, who gets to hear what, and what to show when someone goes quiet.

## Two channels

Some things about a trip need to last: the accounts, the trip and who is in it, the waypoints, the chat history. Those go over ordinary HTTP to an Express API, and into MongoDB. Other things are only true for a few seconds: where a rider is right now, and how much charge their phone has left. Those go over a Socket.IO connection that stays open for the ride.

Each rider’s phone reads its position from the browser’s geolocation API, in high-accuracy mode. It sends the position whenever it changes, and every three seconds regardless. The server does two things with each point. It appends it to that rider’s log for the trip, and it passes it on to the rest of the trip.

## A trail that can’t grow forever

A log that gains a point every few seconds grows quickly. So the append and the trim happen in one database operation: the new point goes on the end, and anything older than the most recent 1,000 points falls off the front. Each rider’s history for a trip stays the same size, however long the ride. The map needs the recent route, not the whole day.

Each rider has one log per trip, and a unique index on the pair guarantees there is only ever one.

## Who hears what

A connection has to prove who it is before anything else. The rider’s token is checked during the socket handshake, and a connection without a valid one is refused before it can send a single event.

Each trip is a room. Positions, battery readings, chat messages and alerts are sent to the trip’s room and nowhere else. Positions go to everyone except the sender, who already knows where they are.

Signing in issues two tokens: an access token that lasts fifteen minutes and a refresh token that lasts seven days. When a request fails because the access token has expired, the client quietly gets a new one and repeats the request once. A ride lasts longer than fifteen minutes, and the session shouldn’t end in the middle of one.

## When a rider goes quiet

Phones lose signal on highways. When a rider’s connection drops, the server marks them offline and tells the rest of the trip. The obvious thing to do on the map would be to remove them. Ride Radar doesn’t: the rider stays where they were last seen, marked offline. For a group looking for someone, the last known position is the most useful thing on the screen.

Battery is shared in the same spirit, as a warning of what might happen next. Where the browser offers the Battery Status API, each rider’s charge is shown to the group and changes colour as it drops, below half and again below a fifth, so the others know a phone is about to die before it does.

## An alert you can’t send by accident

SOS is the one feature where both a false alarm and a missed alarm are costly. Pressing the button opens a confirmation first. Once confirmed, the alert goes to everyone in the trip, the sender included, so they see it arrive too. It is saved in the chat as a permanent message, the sender’s marker turns red and pulses, and the alert stays highlighted for thirty seconds.

## A setting that wasn’t there

One fix from the deployment is worth keeping. The server read its token lifetimes from environment variables. Where one wasn’t set, the token library was handed an undefined expiry, refused it, and signing in failed with a server error. Both lifetimes now have defaults, fifteen minutes and seven days, so a missing setting can’t lock everyone out.

## What it taught me

**Decide what each piece of data is for.** Some of it is a record and some of it is news. Records go into the database; news goes straight to the people who need it. A position is both.

**Bound everything that grows.** Capping the trail costs one option in one update, and it means the database doesn’t grow with the length of the ride.

**Silence is information.** A rider who has gone offline is still somewhere. Showing where they were last seen is more useful than showing nothing.

---

*Ride Radar is live at [ride-radar-sand.vercel.app](https://ride-radar-sand.vercel.app/), and the code is at [github.com/ktripathi2281/RideRadar](https://github.com/ktripathi2281/RideRadar).*
