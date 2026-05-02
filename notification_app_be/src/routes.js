/**
 * routes.js
 * Registers all Express routes for the notification application.
 */

const express = require("express");
const router = express.Router();
const notificationController = require("./notificationController");
const subscriberController = require("./subscriberController");
const { Log } = require("../../logging_middleware/src/logger");

// Health check
router.get("/health", (req, res) => {
  Log("backend", "info", "route", "GET /health - notification service is running");
  res.status(200).json({ success: true, message: "Notification Service is running." });
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
router.get("/notifications/:id", notificationController.getById);
router.patch("/notifications/:id/read", notificationController.markRead);
router.delete("/notifications/:id", notificationController.remove);

Log("backend", "info", "route", "All notification and subscriber routes registered");

module.exports = router;
