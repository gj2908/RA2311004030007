/**
 * notifyAllController.js
 * Handles the POST /evaluation-service/notifications/notify-all endpoint.
 *
 * Accepts a list of subscriberIds plus a title and message,
 * enqueues the job, and returns immediately. Processing happens
 * asynchronously in the background via notifyAllQueue.
 */

const { enqueue, getLastJobResult } = require("./notifyAllQueue");
const db = require("./db");
const { Log } = require("../../logging_middleware/src/logger");

/**
 * POST /evaluation-service/notifications/notify-all
 *
 * Body:
 *   subscriberIds: string[] - list of subscriber UUIDs, or "all" to target all subscribers
 *   title:         string   - notification title
 *   message:       string   - notification message body
 *   priority:      string   - optional, defaults to "high"
 */
async function notifyAll(req, res) {
  const { subscriberIds, title, message, priority } = req.body;

  if (!title || !message) {
    Log("backend", "warn", "controller", "POST /notify-all failed: missing title or message");
    return res.status(400).json({ success: false, error: "title and message are required." });
  }

  // "all" keyword targets every registered subscriber
  let targetIds = subscriberIds;
  if (subscriberIds === "all" || !subscriberIds) {
    targetIds = db.getAllSubscribers().map((s) => s.id);
    Log("backend", "info", "controller", `POST /notify-all: targeting all ${targetIds.length} subscribers`);
  }

  if (!Array.isArray(targetIds) || targetIds.length === 0) {
    Log("backend", "warn", "controller", "POST /notify-all failed: no valid subscriber IDs");
    return res.status(400).json({ success: false, error: "subscriberIds must be a non-empty array or 'all'." });
  }

  Log(
    "backend",
    "info",
    "controller",
    `POST /notify-all accepted: ${targetIds.length} subscribers, title="${title}"`
  );

  // Return 202 immediately — processing continues in background
  res.status(202).json({
    success: true,
    message: `Notify-all job accepted for ${targetIds.length} subscribers. Processing in background.`,
    total: targetIds.length,
  });

  // Process asynchronously after response is sent
  try {
    const result = await enqueue(targetIds, title, message, priority || "high");
    Log(
      "backend",
      "info",
      "controller",
      `notify-all complete: success=${result.totalSuccess}, failed=${result.totalFailed}`
    );
  } catch (err) {
    Log("backend", "error", "controller", `notify-all job error: ${err.message}`);
  }
}

/**
 * GET /evaluation-service/notifications/notify-all/status
 * Returns the result of the most recently completed notify-all job.
 */
function notifyAllStatus(req, res) {
  Log("backend", "info", "controller", "GET /notify-all/status");
  const result = getLastJobResult();
  if (!result) {
    return res.status(200).json({ success: true, message: "No notify-all job has been run yet." });
  }
  return res.status(200).json({ success: true, data: result });
}

module.exports = { notifyAll, notifyAllStatus };
