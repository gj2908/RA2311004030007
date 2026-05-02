# Stage 5

## Looking at the Original Pseudocode

```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # calls Email API
        save_to_db(student_id, message)
        push_to_app(student_id, message)  # uses SSE from Stage 1
```

At first glance this looks fine but once you think about 50,000 students it falls apart pretty fast.

---

## What's Wrong With It

**It's synchronous and blocking.** The loop runs one student at a time. Each iteration makes three separate I/O calls — email API, database write, SSE push. If each takes even 50ms on average, 50,000 students is 50,000 * 150ms = 7,500 seconds. That's over two hours for a single button click. The HTTP request would time out in seconds and the HR would have no idea what happened.

**There's no error handling.** The logs show the email API failed for 200 students midway through. In this pseudocode, what happens? Nothing. The loop just stopped or silently moved on. There's no record of which students failed, no retry, and no alert. Those 200 students are just quietly missed.

**Email and DB save are coupled in the wrong order.** In the code above, email is sent before saving to the database. If `send_email` succeeds but `save_to_db` throws an error, the student got an email but there's no notification in the database — the frontend shows nothing. The ordering is backwards and the operations are too tightly coupled.

**No batching.** Calling an external email API 50,000 times in a tight loop is going to get the server rate-limited or banned. Most email providers (SendGrid, SES, etc.) have batch endpoints that handle hundreds of recipients per call.

**No way to track progress or retry.** Once you kick off this function, you have no idea how many succeeded, how many failed, or whether it's even still running. If the server restarts mid-send, everything is lost.

---

## What Happened to the 200 Failed Students

With the original code, they're just gone. The email API returned an error for each of them but the code didn't catch it, didn't log it, didn't retry, and didn't mark their notifications as failed in the database. If there's no record, you can't even identify who they are to manually resend.

The right approach: save to the database first always, then attempt the email. If the email fails, the notification row still exists with `status = 'failed'`. You can query all failed notifications and resend specifically to those students without running the whole job again.

---

## Should DB Save and Email Happen Together?

No. They're two completely different concerns and should be treated independently.

The database is the source of truth. Whether or not the email was delivered, the notification should exist in the database. A student who didn't get an email can still open the app and see their notifications. If you make DB save and email atomic — meaning both succeed or neither does — you lose this safety net. A transient email API hiccup would roll back the database entry and the student has nothing.

The correct model: save to DB first (this is fast and reliable), then attempt email delivery as a separate async step with its own retry logic. Failed email delivery is a recoverable error. Missing data in the DB is not.

---

## Redesigned Approach

The core idea is to move from a synchronous loop to a job queue. The HTTP endpoint returns immediately with a 202 Accepted response. A background worker picks up the job and processes students in parallel batches. Each student's notification is saved to DB first, then email is attempted with up to 3 retries. Failed deliveries are logged and tracked so they can be retried independently.

This is implemented in `notifyAllQueue.js` and `notifyAllController.js`.

---

## Revised Pseudocode

```
function notify_all(subscriber_ids: array, title: string, message: string):
    job_id = generate_job_id()
    enqueue_job(job_id, subscriber_ids, title, message)
    return HTTP 202 Accepted { job_id, total: len(subscriber_ids) }

--

function process_job(job):
    results = { success: [], failed: [] }

    for batch in chunk(job.subscriber_ids, size=100):
        parallel_results = parallel_execute(batch, process_one_subscriber)
        append parallel_results to results

    log_summary(results)
    store results for status endpoint

--

function process_one_subscriber(subscriber_id, title, message):
    # Step 1: Save to DB first — always, independently of email
    notification = save_to_db(subscriber_id, title, message, status="sent")
    push_to_app(subscriber_id, notification)  # SSE push, non-blocking

    # Step 2: Send email with retry — separate from DB save
    attempts = 0
    while attempts < MAX_RETRIES:
        try:
            send_email(subscriber.email, title, message)
            return { success: true, subscriber_id }
        catch EmailAPIError:
            attempts += 1
            wait(RETRY_DELAY * attempts)  # exponential backoff

    # Email failed permanently — notification still exists in DB
    log_error("Email failed after MAX_RETRIES for subscriber_id=" + subscriber_id)
    update_db(notification.id, email_status="failed")
    return { success: false, subscriber_id, error: "email delivery failed" }
```

---

## Key Differences From Original

| | Original | Redesigned |
|---|---|---|
| HTTP response | Blocks until all 50,000 done | Returns 202 immediately |
| Processing | Serial, one student at a time | Parallel batches of 100 |
| Error handling | None | Per-student retry with backoff |
| DB save order | After email | Before email, always |
| Failed students | Lost silently | Tracked and queryable |
| Progress visibility | None | Status endpoint available |
| Server crash mid-job | All progress lost | DB saves persist |

---

## API Endpoints Added

```
POST /evaluation-service/notifications/notify-all
Body: { "subscriberIds": ["id1", "id2", ...] or "all", "title": "...", "message": "...", "priority": "high" }
Response 202: { "success": true, "message": "Job accepted for 50000 subscribers", "total": 50000 }

GET /evaluation-service/notifications/notify-all/status
Response 200: { "success": true, "data": { "jobId": "...", "totalSuccess": 49800, "totalFailed": 200, "failed": [...] } }
```

Setting `subscriberIds` to `"all"` automatically targets every registered subscriber, which is what the HR "Notify All" button would use.
