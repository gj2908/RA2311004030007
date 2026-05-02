/**
 * scheduleService.js
 * Business logic for vehicle maintenance schedule operations.
 */

const db = require("./db");
const { Log } = require("../../logging_middleware/src/logger");
const { MAINTENANCE_TYPES, SCHEDULE_STATUS } = require("./constants");

const VALID_MAINTENANCE_TYPES = Object.values(MAINTENANCE_TYPES);
const VALID_STATUSES = Object.values(SCHEDULE_STATUS);

/**
 * Creates a maintenance schedule for a vehicle.
 * @param {object} data - { vehicleId, maintenanceType, scheduledDate, notes }
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function createSchedule(data) {
  const { vehicleId, maintenanceType, scheduledDate, notes } = data;

  if (!vehicleId || !maintenanceType || !scheduledDate) {
    Log("backend", "warn", "service", "Create schedule failed - missing required fields");
    return { success: false, error: "vehicleId, maintenanceType, and scheduledDate are required." };
  }

  if (!VALID_MAINTENANCE_TYPES.includes(maintenanceType)) {
    Log("backend", "warn", "service", `Invalid maintenanceType: ${maintenanceType}`);
    return {
      success: false,
      error: `Invalid maintenanceType. Must be one of: ${VALID_MAINTENANCE_TYPES.join(", ")}`,
    };
  }

  // Validate vehicle exists
  const vehicle = db.getVehicleById(vehicleId);
  if (!vehicle) {
    Log("backend", "warn", "service", `Schedule creation failed - vehicle not found: ${vehicleId}`);
    return { success: false, error: `Vehicle with id ${vehicleId} not found.` };
  }

  // Validate scheduledDate is a valid future date
  const date = new Date(scheduledDate);
  if (isNaN(date.getTime())) {
    Log("backend", "warn", "service", `Invalid scheduledDate format: ${scheduledDate}`);
    return { success: false, error: "scheduledDate must be a valid ISO date string." };
  }

  const schedule = db.createSchedule({ vehicleId, maintenanceType, scheduledDate, notes });
  Log("backend", "info", "service", `Maintenance schedule created: ${schedule.id} for vehicle ${vehicleId}`);
  return { success: true, data: schedule };
}

/**
 * Retrieves a schedule by ID.
 * @param {string} id
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function getSchedule(id) {
  const schedule = db.getScheduleById(id);
  if (!schedule) {
    return { success: false, error: `Schedule with id ${id} not found.` };
  }
  return { success: true, data: schedule };
}

/**
 * Lists all schedules, optionally filtered by vehicleId.
 * @param {string} [vehicleId]
 * @returns {{ success: boolean, data: object[] }}
 */
function listSchedules(vehicleId) {
  const schedules = db.getAllSchedules(vehicleId);
  Log("backend", "info", "service", `Listed schedules: count=${schedules.length}${vehicleId ? `, vehicleId=${vehicleId}` : ""}`);
  return { success: true, data: schedules };
}

/**
 * Updates the status or details of an existing schedule.
 * @param {string} id
 * @param {object} updates
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function updateSchedule(id, updates) {
  delete updates.id;
  delete updates.vehicleId;
  delete updates.createdAt;

  if (updates.status && !VALID_STATUSES.includes(updates.status)) {
    Log("backend", "warn", "service", `Invalid status in update: ${updates.status}`);
    return {
      success: false,
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
    };
  }

  const updated = db.updateSchedule(id, updates);
  if (!updated) {
    return { success: false, error: `Schedule with id ${id} not found.` };
  }
  Log("backend", "info", "service", `Schedule updated: ${id}`);
  return { success: true, data: updated };
}

/**
 * Deletes a schedule by ID.
 * @param {string} id
 * @returns {{ success: boolean, error?: string }}
 */
function deleteSchedule(id) {
  const deleted = db.deleteSchedule(id);
  if (!deleted) {
    return { success: false, error: `Schedule with id ${id} not found.` };
  }
  Log("backend", "info", "service", `Schedule deleted: ${id}`);
  return { success: true };
}

module.exports = { createSchedule, getSchedule, listSchedules, updateSchedule, deleteSchedule };
