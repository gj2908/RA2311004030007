/**
 * sseManager.js
 * Manages Server-Sent Event (SSE) client connections.
 *
 * Maintains a registry of active SSE connections keyed by subscriberId.
 * When a notification is sent to a subscriber, the notification service
 * calls broadcast() to push the event to all connected clients for that subscriber.
 */

const { Log } = require("../../logging_middleware/src/logger");

// Map<subscriberId, Set<res>> - active SSE response streams per subscriber
const clients = new Map();

/**
 * Registers an SSE client connection for a given subscriber.
 * Sets up keep-alive pings and cleans up on disconnect.
 *
 * @param {string} subscriberId
 * @param {object} res - Express response object
 */
function addClient(subscriberId, res) {
  if (!clients.has(subscriberId)) {
    clients.set(subscriberId, new Set());
  }
  clients.get(subscriberId).add(res);

  const total = clients.get(subscriberId).size;
  Log("backend", "info", "service", `SSE client connected: subscriberId=${subscriberId}, total=${total}`);

  // Send initial connection confirmation event
  res.write(`event: connected\ndata: ${JSON.stringify({ subscriberId, message: "SSE connection established" })}\n\n`);

  // Keep-alive ping every 25 seconds to prevent proxy timeouts
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(pingInterval);
    }
  }, 25000);

  // Clean up on client disconnect
  res.on("close", () => {
    clearInterval(pingInterval);
    removeClient(subscriberId, res);
  });
}

/**
 * Removes an SSE client from the registry.
 *
 * @param {string} subscriberId
 * @param {object} res - Express response object
 */
function removeClient(subscriberId, res) {
  const set = clients.get(subscriberId);
  if (!set) return;

  set.delete(res);
  if (set.size === 0) {
    clients.delete(subscriberId);
  }

  Log("backend", "info", "service", `SSE client disconnected: subscriberId=${subscriberId}, remaining=${set.size}`);
}

/**
 * Broadcasts a notification event to all connected SSE clients for a subscriber.
 *
 * @param {string} subscriberId
 * @param {object} notification - The notification object to send
 */
function broadcast(subscriberId, notification) {
  const set = clients.get(subscriberId);
  if (!set || set.size === 0) {
    Log("backend", "info", "service", `SSE broadcast: no active clients for subscriberId=${subscriberId}`);
    return;
  }

  const payload = `event: notification\ndata: ${JSON.stringify(notification)}\n\n`;
  let sent = 0;

  set.forEach((res) => {
    try {
      res.write(payload);
      sent++;
    } catch (err) {
      Log("backend", "warn", "service", `SSE write failed for subscriberId=${subscriberId}: ${err.message}`);
      removeClient(subscriberId, res);
    }
  });

  Log("backend", "info", "service", `SSE broadcast sent to ${sent} client(s) for subscriberId=${subscriberId}, notificationId=${notification.id}`);
}

/**
 * Returns the total number of active SSE connections across all subscribers.
 * @returns {number}
 */
function getActiveConnectionCount() {
  let total = 0;
  clients.forEach((set) => { total += set.size; });
  return total;
}

module.exports = { addClient, removeClient, broadcast, getActiveConnectionCount };
