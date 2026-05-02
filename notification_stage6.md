# Stage 6

## The Task

The product manager wants a Priority Inbox — instead of showing all notifications in reverse chronological order, always show the top 10 most important ones. Importance is based on two things: the type of notification (placement matters more than a farewell event) and how recent it is (a placement from a week ago loses out to a result from today).

The notifications come from the evaluation server's API — I'm not storing them locally and not creating my own.

---

## Notification API

```
GET http://20.207.122.201/evaluation-service/notifications
Authorization: Bearer <token>
```

Response shape:
```json
{
  "notifications": [
    {
      "ID": "d1d40093a-...",
      "Type": "Placement",
      "Message": "CSX Corporation hiring",
      "Timestamp": "2026-04-22 17:51:18"
    }
  ]
}
```

---

## Priority Inbox Endpoint

```
GET /evaluation-service/notifications/priority-inbox
GET /evaluation-service/notifications/priority-inbox?limit=10
```

Optional `limit` param (default 10). Fetches from the eval server, runs the scorer, returns the top N.

---

## How Scoring Works

Each notification gets a numeric score based on two factors:

**Type weight** — Some notification types matter more than others. I set:
- Placement: 30
- Result: 20
- Event: 10
- Everything else (mid-sem, project-review, farewell, Tech-fest, etc.): 5

**Recency decay** — Older notifications score lower. The formula subtracts 1 point for every hour of age.

Combined:
```
score = type_weight * 10 - age_in_hours
```

Some examples to check this makes sense:
- Placement from 1 hour ago: 300 - 1 = **299**
- Result from 1 hour ago: 200 - 1 = **199**
- Placement from 7 days ago (168 hours): 300 - 168 = **132**
- Event from 1 hour ago: 100 - 1 = **99**
- Event from 2 days ago (48 hours): 100 - 48 = **52**
- farewell from right now: 50 - 0 = **50**

This feels right to me — recent placements and results always rank high, but a placement from three weeks ago doesn't crowd out today's exam result. The decay rate (1 point per hour) can be tuned if needed.

---

## Why Min-Heap and Not Just Sort

The obvious approach is: score all notifications, sort descending, take first 10. That's O(n log n).

A better approach is a min-heap of fixed size 10. Here's how it works:

1. Walk through notifications one by one (O(n) scan).
2. For each notification, compute its score.
3. If the heap has fewer than 10 items, push it in.
4. If the heap already has 10 items and this notification's score beats the current minimum (heap root), pop the minimum and push the new one.
5. Otherwise throw it away.
6. At the end, drain the heap — you have the top 10.

Each push/pop on the heap is O(log 10) which is a constant (about 3 comparisons). So the total is O(n * log 10) = effectively O(n).

The heap only ever holds 10 items regardless of how many notifications there are. If there are 50,000 notifications, we process them one at a time and maintain a fixed window of the best 10 seen so far. Memory stays constant at O(10).

This matters if new notifications keep coming in — you don't need to re-sort everything from scratch. You just evaluate each new notification against the current minimum in the heap.

---

## The Code

`priorityInboxService.js` contains:
- `MinHeap` class — standard binary min-heap, keyed on `score`
- `computeScore(notification)` — type weight × 10 minus age in hours
- `getTopN(notifications, n)` — runs the heap algorithm described above
- `fetchNotifications()` — calls the eval server with the Bearer token
- `getPriorityInbox(limit)` — orchestrates fetch + score + return

`priorityInboxController.js` handles the HTTP layer.

The endpoint is wired at `GET /evaluation-service/notifications/priority-inbox`.

---

## Sample Response

```json
{
  "success": true,
  "data": {
    "total": 47,
    "showing": 10,
    "top": [
      {
        "id": "b2833188-aa1a-4b7c-95a9-1f29248b04b4",
        "type": "Placement",
        "message": "CSX Corporation hiring",
        "timestamp": "2026-04-22 17:51:18",
        "score": 274.63
      },
      {
        "id": "61583eda-0a43-4477-9556-41f2f658ae9d",
        "type": "Event",
        "message": "farewell",
        "timestamp": "2026-04-22 17:51:06",
        "score": 90.01
      }
    ]
  }
}
```

The `score` field is included in the response so it's transparent how each notification was ranked.

---

## Maintaining Top 10 Efficiently as New Notifications Arrive

Since the heap always holds exactly 10 items, adding a new notification is just one comparison + one heap operation — O(log 10) which is constant. You don't need to re-fetch everything or re-sort.

In a production system with a real-time stream (like our SSE from Stage 1), whenever a new notification comes in through the stream you'd:
1. Compute its score.
2. Compare it to the current heap minimum.
3. If it beats the minimum, update the heap.
4. Re-render the top 10 in the UI.

That's three operations, not a full re-sort of the notification list.

---

## Candidate Details

- Name: Gaurang Jadoun
- Roll No: RA2311004030007
- Email: gj6117@srmist.edu.in
- GitHub: gj2908
