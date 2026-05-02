/**
 * index.js
 * Entry point for the Notification Application backend service.
 */

require("dotenv").config();
const express = require("express");
const { setToken } = require("../../logging_middleware/src/authService");
const { Log } = require("../../logging_middleware/src/logger");
const { httpLoggerMiddleware, errorLoggerMiddleware } = require("../../logging_middleware/src/httpLoggerMiddleware");
const routes = require("./routes");

const PORT = process.env.PORT || 3002;

// Load auth token for logging middleware
if (process.env.AUTH_TOKEN) {
  setToken(process.env.AUTH_TOKEN);
  Log("backend", "info", "config", "Auth token loaded for notification service logging middleware");
} else {
  console.warn("[Warning] AUTH_TOKEN not set in .env - logging disabled. Run logging_middleware/src/setup.js first.");
}

const app = express();

app.use(express.json());
app.use(httpLoggerMiddleware);
app.use("/evaluation-service", routes);

// 404 handler
app.use((req, res) => {
  Log("backend", "warn", "route", `404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, error: "Route not found." });
});

app.use(errorLoggerMiddleware);

// Global error handler
app.use((err, req, res, next) => {
  Log("backend", "fatal", "handler", `Unhandled server error: ${err.message}`);
  res.status(500).json({ success: false, error: "Internal server error." });
});

app.listen(PORT, () => {
  Log("backend", "info", "service", `Notification Service running on port ${PORT}`);
  console.log(`Notification Service running on http://localhost:${PORT}`);
});

module.exports = app;
