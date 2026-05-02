# Stage 1

## What the Platform Needs to Do

The campus notification system basically needs to let the backend push updates to students for things like placements, exam results, and events. Before writing any code I sat down and listed out what actions the API actually needs to support, because I've found that jumping straight into writing routes without thinking through the full data lifecycle usually means refactoring everything later.

The core actions are:

| Action | Description |
|---|---|
| Register a subscriber | Student signs up to receive notifications |
| Get a subscriber | Look up by ID |
| Update a subscriber | Change contact details or preferences |
| Remove a subscriber | Unregister |
| Send a notification | Dispatch to a specific subscriber |
| List notifications | All notifications, optionally filtered by subscriber |
| Get one notification | Fetch by ID |
| Mark as read | Acknowledge a notification |
| Delete a notification | Remove from history |
| Real-time push | Get notified without refreshing the page |

---

## Base URL

```
http://localhost:3002
```

---

## Auth

The assignment says users are pre-authorised so I haven't built any auth middleware on the consumer-facing side. The notification service itself uses a Bearer token when calling the evaluation server logging APIs.

---

## Response Format

I went with a consistent envelope for all responses so the frontend always knows what to expect:

Success:
```json
{
  "success": true,
  "data": {}
}
```

Error:
```json
{
  "success": false,
  "error": "Something went wrong here"
}
```

---

## Headers

Standard REST:

| Header | Value |
|---|---|
| Content-Type | application/json |
| Accept | application/json |

For the SSE stream endpoint (explained at the bottom):

| Header | Value |
|---|---|
| Content-Type | text/event-stream |
| Cache-Control | no-cache |
| Connection | keep-alive |
| X-Accel-Buffering | no |

The `X-Accel-Buffering: no` header is important if the server is behind Nginx — without it Nginx buffers the SSE stream and the client never receives events.

---

## Data Schemas

### Subscriber

```json
{
  "id": "uuid",
  "name": "string (required)",
  "email": "string (required, must be unique)",
  "phone": "string (optional)",
  "preferences": ["email", "sms", "push", "in_app"],
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

### Notification

```json
{
  "id": "uuid",
  "subscriberId": "uuid (required)",
  "type": "email | sms | push | in_app (required)",
  "priority": "low | medium | high | critical",
  "title": "string (required)",
  "message": "string (required)",
  "status": "queued | sent | read | failed",
  "createdAt": "ISO 8601",
  "sentAt": "ISO 8601",
  "readAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

Types explained:

| Type | What it does |
|---|---|
| email | Goes to the student's registered email |
| sms | Sent to their phone number |
| push | Browser or mobile push |
| in_app | Shows up inside the app directly |

Priority levels:

| Priority | When to use |
|---|---|
| low | Informational stuff, no urgency |
| medium | Normal campus updates |
| high | Time-sensitive, student should see it soon |
| critical | Needs immediate attention |

---

## Subscriber Endpoints

### POST /evaluation-service/subscribers

Request body:
```json
{
  "name": "Gaurang Jadoun",
  "email": "gaurang@srmist.edu.in",
  "phone": "9999999999",
  "preferences": ["email", "in_app"]
}
```

201 Created:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Gaurang Jadoun",
    "email": "gaurang@srmist.edu.in",
    "phone": "9999999999",
    "preferences": ["email", "in_app"],
    "createdAt": "2026-05-02T06:30:00.000Z"
  }
}
```

400 if fields are missing:
```json
{ "success": false, "error": "name and email are required." }
```

400 if email already exists:
```json
{ "success": false, "error": "Subscriber with email gaurang@srmist.edu.in already exists." }
```

---

### GET /evaluation-service/subscribers

200 OK:
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Gaurang Jadoun",
      "email": "gaurang@srmist.edu.in",
      "preferences": ["email", "in_app"],
      "createdAt": "2026-05-02T06:30:00.000Z"
    }
  ]
}
```

---

### GET /evaluation-service/subscribers/:id

200 OK: same single subscriber object.

404 if not found:
```json
{ "success": false, "error": "Subscriber a1b2c3d4 not found." }
```

---

### PUT /evaluation-service/subscribers/:id

All body fields are optional — only send what you want to update:
```json
{
  "phone": "8888888888",
  "preferences": ["sms", "push"]
}
```

200 OK: returns the full updated subscriber object.

---

### DELETE /evaluation-service/subscribers/:id

200 OK:
```json
{ "success": true, "message": "Subscriber deleted." }
```

---

## Notification Endpoints

### POST /evaluation-service/notifications

Request body:
```json
{
  "subscriberId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "in_app",
  "priority": "high",
  "title": "Placement Drive - TCS",
  "message": "TCS placement drive on May 10, 2026. Register by May 8."
}
```

201 Created:
```json
{
  "success": true,
  "data": {
    "id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
    "subscriberId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "in_app",
    "priority": "high",
    "title": "Placement Drive - TCS",
    "message": "TCS placement drive on May 10, 2026. Register by May 8.",
    "status": "sent",
    "createdAt": "2026-05-02T06:35:00.000Z",
    "sentAt": "2026-05-02T06:35:00.000Z"
  }
}
```

400 if type is wrong:
```json
{ "success": false, "error": "Invalid type. Must be one of: email, sms, push, in_app" }
```

400 if subscriber doesn't exist:
```json
{ "success": false, "error": "Subscriber with id a1b2c3d4 not found." }
```

---

### GET /evaluation-service/notifications

Returns all notifications. Pass `?subscriberId=<id>` to filter for one student.

200 OK:
```json
{
  "success": true,
  "data": [
    {
      "id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
      "subscriberId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "type": "in_app",
      "priority": "high",
      "title": "Placement Drive - TCS",
      "status": "sent",
      "createdAt": "2026-05-02T06:35:00.000Z"
    }
  ]
}
```

---

### GET /evaluation-service/notifications/:id

200 OK: full single notification object.

404 if not found:
```json
{ "success": false, "error": "Notification f9e8d7c6 not found." }
```

---

### PATCH /evaluation-service/notifications/:id/read

Marks the notification as read and sets `readAt`.

200 OK: returns updated notification with `"status": "read"` and the `readAt` timestamp filled in.

---

### DELETE /evaluation-service/notifications/:id

200 OK:
```json
{ "success": true, "message": "Notification deleted." }
```

---

### GET /evaluation-service/health

```json
{
  "success": true,
  "message": "Notification Service is running.",
  "activeStreams": 0
}
```

---

## Real-Time Notifications via SSE

For the real-time part I went with Server-Sent Events rather than WebSockets. The reason is simple — notifications only flow one way, server to client. WebSockets are for bidirectional communication and would add unnecessary complexity and overhead here. SSE is built into HTTP, browsers handle reconnection automatically, and no client-side library is needed.

### Endpoint

```
GET /evaluation-service/notifications/stream?subscriberId=<id>
```

The frontend opens this connection once after login and keeps it open. Whenever a new notification is created for that subscriber (via POST /notifications or /notifications/notify-all), the server pushes it over the open connection immediately.

### What the event looks like

```
event: notification
data: {"id":"...","title":"Results Published","type":"in_app","priority":"high","status":"sent","createdAt":"..."}

```

### How to use it on the frontend

```javascript
const evtSource = new EventSource(
  `/evaluation-service/notifications/stream?subscriberId=${subscriberId}`
);

evtSource.addEventListener("notification", (event) => {
  const notification = JSON.parse(event.data);
  showNotificationBadge(notification);
});

evtSource.onerror = () => {
  // Browser will auto-reconnect after a few seconds
  console.warn("SSE connection dropped, reconnecting...");
};
```

---

## All Endpoints at a Glance

| Method | Endpoint | What it does |
|---|---|---|
| GET | /evaluation-service/health | Health check |
| POST | /evaluation-service/subscribers | Register subscriber |
| GET | /evaluation-service/subscribers | List all subscribers |
| GET | /evaluation-service/subscribers/:id | Get by ID |
| PUT | /evaluation-service/subscribers/:id | Update |
| DELETE | /evaluation-service/subscribers/:id | Delete |
| POST | /evaluation-service/notifications | Send notification |
| GET | /evaluation-service/notifications | List all |
| GET | /evaluation-service/notifications/:id | Get by ID |
| PATCH | /evaluation-service/notifications/:id/read | Mark as read |
| DELETE | /evaluation-service/notifications/:id | Delete |
| GET | /evaluation-service/notifications/stream | SSE real-time stream |
| POST | /evaluation-service/notifications/notify-all | Bulk notify (Stage 5) |
| GET | /evaluation-service/notifications/notify-all/status | Bulk job status |

---

## Naming Decisions

Plural nouns for collections (`/subscribers`, `/notifications`), `/:id` for single resources, and action-specific suffixes (`/read`, `/stream`, `/notify-all`) for operations that don't map cleanly to CRUD. HTTP methods are used as intended — no POST endpoints that delete things or GET endpoints that create state.

---

## Error Status Codes

| Code | When |
|---|---|
| 200 | Successful GET, PUT, PATCH, DELETE |
| 201 | Successful POST creating a resource |
| 202 | Accepted but processing async (notify-all) |
| 400 | Bad input — missing fields or invalid enum |
| 404 | Resource not found |
| 500 | Unhandled server error |

---

## Logging

Everything is logged through the `logging_middleware` package using `Log(stack, level, package, message)`. No raw console.log calls anywhere in the codebase.

| What's logged | Level | Package |
|---|---|---|
| Server start | info | service |
| Route registration | info | route |
| Every incoming request | info | middleware |
| Missing/invalid input | warn | service |
| Duplicate email on register | warn | service |
| Notification sent | info | service |
| DB record created/updated | info | db |
| DB record not found | warn | db |
| 4xx responses | warn | middleware |
| Unhandled errors | fatal | handler |
