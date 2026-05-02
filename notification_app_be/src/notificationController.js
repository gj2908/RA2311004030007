/**
 * notificationController.js
 * Express route handlers for notification operations.
 */

const notificationService = require("./notificationService");
const { Log } = require("../../logging_middleware/src/logger");

function send(req, res) {
  Log("backend", "info", "controller", `POST /notifications - body: ${JSON.stringify(req.body)}`);
  const result = notificationService.sendNotification(req.body);
  if (!result.success) {
    Log("backend", "warn", "controller", `POST /notifications failed: ${result.error}`);
    return res.status(400).json({ success: false, error: result.error });
  }
  return res.status(201).json({ success: true, data: result.data });
}

function getAll(req, res) {
  const { subscriberId } = req.query;
  Log("backend", "info", "controller", `GET /notifications${subscriberId ? `?subscriberId=${subscriberId}` : ""}`);
  const result = notificationService.listNotifications(subscriberId);
  return res.status(200).json({ success: true, data: result.data });
}

function getById(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `GET /notifications/${id}`);
  const result = notificationService.getNotification(id);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, data: result.data });
}

function markRead(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `PATCH /notifications/${id}/read`);
  const result = notificationService.markAsRead(id);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, data: result.data });
}

function remove(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `DELETE /notifications/${id}`);
  const result = notificationService.deleteNotification(id);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, message: "Notification deleted." });
}

module.exports = { send, getAll, getById, markRead, remove };
