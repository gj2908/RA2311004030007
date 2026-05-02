/**
 * vehicleService.js
 * Business logic for vehicle management operations.
 */

const db = require("./db");
const { Log } = require("../../logging_middleware/src/logger");
const { VEHICLE_STATUS } = require("./constants");

/**
 * Creates a new vehicle after validating required fields.
 * @param {object} data
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function addVehicle(data) {
  const { name, type, registrationNumber, ownerName } = data;

  if (!name || !type || !registrationNumber || !ownerName) {
    Log("backend", "warn", "service", `Add vehicle failed - missing required fields`);
    return { success: false, error: "name, type, registrationNumber, and ownerName are required." };
  }

  // Check for duplicate registration number
  const existing = db.getAllVehicles().find(
    (v) => v.registrationNumber === registrationNumber
  );
  if (existing) {
    Log("backend", "warn", "service", `Duplicate registration number: ${registrationNumber}`);
    return { success: false, error: `Vehicle with registration ${registrationNumber} already exists.` };
  }

  const vehicle = db.createVehicle({ name, type, registrationNumber, ownerName });
  Log("backend", "info", "service", `Vehicle added successfully: ${vehicle.id}`);
  return { success: true, data: vehicle };
}

/**
 * Retrieves a single vehicle by ID.
 * @param {string} id
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function getVehicle(id) {
  const vehicle = db.getVehicleById(id);
  if (!vehicle) {
    return { success: false, error: `Vehicle with id ${id} not found.` };
  }
  return { success: true, data: vehicle };
}

/**
 * Retrieves all vehicles.
 * @returns {{ success: boolean, data: object[] }}
 */
function listVehicles() {
  const vehicles = db.getAllVehicles();
  Log("backend", "info", "service", `Listed all vehicles: count=${vehicles.length}`);
  return { success: true, data: vehicles };
}

/**
 * Updates a vehicle's details.
 * @param {string} id
 * @param {object} updates
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
function modifyVehicle(id, updates) {
  // Prevent overwriting protected fields
  delete updates.id;
  delete updates.createdAt;

  const updated = db.updateVehicle(id, updates);
  if (!updated) {
    return { success: false, error: `Vehicle with id ${id} not found.` };
  }
  Log("backend", "info", "service", `Vehicle modified: ${id}`);
  return { success: true, data: updated };
}

/**
 * Removes a vehicle and all its associated schedules.
 * @param {string} id
 * @returns {{ success: boolean, error?: string }}
 */
function removeVehicle(id) {
  // Also remove all schedules associated with this vehicle
  const schedules = db.getAllSchedules(id);
  schedules.forEach((s) => db.deleteSchedule(s.id));

  const deleted = db.deleteVehicle(id);
  if (!deleted) {
    return { success: false, error: `Vehicle with id ${id} not found.` };
  }
  Log("backend", "info", "service", `Vehicle and ${schedules.length} associated schedules removed: ${id}`);
  return { success: true };
}

module.exports = { addVehicle, getVehicle, listVehicles, modifyVehicle, removeVehicle };
