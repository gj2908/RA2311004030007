/**
 * priorityInboxController.js
 * Express route handler for the Stage 6 Priority Inbox endpoint.
 *
 * Candidate: Gaurang Jadoun | RA2311004030007 | gj6117@srmist.edu.in
 */

const { getPriorityInbox } = require("./priorityInboxService");
const { Log } = require("../../logging_middleware/src/logger");

/**
 * GET /evaluation-service/notifications/priority-inbox
 *
 * Optional query param: ?limit=10 (defaults to 10)
 *
 * Fetches all notifications from the evaluation server and returns
 * the top N by combined type-weight + recency score.
 */
async function priorityInbox(req, res) {
  const limit = parseInt(req.query.limit, 10) || 10;
  Log("backend", "info", "controller", `GET /notifications/priority-inbox - limit=${limit}`);

  try {
    const result = await getPriorityInbox(limit);
    Log(
      "backend",
      "info",
      "controller",
      `GET /notifications/priority-inbox - success: showing=${result.showing}, total=${result.total}`
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    Log("backend", "error", "controller", `GET /notifications/priority-inbox failed: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { priorityInbox };
