# Stage 2

## Which Database and Why

I went with PostgreSQL here. The data is clearly relational — every notification belongs to exactly one subscriber, and that relationship should be enforced at the database level, not just in application code. If I used MongoDB and someone accidentally inserted a notification with a typo in the subscriber ID, the database wouldn't catch it. PostgreSQL with a proper foreign key will reject it outright.

I considered MongoDB since the notification `message` field is variable-length text and could theoretically have metadata attached, but the rest of the schema is stable and well-defined. There's no justification for going schemaless here. PostgreSQL supports JSONB if metadata needs to be flexible later, so it covers that case too without sacrificing relational integrity.

Another reason is ENUM types. PostgreSQL lets me define `notification_type` and `notification_priority` as actual database types, not just strings. Any application bug that tries to insert `"urgent"` instead of `"high"` gets caught by the database before it ever becomes bad data.

---

## Schema

```sql
CREATE TABLE subscribers (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(20),
    preferences TEXT[] DEFAULT ARRAY['in_app'],
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ
);

CREATE TYPE notification_type AS ENUM ('email', 'sms', 'push', 'in_app');
CREATE TYPE notification_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'read', 'failed');

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id   UUID NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    priority        notification_priority NOT NULL DEFAULT 'medium',
    title           VARCHAR(500) NOT NULL,
    message         TEXT NOT NULL,
    status          notification_status NOT NULL DEFAULT 'queued',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ
);

-- These indexes cover the query patterns I expect to be most common
CREATE INDEX idx_notifications_subscriber_id ON notifications (subscriber_id);
CREATE INDEX idx_notifications_subscriber_unread
    ON notifications (subscriber_id, created_at DESC)
    WHERE status != 'read';
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);
```

The `ON DELETE CASCADE` on `subscriber_id` means if a student is removed, all their notifications go with them automatically. No orphaned rows to clean up in application code.

---

## Queries for Each API Operation

### POST /evaluation-service/subscribers
```sql
INSERT INTO subscribers (name, email, phone, preferences)
VALUES ($1, $2, $3, $4)
RETURNING *;
```

### GET /evaluation-service/subscribers
```sql
SELECT id, name, email, phone, preferences, created_at
FROM subscribers
ORDER BY created_at DESC;
```

### GET /evaluation-service/subscribers/:id
```sql
SELECT * FROM subscribers WHERE id = $1;
```

### PUT /evaluation-service/subscribers/:id

Using `COALESCE` here so only the fields that are actually sent in the request body get updated:
```sql
UPDATE subscribers
SET
    name        = COALESCE($2, name),
    phone       = COALESCE($3, phone),
    preferences = COALESCE($4, preferences),
    updated_at  = NOW()
WHERE id = $1
RETURNING *;
```

### DELETE /evaluation-service/subscribers/:id
```sql
DELETE FROM subscribers WHERE id = $1;
```
The cascade handles the notifications automatically.

### POST /evaluation-service/notifications
```sql
INSERT INTO notifications (subscriber_id, type, priority, title, message, status, sent_at)
VALUES ($1, $2, $3, $4, $5, 'sent', NOW())
RETURNING *;
```

### GET /evaluation-service/notifications
```sql
-- No filter
SELECT * FROM notifications ORDER BY created_at DESC;

-- With subscriberId filter
SELECT * FROM notifications
WHERE subscriber_id = $1
ORDER BY created_at DESC;
```

### PATCH /evaluation-service/notifications/:id/read
```sql
UPDATE notifications
SET status = 'read', read_at = NOW(), updated_at = NOW()
WHERE id = $1
RETURNING *;
```

### DELETE /evaluation-service/notifications/:id
```sql
DELETE FROM notifications WHERE id = $1;
```

---

## What Goes Wrong as the Data Grows

### The table gets enormous

At 50,000 students getting even 10 notifications a day, that's 500,000 new rows per day. After a year you're at roughly 180 million rows in the notifications table. Without any changes, queries that were fast on day one start taking seconds. The fix I'd reach for first is partitioning.

PostgreSQL range partitioning by `created_at` splits the table into monthly chunks. A query that filters by date range only touches the partitions that actually contain the data rather than scanning the entire 180M row table.

```sql
CREATE TABLE notifications (
    id              UUID NOT NULL,
    subscriber_id   UUID NOT NULL,
    ...
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

CREATE TABLE notifications_2026_05
    PARTITION OF notifications
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

Old partitions from two years ago can be detached and archived without affecting anything. It's much cleaner than running DELETE jobs on a massive table.

---

### Unread query becomes slow

When a student opens the app, the first thing that happens is fetching their unread notifications. With 5 million rows and no index, the database scans everything. The partial index from the schema above (`WHERE status != 'read'`) handles this — it only stores rows that haven't been read yet, so its size stays manageable even as the table grows.

---

### Listing notifications with subscriber info requires joins

If the frontend needs the subscriber's name next to each notification (for an admin dashboard, say), a naive implementation would fetch each subscriber separately per notification row. That's an N+1 problem. A single JOIN with pagination is the fix:

```sql
SELECT
    n.id, n.title, n.type, n.status, n.created_at,
    s.name AS subscriber_name,
    s.email AS subscriber_email
FROM notifications n
JOIN subscribers s ON s.id = n.subscriber_id
ORDER BY n.created_at DESC
LIMIT 20 OFFSET $1;
```

---

### Too many concurrent database connections

50,000 students at peak hours all loading their notifications simultaneously would open thousands of connections to PostgreSQL. The default connection limit is around 100. Running PgBouncer in front of PostgreSQL in transaction pooling mode lets thousands of application connections share a small pool of actual database connections. It's essentially a must-have for any Node.js + PostgreSQL app at scale.

---

### All reads hitting one database instance

Most of the traffic is reads — students viewing notifications. Writes (HR sending notifications) are relatively infrequent. Adding a read replica lets us route all SELECT queries there and keep the primary instance free for writes. Replication lag is typically under 100ms which is completely acceptable for notification data.
