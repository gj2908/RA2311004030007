/**
 * db.js
 * In-memory data store for vehicles and maintenance schedules.
 * Acts as the persistence layer for this service.
 */

const { v4: uuidv4 } = require("uuid");
const { Log } = require("../../logging_middleware/src/logger");

// In-memory stores
const vehicles = new Map();
const schedules = new Map();

// ─── Vehicle Operations ───────────────────────────────────────────────────────

/**
 * Adds a new vehicle to the store.
 * @param {object} vehicleData - { name, type, registrationNumber, ownerName }
 * @returns {object} The created vehicle
 */
function createVehicle(vehicleData) {
  const id = uuidv4();
  const vehicle = {
    id,
    name: vehicleData.name,
    type: vehicleData.type,
    registrationNumber: vehicleData.registrationNumber,
    ownerName: vehicleData.ownerName,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  vehicles.set(id, vehicle);
  Log("backend", "info", "db", `Vehicle created: id=${id}, reg=${vehicle.registrationNumber}`);
  return vehicle;
}

/**
 * Retrieves a vehicle by ID.
 * @param {string} id
 * @returns {object|null}
 */
function getVehicleById(id) {
  const vehicle = vehicles.get(id) || null;
  if (!vehicle) {
    Log("backend", "warn", "db", `Vehicle not found: id=${id}`);
  }
  return vehicle;
}

/**
 * Returns all vehicles in the store.
 * @returns {object[]}
 */
function getAllVehicles() {
  return Array.from(vehicles.values());
}

/**
 * Updates a vehicle's fields.
 * @param {string} id
 * @param {object} updates
 * @returns {object|null}
 */
function updateVehicle(id, updates) {
  const vehicle = vehicles.get(id);
  if (!vehicle) {
    Log("backend", "warn", "db", `Update failed - vehicle not found: id=${id}`);
    return null;
  }
  const updated = { ...vehicle, ...updates, updatedAt: new Date().toISOString() };
  vehicles.set(id, updated);
  Log("backend", "info", "db", `Vehicle updated: id=${id}`);
  return updated;
}

/**
 * Deletes a vehicle by ID.
 * @param {string} id
 * @returns {boolean}
 */
function deleteVehicle(id) {
  const exists = vehicles.has(id);
  if (exists) {
    vehicles.delete(id);
    Log("backend", "info", "db", `Vehicle deleted: id=${id}`);
  } else {
    Log("backend", "warn", "db", `Delete failed - vehicle not found: id=${id}`);
  }
  return exists;
}

// ─── Schedule Operations ──────────────────────────────────────────────────────

/**
 * Creates a maintenance schedule entry.
 * @param {object} scheduleData - { vehicleId, maintenanceType, scheduledDate, notes }
 * @returns {object} The created schedule
 */
function createSchedule(scheduleData) {
  const id = uuidv4();
  const schedule = {
    id,
    vehicleId: scheduleData.vehicleId,
    maintenanceType: scheduleData.maintenanceType,
    scheduledDate: scheduleData.scheduledDate,
    notes: scheduleData.notes || "",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  schedules.set(id, schedule);
  Log("backend", "info", "db", `Schedule created: id=${id}, vehicleId=${schedule.vehicleId}, type=${schedule.maintenanceType}`);
  return schedule;
}

/**
 * Retrieves a schedule by ID.
 * @param {string} id
 * @returns {object|null}
 */
function getScheduleById(id) {
  const schedule = schedules.get(id) || null;
  if (!schedule) {
    Log("backend", "warn", "db", `Schedule not found: id=${id}`);
  }
  return schedule;
}

/**
 * Returns all schedules, optionally filtered by vehicleId.
 * @param {string} [vehicleId]
 * @returns {object[]}
 */
function getAllSchedules(vehicleId) {
  const all = Array.from(schedules.values());
  if (vehicleId) {
    return all.filter((s) => s.vehicleId === vehicleId);
  }
  return all;
}

/**
 * Updates a schedule's fields.
 * @param {string} id
 * @param {object} updates
 * @returns {object|null}
 */
function updateSchedule(id, updates) {
  const schedule = schedules.get(id);
  if (!schedule) {
    Log("backend", "warn", "db", `Schedule update failed - not found: id=${id}`);
    return null;
  }
  const updated = { ...schedule, ...updates, updatedAt: new Date().toISOString() };
  schedules.set(id, updated);
  Log("backend", "info", "db", `Schedule updated: id=${id}, status=${updated.status}`);
  return updated;
}

/**
 * Deletes a schedule by ID.
 * @param {string} id
 * @returns {boolean}
 */
function deleteSchedule(id) {
  const exists = schedules.has(id);
  if (exists) {
    schedules.delete(id);
    Log("backend", "info", "db", `Schedule deleted: id=${id}`);
  } else {
    Log("backend", "warn", "db", `Schedule delete failed - not found: id=${id}`);
  }
  return exists;
}

module.exports = {
  createVehicle,
  getVehicleById,
  getAllVehicles,
  updateVehicle,
  deleteVehicle,
  createSchedule,
  getScheduleById,
  getAllSchedules,
  updateSchedule,
  deleteSchedule,
};
