/**
 * logger.js
 * Core reusable logging module.
 *
 * Exposes the Log(stack, level, package, message) function which:
 *  - Validates all input fields against allowed values
 *  - Posts the log entry to the evaluation server's protected Log API
 *  - Uses the Bearer token from authService for authorization
 */

require("dotenv").config();
const axios = require("axios");
const { getToken } = require("./authService");
const {
  VALID_STACKS,
  VALID_LEVELS,
  ALL_BACKEND_PACKAGES,
  ALL_FRONTEND_PACKAGES,
} = require("./constants");

const LOG_API_URL = `${process.env.EVAL_SERVER_BASE_URL}/logs`;

/**
 * Validates the provided log parameters against the server constraints.
 * All values must be lowercase.
 *
 * @param {string} stack   - "backend" or "frontend"
 * @param {string} level   - "debug" | "info" | "warn" | "error" | "fatal"
 * @param {string} pkg     - Valid package name for the given stack
 * @param {string} message - Descriptive log message
 * @returns {{ valid: boolean, error?: string }}
 */
function validateLogParams(stack, level, pkg, message) {
  if (!VALID_STACKS.includes(stack)) {
    return {
      valid: false,
      error: `Invalid stack "${stack}". Must be one of: ${VALID_STACKS.join(", ")}`,
    };
  }

  if (!VALID_LEVELS.includes(level)) {
    return {
      valid: false,
      error: `Invalid level "${level}". Must be one of: ${VALID_LEVELS.join(", ")}`,
    };
  }

  const allowedPackages =
    stack === "backend" ? ALL_BACKEND_PACKAGES : ALL_FRONTEND_PACKAGES;

  if (!allowedPackages.includes(pkg)) {
    return {
      valid: false,
      error: `Invalid package "${pkg}" for stack "${stack}". Allowed: ${allowedPackages.join(", ")}`,
    };
  }

  if (!message || typeof message !== "string" || message.trim() === "") {
    return { valid: false, error: "Message must be a non-empty string." };
  }

  return { valid: true };
}

/**
 * Sends a log entry to the evaluation server.
 *
 * Usage:
 *   Log("backend", "error", "handler", "Received string, expected bool")
 *   Log("backend", "fatal", "db", "Critical database connection failure.")
 *
 * @param {string} stack   - "backend" or "frontend"
 * @param {string} level   - Log severity level
 * @param {string} pkg     - Source package within the application
 * @param {string} message - Descriptive context about the event
 * @returns {Promise<object|null>} Server response or null on failure
 */
async function Log(stack, level, pkg, message) {
  // Validate inputs before making any network call
  const validation = validateLogParams(stack, level, pkg, message);
  if (!validation.valid) {
    console.error(`[Logger] Validation failed: ${validation.error}`);
    return null;
  }

  const token = getToken();
  if (!token) {
    console.error(
      "[Logger] No auth token available. Call authenticate() first."
    );
    return null;
  }

  const payload = {
    stack: stack,
    level: level,
    package: pkg,
    message: message,
  };

  try {
    const response = await axios.post(LOG_API_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(
      `[Logger] Log sent -> [${stack}][${level}][${pkg}]: ${message}`
    );
    return response.data;
  } catch (error) {
    const errDetails = error.response?.data || error.message;
    console.error(
      `[Logger] Failed to send log [${stack}][${level}][${pkg}]:`,
      errDetails
    );
    return null;
  }
}

module.exports = { Log, validateLogParams };
