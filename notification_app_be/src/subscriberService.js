/**
 * subscriberService.js
 * Business logic for subscriber management.
 */

const db = require("./db");
const { Log } = require("../../logging_middleware/src/logger");

function addSubscriber(data) {
  const { name, email } = data;
  if (!name || !email) {
    Log("backend", "warn", "service", "Add subscriber failed - name and email are required");
    return { success: false, error: "name and email are required." };
  }

  const existing = db.getAllSubscribers().find((s) => s.email === email);
  if (existing) {
    Log("backend", "warn", "service", `Subscriber already exists: email=${email}`);
    return { success: false, error: `Subscriber with email ${email} already exists.` };
  }

  const subscriber = db.createSubscriber(data);
  Log("backend", "info", "service", `Subscriber added: id=${subscriber.id}, email=${email}`);
  return { success: true, data: subscriber };
}

function getSubscriber(id) {
  const subscriber = db.getSubscriberById(id);
  if (!subscriber) return { success: false, error: `Subscriber ${id} not found.` };
  return { success: true, data: subscriber };
}

function listSubscribers() {
  const subscribers = db.getAllSubscribers();
  Log("backend", "info", "service", `Listed all subscribers: count=${subscribers.length}`);
  return { success: true, data: subscribers };
}

function modifySubscriber(id, updates) {
  delete updates.id;
  delete updates.createdAt;
  const updated = db.updateSubscriber(id, updates);
  if (!updated) return { success: false, error: `Subscriber ${id} not found.` };
  Log("backend", "info", "service", `Subscriber updated: id=${id}`);
  return { success: true, data: updated };
}

function removeSubscriber(id) {
  const deleted = db.deleteSubscriber(id);
  if (!deleted) return { success: false, error: `Subscriber ${id} not found.` };
  Log("backend", "info", "service", `Subscriber removed: id=${id}`);
  return { success: true };
}

module.exports = { addSubscriber, getSubscriber, listSubscribers, modifySubscriber, removeSubscriber };
