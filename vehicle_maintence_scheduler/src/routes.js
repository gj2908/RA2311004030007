/**
 * routes.js
 * Registers all Express routes for the vehicle maintenance scheduler.
 */

const express = require("express");
const router = express.Router();
const vehicleController = require("./vehicleController");
const scheduleController = require("./scheduleController");
const { Log } = require("../../logging_middleware/src/logger");

// Health check
router.get("/health", (req, res) => {
  Log("backend", "info", "route", "GET /health - service is running");
  res.status(200).json({ success: true, message: "Vehicle Maintenance Scheduler is running." });
});

// ─── Vehicle Routes ────────────────────────────────────────────────────────
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

Log("backend", "info", "route", "All vehicle and schedule routes registered");

module.exports = router;
