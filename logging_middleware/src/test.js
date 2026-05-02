/**
 * test.js
 * Demonstrates the Log function with various stack/level/package combinations.
 * Requires AUTH_TOKEN to be set in .env before running.
 *
 * Run: node src/test.js
 */

require("dotenv").config();
const { Log } = require("./logger");
const { setToken } = require("./authService");

async function runTests() {
  // Load token from .env into memory
  const token = process.env.AUTH_TOKEN;
  if (!token) {
    console.error(
      "AUTH_TOKEN not set in .env. Run `node src/setup.js` first."
    );
    process.exit(1);
  }
  setToken(token);

  console.log("--- Running Log Function Tests ---\n");

  // Test 1: handler error (from problem statement example)
  await Log("backend", "error", "handler", "received string, expected bool");

  // Test 2: db fatal (from problem statement example)
  await Log("backend", "fatal", "db", "Critical database connection failure.");

  // Test 3: info level - service startup
  await Log("backend", "info", "service", "VehicleSchedulerService initialized successfully.");

  // Test 4: debug level - cache lookup
  await Log("backend", "debug", "cache", "Cache miss for key: vehicle_schedule_123");

  // Test 5: warn level - controller
  await Log("backend", "warn", "controller", "Request payload missing optional field: notes");

  // Test 6: route info
  await Log("backend", "info", "route", "POST /schedule registered successfully");

  // Test 7: repository debug
  await Log("backend", "debug", "repository", "Executing query: SELECT * FROM vehicles WHERE status=active");

  // Test 8: auth info
  await Log("backend", "info", "auth", "User authenticated successfully via Bearer token");

  // Test 9: config warn
  await Log("backend", "warn", "config", "Environment variable DB_POOL_SIZE not set, defaulting to 5");

  // Test 10: utils info
  await Log("backend", "info", "utils", "Date formatter utility loaded");

  // Test 11: cron_job info
  await Log("backend", "info", "cron_job", "Maintenance scheduler cron job started at interval 24h");

  // Test 12: domain error
  await Log("backend", "error", "domain", "Invalid vehicle ID format encountered in domain layer");

  console.log("\n--- Tests Complete ---");
}

runTests();
