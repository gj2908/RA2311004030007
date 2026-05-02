/**
 * scheduleController.js
 * Express route handlers for maintenance schedule CRUD operations.
 */

const scheduleService = require("./scheduleService");
const { Log } = require("../../logging_middleware/src/logger");

/**
 * POST /schedules
 * Create a new maintenance schedule.
 */
function createSchedule(req, res) {
  Log("backend", "info", "controller", `POST /schedules - body: ${JSON.stringify(req.body)}`);
  const result = scheduleService.createSchedule(req.body);
  if (!result.success) {
    Log("backend", "warn", "controller", `POST /schedules failed: ${result.error}`);
    return res.status(400).json({ success: false, error: result.error });
  }
  return res.status(201).json({ success: true, data: result.data });
}

/**
 * GET /schedules
 * List all schedules. Optionally filter by ?vehicleId=<id>
 */
function getAllSchedules(req, res) {
  const { vehicleId } = req.query;
  Log("backend", "info", "controller", `GET /schedules${vehicleId ? `?vehicleId=${vehicleId}` : ""}`);
  const result = scheduleService.listSchedules(vehicleId);
  return res.status(200).json({ success: true, data: result.data });
}

/**
 * GET /schedules/:id
 * Get a schedule by ID.
 */
function getScheduleById(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `GET /schedules/${id}`);
  const result = scheduleService.getSchedule(id);
  if (!result.success) {
    Log("backend", "warn", "controller", `GET /schedules/${id} not found`);
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, data: result.data });
}

/**
 * PUT /schedules/:id
 * Update a schedule (e.g., change status or reschedule).
 */
function updateSchedule(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `PUT /schedules/${id}`);
  const result = scheduleService.updateSchedule(id, req.body);
  if (!result.success) {
    Log("backend", "warn", "controller", `PUT /schedules/${id} failed: ${result.error}`);
    return res.status(400).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, data: result.data });
}

/**
 * DELETE /schedules/:id
 * Delete a schedule.
 */
function deleteSchedule(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `DELETE /schedules/${id}`);
  const result = scheduleService.deleteSchedule(id);
  if (!result.success) {
    Log("backend", "warn", "controller", `DELETE /schedules/${id} failed: ${result.error}`);
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, message: "Schedule deleted successfully." });
}

module.exports = { createSchedule, getAllSchedules, getScheduleById, updateSchedule, deleteSchedule };
