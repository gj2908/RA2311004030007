/**
 * routes.js
 * Registers all Express routes for the notification application.
 */

const express = require("express");
const router = express.Router();
const notificationController = require("./notificationController");
const subscriberController = require("./subscriberController");
const { notifyAll, notifyAllStatus } = require("./notifyAllController");
const { priorityInbox } = require("./priorityInboxController");
const { addClient, getActiveConnectionCount } = require("./sseManager");
const { Log } = require("../../logging_middleware/src/logger");

// Health check
router.get("/health", (req, res) => {
  Log("backend", "info", "route", "GET /health - notification service is running");
  res.status(200).json({ success: true, message: "Notification Service is running.", activeStreams: getActiveConnectionCount() });
});

// ─── Real-time SSE Stream ──────────────────────────────────────────────────
// GET /api/notifications/stream?subscriberId=<id>
// Opens a persistent SSE connection; server pushes new notifications in real-time
router.get("/notifications/stream", (req, res) => {
  const { subscriberId } = req.query;
  if (!subscriberId) {
    Log("backend", "warn", "route", "GET /notifications/stream - missing subscriberId");
    return res.status(400).json({ success: false, error: "subscriberId query parameter is required." });
  }

  Log("backend", "info", "route", `GET /notifications/stream - subscriberId=${subscriberId}`);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  addClient(subscriberId, res);
});

// ─── Subscriber Routes ─────────────────────────────────────────────────────
router.post("/subscribers", subscriberController.create);
router.get("/subscribers", subscriberController.getAll);
router.get("/subscribers/:id", subscriberController.getById);
router.put("/subscribers/:id", subscriberController.update);
router.delete("/subscribers/:id", subscriberController.remove);

// ─── Notification Routes ───────────────────────────────────────────────────
router.post("/notifications", notificationController.send);
router.get("/notifications", notificationController.getAll);
// These specific sub-routes must come before /:id
router.post("/notifications/notify-all", notifyAll);
router.get("/notifications/notify-all/status", notifyAllStatus);
router.get("/notifications/priority-inbox", priorityInbox);
router.get("/notifications/:id", notificationController.getById);
router.patch("/notifications/:id/read", notificationController.markRead);
router.delete("/notifications/:id", notificationController.remove);

Log("backend", "info", "route", "All notification and subscriber routes registered");

module.exports = router;
