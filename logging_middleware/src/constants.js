/**
 * constants.js
 * Defines valid values for stack, level, and package fields
 * as specified by the evaluation server constraints.
 */

const VALID_STACKS = ["backend", "frontend"];

const VALID_LEVELS = ["debug", "info", "warn", "error", "fatal"];

// Packages valid only for backend applications
const BACKEND_PACKAGES = [
  "cache",
  "controller",
  "cron_job",
  "db",
  "domain",
  "handler",
  "repository",
  "route",
  "service",
];

// Packages valid only for frontend applications
const FRONTEND_PACKAGES = [
  "api",
  "component",
  "hook",
  "page",
  "state",
  "style",
];

// Packages valid for both backend and frontend
const SHARED_PACKAGES = ["auth", "config", "middleware", "utils"];

const ALL_BACKEND_PACKAGES = [...BACKEND_PACKAGES, ...SHARED_PACKAGES];
const ALL_FRONTEND_PACKAGES = [...FRONTEND_PACKAGES, ...SHARED_PACKAGES];

module.exports = {
  VALID_STACKS,
  VALID_LEVELS,
  BACKEND_PACKAGES,
  FRONTEND_PACKAGES,
  SHARED_PACKAGES,
  ALL_BACKEND_PACKAGES,
  ALL_FRONTEND_PACKAGES,
};
