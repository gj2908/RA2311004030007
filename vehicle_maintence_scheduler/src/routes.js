/**
 * routes.js
 * Registers all Express routes for the vehicle maintenance scheduler.
 */

const express = require("express");
const router = express.Router();
const vehicleController = require("./vehicleController");
const scheduleController = require("./scheduleController");
const optimizerController = require("./optimizerController");
const { fetchDepots, fetchVehicles } = require("./evalApiService");
const { Log } = require("../../logging_middleware/src/logger");

// ─── Health check ──────────────────────────────────────────────────────────
router.get("/health", (req, res) => {
  Log("backend", "info", "route", "GET /health - service is running");
  res.status(200).json({ success: true, message: "Vehicle Maintenance Scheduler is running." });
});

// ─── Optimizer Route ───────────────────────────────────────────────────────
// GET /api/optimize - Runs knapsack for all depots and returns optimal schedule
router.get("/optimize", optimizerController.optimize);

// ─── Eval Server Passthrough Routes (for inspection / Postman testing) ─────
// GET /api/depots  - Returns raw depots from evaluation server
router.get("/depots", async (req, res) => {
  Log("backend", "info", "route", "GET /depots - fetching from evaluation server");
  try {
    const depots = await fetchDepots();
    res.status(200).json({ success: true, data: depots });
  } catch (err) {
    Log("backend", "error", "route", `GET /depots failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/tasks  - Returns raw vehicle tasks from evaluation server
router.get("/tasks", async (req, res) => {
  Log("backend", "info", "route", "GET /tasks - fetching from evaluation server");
  try {
    const tasks = await fetchVehicles();
    res.status(200).json({ success: true, data: tasks });
  } catch (err) {
    Log("backend", "error", "route", `GET /tasks failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Local Vehicle CRUD Routes ─────────────────────────────────────────────
router.post("/vehicles", vehicleController.createVehicle);
router.get("/vehicles", vehicleController.getAllVehicles);
router.get("/vehicles/:id", vehicleController.getVehicleById);
router.put("/vehicles/:id", vehicleController.updateVehicle);
router.delete("/vehicles/:id", vehicleController.deleteVehicle);

// ─── Schedule Routes ───────────────────────────────────────────────────────
router.post("/schedules", scheduleController.createSchedule);
router.get("/schedules", scheduleController.getAllSchedules);
router.get("/schedules/:id", scheduleController.getScheduleById);
router.put("/schedules/:id", scheduleController.updateSchedule);
router.delete("/schedules/:id", scheduleController.deleteSchedule);

Log("backend", "info", "route", "All vehicle maintenance scheduler routes registered");

module.exports = router;
