# Notification System Design

## Overview

This document describes the architecture and design of the Notification System backend (`notification_app_be`). The system enables creation, management, and delivery of notifications to registered subscribers via multiple channels (email, SMS, push, in-app).

---

## Architecture

```
Client (Postman / Frontend)
        |
        v
  Express REST API (notification_app_be)
        |
   ┌────┴────────────────────┐
   |                         |
routes.js              httpLoggerMiddleware
   |                         |
   ├── /subscribers           logging_middleware
   └── /notifications              |
        |                    Log() → Eval Server
        v
  Controller Layer
  (notificationController, subscriberController)
        |
        v
  Service Layer
  (notificationService, subscriberService)
        |
        v
  Domain / DB Layer
  (db.js - in-memory store)
```

---

## Components

### 1. `logging_middleware` (shared package)
A reusable package consumed by all services. Exposes the `Log(stack, level, package, message)` function which posts structured log entries to the evaluation server. All services initialise this with a Bearer token before use.

### 2. `notification_app_be`

#### Routes (`routes.js`)
Registers all REST endpoints. Delegates to controllers.

#### Controllers
- `subscriberController.js` — Handles HTTP layer for subscriber CRUD
- `notificationController.js` — Handles HTTP layer for notification operations

#### Services
- `subscriberService.js` — Business logic: validates inputs, checks for duplicate emails, manages subscriber lifecycle
- `notificationService.js` — Business logic: validates notification type/priority, resolves subscriber, dispatches notification, updates status

#### DB Layer (`db.js`)
In-memory Maps acting as the persistence layer for `subscribers` and `notifications`. Each entry is keyed by UUID.

#### Constants (`constants.js`)
Defines valid enum values for `NOTIFICATION_TYPES`, `NOTIFICATION_STATUS`, and `NOTIFICATION_PRIORITY`.

---

## API Endpoints

### Subscribers

| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | /api/subscribers      | Register a new subscriber |
| GET    | /api/subscribers      | List all subscribers     |
| GET    | /api/subscribers/:id  | Get subscriber by ID     |
| PUT    | /api/subscribers/:id  | Update subscriber        |
| DELETE | /api/subscribers/:id  | Remove subscriber        |

### Notifications

| Method | Endpoint                       | Description                  |
|--------|--------------------------------|------------------------------|
| POST   | /api/notifications             | Send a notification          |
| GET    | /api/notifications             | List all (filter by subscriberId) |
| GET    | /api/notifications/:id         | Get notification by ID       |
| PATCH  | /api/notifications/:id/read    | Mark notification as read    |
| DELETE | /api/notifications/:id         | Delete notification          |

---

## Notification Flow

```
POST /api/notifications
        |
        v
notificationController.send()
        |
        v
notificationService.sendNotification()
   1. Validate required fields
   2. Validate type and priority against allowed values
   3. Resolve subscriber by ID
   4. db.createNotification() → status: "queued"
   5. db.updateNotification() → status: "sent"
   6. Log each step via Log()
        |
        v
Response: 201 { success: true, data: { notification } }
```

---

## Notification Types

| Type    | Description              |
|---------|--------------------------|
| email   | Sent to subscriber email |
| sms     | Sent to subscriber phone |
| push    | Mobile push notification |
| in_app  | In-application alert     |

## Notification Priority Levels

| Priority | Use Case                         |
|----------|----------------------------------|
| low      | Informational, non-urgent        |
| medium   | Standard notifications           |
| high     | Requires prompt attention        |
| critical | Immediate action required        |

---

## Logging Strategy

Every significant event is logged using `Log(stack, level, package, message)`:

| Event                        | Level  | Package     |
|------------------------------|--------|-------------|
| Server startup               | info   | service     |
| Route registration           | info   | route       |
| Incoming HTTP request        | info   | middleware  |
| Validation failure           | warn   | service     |
| Duplicate subscriber         | warn   | service     |
| Notification dispatched      | info   | service     |
| DB record created/updated    | info   | db          |
| DB record not found          | warn   | db          |
| HTTP 4xx response            | warn   | middleware  |
| HTTP 5xx / unhandled error   | fatal  | handler     |

---

## vehicle_maintence_scheduler Design

### Overview
A separate Express service that manages vehicle records and their maintenance schedules.

### Key Components
- **Vehicle CRUD** — full lifecycle management (create, read, update, delete)
- **Schedule CRUD** — maintenance schedules linked to vehicles
- **Cron Job** (`maintenanceCron.js`) — runs every hour, logs overdue and upcoming (within 24h) schedules

### Schedule Flow
```
POST /api/schedules
        |
        v
scheduleService.createSchedule()
   1. Validate required fields
   2. Validate maintenanceType against allowed values
   3. Verify vehicle exists in db
   4. Validate scheduledDate format
   5. db.createSchedule()
   6. Log each step
```

### Maintenance Types
`oil_change`, `tire_rotation`, `brake_inspection`, `engine_check`, `general_service`

### Schedule Statuses
`pending` → `confirmed` → `completed` | `cancelled`

---

## Design Decisions

- **No external algorithm libraries** — all logic is implemented from scratch using native JavaScript.
- **In-memory store** — chosen for simplicity and portability; can be replaced with a real database (e.g. PostgreSQL) by swapping only `db.js`.
- **Shared logging_middleware** — both services (`vehicle_maintence_scheduler` and `notification_app_be`) consume the `logging_middleware` package via relative paths, demonstrating reusability.
- **Layered architecture** — strict separation between route, controller, service, and db layers ensures maintainability and testability.
- **Production-grade logging** — every layer logs contextual, descriptive messages rather than generic ones, making debugging straightforward.
