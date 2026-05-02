/**
 * index.js
 * Entry point for the Vehicle Maintenance Scheduler service.
 *
 * Initialises:
 *  - Logging middleware (auth token must be set in .env)
 *  - Express app with JSON body parsing
 *  - All API routes
 *  - Maintenance cron job
 */

require("dotenv").config();
const express = require("express");
const { setToken } = require("../../logging_middleware/src/authService");
const { Log } = require("../../logging_middleware/src/logger");
const { httpLoggerMiddleware, errorLoggerMiddleware } = require("../../logging_middleware/src/httpLoggerMiddleware");
const routes = require("./routes");
const { startMaintenanceCron } = require("./maintenanceCron");

const PORT = process.env.PORT || 3001;

// Load auth token for logging middleware
if (process.env.AUTH_TOKEN) {
  setToken(process.env.AUTH_TOKEN);
  Log("backend", "info", "config", "Auth token loaded from environment for logging middleware");
} else {
  console.warn("[Warning] AUTH_TOKEN not set in .env - Log calls will be skipped. Run logging_middleware/src/setup.js first.");
}

const app = express();

// Parse incoming JSON bodies
app.use(express.json());

// Attach HTTP request/response logger
app.use(httpLoggerMiddleware);

// Register all API routes under /api
app.use("/evaluation-service", routes);

// Handle 404 for unregistered routes
app.use((req, res) => {
  Log("backend", "warn", "route", `404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ success: false, error: "Route not found." });
});

// Attach error logger (must be after all routes)
app.use(errorLoggerMiddleware);

// Global error handler
app.use((err, req, res, next) => {
  Log("backend", "fatal", "handler", `Unhandled server error: ${err.message}`);
  res.status(500).json({ success: false, error: "Internal server error." });
});

// Start server
app.listen(PORT, () => {
  Log("backend", "info", "service", `Vehicle Maintenance Scheduler running on port ${PORT}`);
  console.log(`Vehicle Maintenance Scheduler running on http://localhost:${PORT}`);

  // Start the maintenance cron job
  startMaintenanceCron();
});

module.exports = app;
