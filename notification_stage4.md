# Stage 4

## The Problem

Every page load triggers a database query to fetch notifications for the logged-in student. At 50,000 students, even moderate traffic generates thousands of database queries per minute. The database is built for reliable storage and complex queries — it's not a cache, and treating it like one under high read volume causes the latency problems described.

The goal is to make the common case (student loads their notifications) as cheap as possible.

---

## Strategy 1: Application-Level Cache with Redis

This is the one I'd implement first because it directly solves the problem.

How it works: when a student requests their notifications, the application checks Redis before touching the database. If the data is there (cache hit), return it immediately. If it's not there (cache miss), query the database, store the result in Redis with a TTL, then return it.

When a new notification is written for a student, delete their Redis key immediately. The next request for that student will be a cache miss and will fetch fresh data from the database. This is called a write-through invalidation strategy.

Redis key structure I'd use:
```
notifications:{subscriberId}:unread    TTL: 60 seconds
notifications:{subscriberId}:all       TTL: 120 seconds
```

Tradeoffs:

The wins are obvious — Redis reads are sub-millisecond. A query that took 200ms from PostgreSQL now takes under 1ms from Redis. The database only gets hit on cold starts and after new notifications arrive.

The risks: if the invalidation logic has a bug, students will see stale data until the TTL expires. Redis also needs to be running and healthy — if it goes down and you haven't handled it, every request suddenly hits the database simultaneously. This thundering herd problem can take down the database. The application layer needs to handle Redis failures gracefully (fall through to the database rather than crashing).

This is the strategy I'd recommend as the primary approach.

---

## Strategy 2: HTTP Cache Headers

How it works: the server sets `Cache-Control` headers on notification list responses. The browser caches the response and doesn't make a new request until the cache expires.

```
Cache-Control: private, max-age=30
ETag: "abc123hash"
```

On the next request, the browser sends `If-None-Match: "abc123hash"`. If nothing changed, the server returns a 304 Not Modified with an empty body — saving bandwidth and a database round trip.

Tradeoffs:

This is free — no additional infrastructure. Works entirely within HTTP. The downside is it only helps for the same browser on the same device. Incognito windows, different devices, and server-side rendering don't benefit. More importantly, a 30-second cache is not acceptable for a real-time notification system. If a critical placement update goes out, students could miss it for up to 30 seconds. This is okay as a complement to Redis but not as the primary strategy.

---

## Strategy 3: Pagination

This one doesn't reduce the number of database queries but dramatically reduces the cost of each one.

Instead of fetching all notifications for a student on every page load, the API returns the first 20 most recent:

```
GET /evaluation-service/notifications?subscriberId=<id>&limit=20&offset=0
```

A query returning 20 rows with a proper index is orders of magnitude faster than a query returning 500 rows. Network transfer is smaller, client-side rendering is faster, and memory usage drops. Students rarely need to see all 500 of their old notifications at once anyway.

Tradeoffs:

Simple to implement with no extra infrastructure. The tradeoff is that the client needs to handle loading more pages if the student wants older notifications. That's a minor UI concern and worth the performance gain. This should be implemented regardless of which caching strategy is chosen.

---

## Strategy 4: Read Replicas

How it works: add one or more PostgreSQL read replicas. Route all SELECT queries to the replicas and all INSERT/UPDATE/DELETE to the primary.

Tradeoffs:

This scales read capacity horizontally — add more replicas if load increases. The cost is replication lag, usually between 10ms and 100ms. A student who just received a notification might see it on the primary but not yet on the replica if they refresh immediately. For notification data this is acceptable. The bigger cost is infrastructure — read replicas add operational complexity and cost. This strategy also doesn't help if the bottleneck is the query itself (missing indexes). It should be combined with proper indexing.

---

## What I'd Actually Do

Combine pagination and Redis caching. Here's the flow:

1. Every notification list request checks Redis first.
2. On a cache miss, query PostgreSQL with `LIMIT 20 OFFSET 0`.
3. Store the result in Redis with a 60-second TTL.
4. When a new notification is written for a student, immediately delete their cache key.
5. The SSE connection from Stage 1 pushes the new notification to the student's browser in real-time regardless of cache state.

This means:
- Database is only queried on the first page load or immediately after a new notification is sent.
- Real-time delivery via SSE means students don't rely on the cache refresh cycle to see new notifications — they get them instantly through the open stream.
- Redis absorbs the burst from 50,000 students all loading the app in the morning.
