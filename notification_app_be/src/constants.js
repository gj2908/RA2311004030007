/**
 * constants.js
 * Application-wide constants for the notification service.
 */

const NOTIFICATION_TYPES = {
  EMAIL: "email",
  SMS: "sms",
  PUSH: "push",
  IN_APP: "in_app",
};

const NOTIFICATION_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  FAILED: "failed",
  READ: "read",
};

const NOTIFICATION_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

module.exports = { NOTIFICATION_TYPES, NOTIFICATION_STATUS, NOTIFICATION_PRIORITY };
