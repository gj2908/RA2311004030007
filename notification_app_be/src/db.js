/**
 * db.js
 * In-memory data store for notifications and subscribers.
 */

const { v4: uuidv4 } = require("uuid");
const { Log } = require("../../logging_middleware/src/logger");

const notifications = new Map();
const subscribers = new Map();

// ─── Subscriber Operations ────────────────────────────────────────────────────

function createSubscriber(data) {
  const id = uuidv4();
  const subscriber = {
    id,
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    preferences: data.preferences || ["in_app"],
    createdAt: new Date().toISOString(),
  };
  subscribers.set(id, subscriber);
  Log("backend", "info", "db", `Subscriber created: id=${id}, email=${subscriber.email}`);
  return subscriber;
}

function getSubscriberById(id) {
  const subscriber = subscribers.get(id) || null;
  if (!subscriber) Log("backend", "warn", "db", `Subscriber not found: id=${id}`);
  return subscriber;
}

function getAllSubscribers() {
  return Array.from(subscribers.values());
}

function updateSubscriber(id, updates) {
  const subscriber = subscribers.get(id);
  if (!subscriber) {
    Log("backend", "warn", "db", `Subscriber update failed - not found: id=${id}`);
    return null;
  }
  const updated = { ...subscriber, ...updates, updatedAt: new Date().toISOString() };
  subscribers.set(id, updated);
  Log("backend", "info", "db", `Subscriber updated: id=${id}`);
  return updated;
}

function deleteSubscriber(id) {
  const exists = subscribers.has(id);
  if (exists) {
    subscribers.delete(id);
    Log("backend", "info", "db", `Subscriber deleted: id=${id}`);
  } else {
    Log("backend", "warn", "db", `Subscriber delete failed - not found: id=${id}`);
  }
  return exists;
}

// ─── Notification Operations ──────────────────────────────────────────────────

function createNotification(data) {
  const id = uuidv4();
  const notification = {
    id,
    subscriberId: data.subscriberId,
    type: data.type,
    priority: data.priority || "medium",
    title: data.title,
    message: data.message,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  notifications.set(id, notification);
  Log("backend", "info", "db", `Notification created: id=${id}, type=${notification.type}, priority=${notification.priority}`);
  return notification;
}

function getNotificationById(id) {
  const notification = notifications.get(id) || null;
  if (!notification) Log("backend", "warn", "db", `Notification not found: id=${id}`);
  return notification;
}

function getAllNotifications(subscriberId) {
  const all = Array.from(notifications.values());
  if (subscriberId) return all.filter((n) => n.subscriberId === subscriberId);
  return all;
}

function updateNotification(id, updates) {
  const notification = notifications.get(id);
  if (!notification) {
    Log("backend", "warn", "db", `Notification update failed - not found: id=${id}`);
    return null;
  }
  const updated = { ...notification, ...updates, updatedAt: new Date().toISOString() };
  notifications.set(id, updated);
  Log("backend", "info", "db", `Notification updated: id=${id}, status=${updated.status}`);
  return updated;
}

function deleteNotification(id) {
  const exists = notifications.has(id);
  if (exists) {
    notifications.delete(id);
    Log("backend", "info", "db", `Notification deleted: id=${id}`);
  } else {
    Log("backend", "warn", "db", `Notification delete failed - not found: id=${id}`);
  }
  return exists;
}

module.exports = {
  createSubscriber, getSubscriberById, getAllSubscribers, updateSubscriber, deleteSubscriber,
  createNotification, getNotificationById, getAllNotifications, updateNotification, deleteNotification,
};
