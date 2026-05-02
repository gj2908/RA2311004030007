# Campus Notifications Microservice - Stage 1

## Overview

This document describes the REST API design, contract, and JSON schemas for the Campus Notifications Microservice. The platform enables students to receive real-time updates for Placements, Events, and Results. It also serves as the design specification for a frontend colleague to consume these APIs.

All implementation code lives in the `notification_app_be` directory. The Logging Middleware package (`logging_middleware`) is integrated throughout and must be used for all logging — no console.log or built-in logger replacements are permitted.

---

## Core Actions the Platform Supports

| Action | Description |
|---|---|
| Register a subscriber | A student registers to receive notifications |
| Retrieve a subscriber | Look up a registered subscriber by ID |
| Update a subscriber | Modify preferences or contact info |
| Remove a subscriber | Unregister from the platform |
| Send a notification | Dispatch a notification to a subscriber |
| List notifications | Retrieve all or filtered notifications |
| Retrieve a notification | Fetch a single notification by ID |
| Mark as read | Acknowledge a notification |
| Delete a notification | Remove a notification from history |
| Real-time delivery | Push new notifications to connected clients without polling |

---

## Base URL

```
http://localhost:3002
```

All endpoints are prefixed with `/api`.

---

## Authentication

For this evaluation, users accessing the API are assumed to have been pre-authorised. No login or registration is required from the consumer side. The API does not enforce user-level authentication on its endpoints.

---

## Common Response Structure

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { }
}
```

Error responses:

```json
{
  "success": false,
  "error": "Descriptive error message"
}
```

---

## Common Headers

| Header | Value | Direction |
|---|---|---|
| Content-Type | application/json | Request and Response |
| Accept | application/json | Request |

For real-time (SSE) endpoints:

| Header | Value | Direction |
|---|---|---|
| Content-Type | text/event-stream | Response |
| Cache-Control | no-cache | Response |
| Connection | keep-alive | Response |

---

## JSON Schemas

### Subscriber Schema

```json
{
  "id": "uuid-string",
  "name": "string (required)",
  "email": "string (required, unique)",
  "phone": "string (optional)",
  "preferences": ["email", "sms", "push", "in_app"],
  "createdAt": "ISO 8601 timestamp",
  "updatedAt": "ISO 8601 timestamp (if modified)"
}
```

### Notification Schema

```json
{
  "id": "uuid-string",
  "subscriberId": "uuid-string (required)",
  "type": "email | sms | push | in_app (required)",
  "priority": "low | medium | high | critical",
  "title": "string (required)",
  "message": "string (required)",
  "status": "queued | sent | read | failed",
  "createdAt": "ISO 8601 timestamp",
  "sentAt": "ISO 8601 timestamp",
  "readAt": "ISO 8601 timestamp (if read)",
  "updatedAt": "ISO 8601 timestamp (if modified)"
}
```

### Notification Types

| Type | Description |
|---|---|
| email | Delivered to the subscriber's email address |
| sms | Delivered to the subscriber's phone number |
| push | Mobile or browser push notification |
| in_app | Displayed inside the web/mobile application |

### Notification Priority Levels

| Priority | Use Case |
|---|---|
| low | Informational, non-urgent updates |
| medium | Standard campus updates |
| high | Time-sensitive announcements |
| critical | Immediate action required (e.g. exam schedule change) |

---

## Subscriber Endpoints

### POST /api/subscribers

Register a new subscriber.

**Request Body:**
```json
{
  "name": "Gaurang Jadoun",
  "email": "gaurang@srmist.edu.in",
  "phone": "9999999999",
  "preferences": ["email", "in_app"]
}
```

**Response — 201 Created:**
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

**Response — 400 Bad Request (missing fields):**
```json
{
  "success": false,
  "error": "name and email are required."
}
```

**Response — 400 Bad Request (duplicate email):**
```json
{
  "success": false,
  "error": "Subscriber with email gaurang@srmist.edu.in already exists."
}
```

---

### GET /api/subscribers

List all registered subscribers.

**Response — 200 OK:**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Gaurang Jadoun",
      "email": "gaurang@srmist.edu.in",
      "phone": "9999999999",
      "preferences": ["email", "in_app"],
      "createdAt": "2026-05-02T06:30:00.000Z"
    }
  ]
}
```

---

### GET /api/subscribers/:id

Retrieve a single subscriber by ID.

**Response — 200 OK:**
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

**Response — 404 Not Found:**
```json
{
  "success": false,
  "error": "Subscriber a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found."
}
```

---

### PUT /api/subscribers/:id

Update a subscriber's details or preferences.

**Request Body (all fields optional):**
```json
{
  "phone": "8888888888",
  "preferences": ["sms", "push", "in_app"]
}
```

**Response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Gaurang Jadoun",
    "email": "gaurang@srmist.edu.in",
    "phone": "8888888888",
    "preferences": ["sms", "push", "in_app"],
    "createdAt": "2026-05-02T06:30:00.000Z",
    "updatedAt": "2026-05-02T07:00:00.000Z"
  }
}
```

---

### DELETE /api/subscribers/:id

Unregister a subscriber.

**Response — 200 OK:**
```json
{
  "success": true,
  "message": "Subscriber deleted."
}
```

---

## Notification Endpoints

### POST /api/notifications

Send a notification to a registered subscriber.

**Request Body:**
```json
{
  "subscriberId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "type": "in_app",
  "priority": "high",
  "title": "Placement Drive - TCS",
  "message": "TCS placement drive is scheduled for May 10, 2026 in the main auditorium. Registration closes May 8."
}
```

**Response — 201 Created:**
```json
{
  "success": true,
  "data": {
    "id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
    "subscriberId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "in_app",
    "priority": "high",
    "title": "Placement Drive - TCS",
    "message": "TCS placement drive is scheduled for May 10, 2026 in the main auditorium. Registration closes May 8.",
    "status": "sent",
    "createdAt": "2026-05-02T06:35:00.000Z",
    "sentAt": "2026-05-02T06:35:00.000Z"
  }
}
```

**Response — 400 Bad Request (invalid type):**
```json
{
  "success": false,
  "error": "Invalid type. Must be one of: email, sms, push, in_app"
}
```

**Response — 400 Bad Request (subscriber not found):**
```json
{
  "success": false,
  "error": "Subscriber with id a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found."
}
```

---

### GET /api/notifications

List all notifications. Optionally filter by subscriber.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| subscriberId | string (optional) | Filter notifications for a specific subscriber |

**Request:**
```
GET /api/notifications?subscriberId=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response — 200 OK:**
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
      "message": "TCS placement drive is scheduled for May 10, 2026.",
      "status": "sent",
      "createdAt": "2026-05-02T06:35:00.000Z",
      "sentAt": "2026-05-02T06:35:00.000Z"
    }
  ]
}
```

---

### GET /api/notifications/:id

Retrieve a single notification by ID.

**Response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
    "subscriberId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "in_app",
    "priority": "high",
    "title": "Placement Drive - TCS",
    "message": "TCS placement drive is scheduled for May 10, 2026.",
    "status": "sent",
    "createdAt": "2026-05-02T06:35:00.000Z",
    "sentAt": "2026-05-02T06:35:00.000Z"
  }
}
```

**Response — 404 Not Found:**
```json
{
  "success": false,
  "error": "Notification f9e8d7c6-b5a4-3210-fedc-ba9876543210 not found."
}
```

---

### PATCH /api/notifications/:id/read

Mark a notification as read.

**Response — 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "f9e8d7c6-b5a4-3210-fedc-ba9876543210",
    "subscriberId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "in_app",
    "priority": "high",
    "title": "Placement Drive - TCS",
    "message": "TCS placement drive is scheduled for May 10, 2026.",
    "status": "read",
    "createdAt": "2026-05-02T06:35:00.000Z",
    "sentAt": "2026-05-02T06:35:00.000Z",
    "readAt": "2026-05-02T08:10:00.000Z"
  }
}
```

---

### DELETE /api/notifications/:id

Delete a notification by ID.

**Response — 200 OK:**
```json
{
  "success": true,
  "message": "Notification deleted."
}
```

---

### GET /api/health

Service health check.

**Response — 200 OK:**
```json
{
  "success": true,
  "message": "Notification Service is running."
}
```

---

## Real-Time Notification Mechanism

The platform implements **Server-Sent Events (SSE)** for real-time delivery. SSE is chosen over WebSockets because:

- Notifications flow only from server to client (unidirectional), making SSE the correct and more efficient protocol
- SSE runs over standard HTTP — no additional infrastructure or protocol upgrade required
- SSE automatically reconnects if the connection drops, with no client-side library needed
- All modern browsers support SSE natively via the `EventSource` API

### SSE Endpoint

```
GET /api/notifications/stream?subscriberId=<id>
```

The frontend opens a persistent connection to this endpoint. Whenever a new notification is created for the subscriber, the server pushes it as an SSE event.

### SSE Event Format

```
event: notification
data: {"id":"...","title":"Exam Results Published","type":"in_app","priority":"high","message":"Your semester results are now available.","status":"sent","createdAt":"..."}

```

### Frontend Consumption Example (JavaScript)

```javascript
const evtSource = new EventSource(
  `/api/notifications/stream?subscriberId=${subscriberId}`
);

evtSource.addEventListener("notification", (event) => {
  const notification = JSON.parse(event.data);
  displayNotification(notification);
});

evtSource.onerror = () => {
  console.error("SSE connection lost. Reconnecting...");
};
```

### SSE Response Headers

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

---

## API Endpoint Summary

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/health | Service health check |
| POST | /api/subscribers | Register a subscriber |
| GET | /api/subscribers | List all subscribers |
| GET | /api/subscribers/:id | Get subscriber by ID |
| PUT | /api/subscribers/:id | Update subscriber |
| DELETE | /api/subscribers/:id | Delete subscriber |
| POST | /api/notifications | Send a notification |
| GET | /api/notifications | List notifications (optional filter by subscriberId) |
| GET | /api/notifications/:id | Get notification by ID |
| PATCH | /api/notifications/:id/read | Mark notification as read |
| DELETE | /api/notifications/:id | Delete notification |
| GET | /api/notifications/stream | Real-time SSE stream for a subscriber |

---

## Naming Conventions

- Endpoints use plural nouns: `/subscribers`, `/notifications`
- Resource-specific operations use `/:id` path parameter
- State-changing sub-actions use descriptive suffixes: `/read`, `/stream`
- HTTP methods are used semantically: POST to create, GET to read, PUT to fully update, PATCH for partial update, DELETE to remove

---

## Error Handling Strategy

| HTTP Status | Meaning | When Used |
|---|---|---|
| 200 | OK | Successful GET, PUT, PATCH, DELETE |
| 201 | Created | Successful POST (resource created) |
| 400 | Bad Request | Missing required fields, invalid enum value |
| 404 | Not Found | Resource ID does not exist |
| 500 | Internal Server Error | Unhandled exception or upstream failure |

---

## Logging Integration

Every significant event across all layers is logged using `Log(stack, level, package, message)` from the shared `logging_middleware` package.

| Event | Level | Package |
|---|---|---|
| Server startup | info | service |
| Route registration | info | route |
| Incoming HTTP request | info | middleware |
| Validation failure | warn | service |
| Duplicate subscriber | warn | service |
| Notification dispatched | info | service |
| DB record created | info | db |
| DB record not found | warn | db |
| HTTP 4xx response | warn | middleware |
| HTTP 5xx / unhandled error | fatal | handler |

---

## Architecture Diagram

```
Student / Frontend Client
          |
          |  HTTP REST + SSE
          v
  Express.js (notification_app_be, port 3002)
          |
    ------+---------------------
    |                           |
 routes.js            httpLoggerMiddleware
    |                           |
    +-- /subscribers       logging_middleware
    +-- /notifications          |
    +-- /notifications/stream   Log() --> Eval Server
          |
    Controller Layer
    (subscriberController, notificationController)
          |
    Service Layer
    (subscriberService, notificationService)
          |
    DB Layer (db.js - in-memory Maps)
    SSE Layer (sseManager.js - active connections)
```
