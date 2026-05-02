# Stage 3

## The Query in Question

```sql
SELECT * FROM notifications
WHERE studentID = 1842 AND isRead = false
ORDER BY createdAt DESC;
```

---

## Is It Accurate?

Logically, yes — it's asking for the right thing. Get unread notifications for student 1842, newest first. The intent is correct.

Performance-wise, it's a problem. On a 5 million row table with no proper indexes, this query is going to be slow.

---

## Why It's Slow

There are a few things wrong here:

**No useful composite index.** If there's only a basic index on `studentID`, the database will use it to find all rows for student 1842 — let's say that's 200 rows. It then has to filter those for `isRead = false` and sort what's left by `createdAt`. That's fine for 200 rows, but the real problem is at the table level. At 5 million rows, even finding those 200 initial rows through an index on `studentID` alone is slower than it should be because the index isn't covering the full filter.

If there's no index at all, the database does a full sequential scan of all 5 million rows, evaluating every single one. At 5M rows that's going to take anywhere from 2 to 8 seconds depending on hardware.

**`SELECT *` fetches everything.** The notifications table has a `message` column which is a TEXT field — potentially several hundred bytes per row. Fetching all columns means the database has to read and transfer every one of those bytes for every matching row. If the frontend only needs the title, type, and date, this is a lot of wasted I/O.

**No LIMIT clause.** If student 1842 has 500 unread notifications (say they didn't check the app for months), this query returns all 500 at once. That's unnecessary memory usage on the server and a slow response for the client. Most UIs only show the first 20 anyway.

**Boolean filter on a non-partial index.** `isRead = false` is highly selective — at any given time, most notifications are eventually read. But without a partial index that only stores unread rows, any index on `isRead` still stores every row and the filter happens after the index lookup.

---

## Computation Cost Without Changes

At 5 million rows with no composite index: the database does a full table scan — O(n) over 5 million rows — then sorts the matching subset. Depending on the hardware and PostgreSQL configuration, this realistically takes between 2,000ms and 8,000ms. That's not a loading spinner situation, that's a timeout.

---

## What I'd Change

```sql
-- Create a partial composite index covering exactly this query pattern
CREATE INDEX idx_notifications_student_unread
ON notifications (studentID, createdAt DESC)
WHERE isRead = false;

-- Rewrite the query to only fetch what's needed, with pagination
SELECT id, title, message, notificationType, priority, createdAt
FROM notifications
WHERE studentID = 1842 AND isRead = false
ORDER BY createdAt DESC
LIMIT 20 OFFSET 0;
```

With the partial index, the database jumps directly to student 1842's unread rows. The rows are already ordered by `createdAt DESC` in the index so there's no separate sort step. LIMIT 20 means only 20 rows get returned regardless. Query time drops from several seconds to under 5ms.

---

## Should You Index Every Column?

No. This is actually harmful advice even though it sounds safe.

Every index has a cost. When you INSERT, UPDATE, or DELETE a row, the database has to update every index that references that table. If you've indexed 10 columns and you're running a notify-all job that inserts 50,000 notification rows, the database is doing 500,000 index writes instead of 50,000. That slows down writes significantly.

Indexes also take up disk space. Depending on column size, indexing everything can easily triple or quadruple the storage the table uses.

And indexes on low-cardinality columns — like a boolean — are nearly useless on their own. `isRead` has exactly two values. An index on it doesn't meaningfully narrow down the rows the database has to look at. The query planner will often just ignore it and do a full scan anyway.

The right approach is to create indexes for the specific query patterns you know will happen frequently. In this case, students loading their unread notifications is the most common read pattern, so that's what gets indexed.

---

## Finding Students Who Got Placement Notifications in the Last 7 Days

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL '7 days';
```

To make this fast, especially as the notifications table grows:

```sql
CREATE INDEX idx_notifications_type_created
ON notifications (notificationType, createdAt DESC);
```

With this index, the database goes straight to all `'Placement'` rows and only looks at those created in the last 7 days. It doesn't touch any other notification types. At 5 million rows this goes from a slow full scan to a very fast index range scan.

If you want to join back to the subscribers table to get names and emails as well:

```sql
SELECT DISTINCT s.studentID, s.name, s.email
FROM notifications n
JOIN subscribers s ON s.id = n.studentID
WHERE n.notificationType = 'Placement'
  AND n.createdAt >= NOW() - INTERVAL '7 days';
```
