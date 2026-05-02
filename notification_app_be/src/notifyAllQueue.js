/**
 * notifyAllQueue.js
 * In-memory job queue for bulk notification sending.
 *
 * Handles notify-all jobs asynchronously so the HTTP response
 * returns immediately while processing continues in the background.
 * Each job is retried up to 3 times before being marked as failed.
 */

const { Log } = require("../../logging_middleware/src/logger");
const db = require("./db");
const { broadcast } = require("./sseManager");

// Simple FIFO job queue
const queue = [];
let isProcessing = false;

// Track results of the most recent notify-all job
let lastJobResult = null;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Simulates sending an email for a given subscriber.
 * In production this would call an actual Email API.
 * Occasionally throws to simulate real-world failures.
 */
async function sendEmail(subscriber, message) {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 5));
  Log(
    "backend",
    "info",
    "service",
    `Email sent to subscriberId=${subscriber.id}, email=${subscriber.email}`
  );
}

/**
 * Saves the notification to the in-memory DB and broadcasts via SSE.
 */
function saveAndPush(subscriber, title, message, priority) {
  const notification = db.createNotification({
    subscriberId: subscriber.id,
    type: "in_app",
    priority: priority || "high",
    title,
    message,
  });
  const sent = db.updateNotification(notification.id, {
    status: "sent",
    sentAt: new Date().toISOString(),
  });
  broadcast(subscriber.id, sent);
  return sent;
}

/**
 * Processes a single subscriber notification with retry logic.
 * DB save happens first and is independent of email delivery.
 * If email fails after MAX_RETRIES, the notification still exists in DB.
 *
 * @param {object} subscriber
 * @param {string} title
 * @param {string} message
 * @param {string} priority
 * @returns {{ success: boolean, subscriberId: string, error?: string }}
 */
async function processOne(subscriber, title, message, priority) {
  // Step 1: Save to DB and push via SSE — always happens first, independently
  let saved;
  try {
    saved = saveAndPush(subscriber, title, message, priority);
    Log("backend", "info", "service", `Notification saved and SSE pushed: subscriberId=${subscriber.id}`);
  } catch (err) {
    Log("backend", "error", "db", `Failed to save notification for subscriberId=${subscriber.id}: ${err.message}`);
    return { success: false, subscriberId: subscriber.id, error: `DB save failed: ${err.message}` };
  }

  // Step 2: Send email with retry — separate from DB save
  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    try {
      await sendEmail(subscriber, message);
      return { success: true, subscriberId: subscriber.id };
    } catch (err) {
      attempt++;
      Log(
        "backend",
        "warn",
        "service",
        `Email attempt ${attempt}/${MAX_RETRIES} failed for subscriberId=${subscriber.id}: ${err.message}`
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  // Email failed after all retries — notification is still saved in DB
  Log(
    "backend",
    "error",
    "service",
    `Email delivery permanently failed after ${MAX_RETRIES} attempts for subscriberId=${subscriber.id}. Notification id=${saved?.id} exists in DB.`
  );
  return {
    success: false,
    subscriberId: subscriber.id,
    error: `Email delivery failed after ${MAX_RETRIES} retries. Notification saved in DB (id=${saved?.id}).`,
  };
}

/**
 * Processes the next job in the queue.
 * Jobs are processed one batch at a time using Promise.allSettled
 * so individual failures do not stop other notifications.
 */
async function processNext() {
  if (queue.length === 0) {
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const job = queue.shift();
  const { jobId, subscriberIds, title, message, priority, resolve } = job;

  Log("backend", "info", "service", `Processing notify-all job ${jobId}: ${subscriberIds.length} subscribers`);

  const results = { success: [], failed: [] };

  // Process in batches of 100 to avoid overwhelming the event loop
  const BATCH_SIZE = 100;
  for (let i = 0; i < subscriberIds.length; i += BATCH_SIZE) {
    const batch = subscriberIds.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.allSettled(
      batch.map((id) => {
        const subscriber = db.getSubscriberById(id);
        if (!subscriber) {
          Log("backend", "warn", "service", `notify-all: subscriber not found id=${id}`);
          return Promise.resolve({ success: false, subscriberId: id, error: "Subscriber not found" });
        }
        return processOne(subscriber, title, message, priority);
      })
    );

    batchResults.forEach((result) => {
      const val = result.status === "fulfilled" ? result.value : { success: false, error: result.reason?.message };
      if (val.success) {
        results.success.push(val.subscriberId);
      } else {
        results.failed.push({ subscriberId: val.subscriberId, error: val.error });
      }
    });

    Log(
      "backend",
      "info",
      "service",
      `notify-all job ${jobId}: processed batch ${Math.floor(i / BATCH_SIZE) + 1}, progress=${Math.min(i + BATCH_SIZE, subscriberIds.length)}/${subscriberIds.length}`
    );
  }

  lastJobResult = {
    jobId,
    totalRequested: subscriberIds.length,
    totalSuccess: results.success.length,
    totalFailed: results.failed.length,
    failed: results.failed,
    completedAt: new Date().toISOString(),
  };

  Log(
    "backend",
    "info",
    "service",
    `notify-all job ${jobId} complete: success=${results.success.length}, failed=${results.failed.length}`
  );

  resolve(lastJobResult);
  setImmediate(processNext);
}

/**
 * Enqueues a notify-all job and starts processing if idle.
 *
 * @param {string[]} subscriberIds
 * @param {string} title
 * @param {string} message
 * @param {string} priority
 * @returns {Promise<object>} Job result
 */
function enqueue(subscriberIds, title, message, priority) {
  return new Promise((resolve) => {
    const jobId = `job_${Date.now()}`;
    Log("backend", "info", "service", `notify-all job enqueued: jobId=${jobId}, count=${subscriberIds.length}`);
    queue.push({ jobId, subscriberIds, title, message, priority, resolve });
    if (!isProcessing) {
      setImmediate(processNext);
    }
  });
}

/**
 * Returns the result of the last completed notify-all job.
 */
function getLastJobResult() {
  return lastJobResult;
}

module.exports = { enqueue, getLastJobResult };
