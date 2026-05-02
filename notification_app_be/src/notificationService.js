/**
 * notificationService.js
 * Business logic for creating and managing notifications.
 */

const db = require("./db");
const { Log } = require("../../logging_middleware/src/logger");
const { NOTIFICATION_TYPES, NOTIFICATION_STATUS, NOTIFICATION_PRIORITY } = require("./constants");
const { broadcast } = require("./sseManager");

const VALID_TYPES = Object.values(NOTIFICATION_TYPES);
const VALID_PRIORITIES = Object.values(NOTIFICATION_PRIORITY);
const VALID_STATUSES = Object.values(NOTIFICATION_STATUS);

/**
 * Sends (creates and queues) a notification to a subscriber.
 * @param {object} data - { subscriberId, type, priority, title, message }
 */
function sendNotification(data) {
  const { subscriberId, type, priority, title, message } = data;

  if (!subscriberId || !type || !title || !message) {
    Log("backend", "warn", "service", "Send notification failed - missing required fields");
    return { success: false, error: "subscriberId, type, title, and message are required." };
  }

  if (!VALID_TYPES.includes(type)) {
    Log("backend", "warn", "service", `Invalid notification type: ${type}`);
    return { success: false, error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` };
  }

  if (priority && !VALID_PRIORITIES.includes(priority)) {
    Log("backend", "warn", "service", `Invalid notification priority: ${priority}`);
    return { success: false, error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}` };
  }

  const subscriber = db.getSubscriberById(subscriberId);
  if (!subscriber) {
    Log("backend", "warn", "service", `Notification failed - subscriber not found: ${subscriberId}`);
    return { success: false, error: `Subscriber with id ${subscriberId} not found.` };
  }

  const notification = db.createNotification({ subscriberId, type, priority, title, message });

  // Simulate dispatch - mark as sent
  const sent = db.updateNotification(notification.id, { status: "sent", sentAt: new Date().toISOString() });
  Log("backend", "info", "service", `Notification dispatched: id=${notification.id}, type=${type}, to=${subscriber.email}`);

  // Push real-time event to any SSE-connected clients for this subscriber
  broadcast(subscriberId, sent);

  return { success: true, data: sent };
}

/**
 * Retrieves a single notification by ID.
 */
function getNotification(id) {
  const notification = db.getNotificationById(id);
  if (!notification) return { success: false, error: `Notification ${id} not found.` };
  return { success: true, data: notification };
}

/**
 * Lists all notifications. Optionally filter by subscriberId.
 */
function listNotifications(subscriberId) {
  const notifications = db.getAllNotifications(subscriberId);
  Log("backend", "info", "service", `Listed notifications: count=${notifications.length}`);
  return { success: true, data: notifications };
}

/**
 * Marks a notification as read.
 */
function markAsRead(id) {
  const notification = db.getNotificationById(id);
  if (!notification) return { success: false, error: `Notification ${id} not found.` };

  const updated = db.updateNotification(id, { status: "read", readAt: new Date().toISOString() });
  Log("backend", "info", "service", `Notification marked as read: id=${id}`);
  return { success: true, data: updated };
}

/**
 * Deletes a notification.
 */
function deleteNotification(id) {
  const deleted = db.deleteNotification(id);
  if (!deleted) return { success: false, error: `Notification ${id} not found.` };
  Log("backend", "info", "service", `Notification deleted: id=${id}`);
  return { success: true };
}

module.exports = { sendNotification, getNotification, listNotifications, markAsRead, deleteNotification };
