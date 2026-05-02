/**
 * constants.js
 * Application-wide constants for the vehicle maintenance scheduler.
 */

const MAINTENANCE_TYPES = {
  OIL_CHANGE: "oil_change",
  TIRE_ROTATION: "tire_rotation",
  BRAKE_INSPECTION: "brake_inspection",
  ENGINE_CHECK: "engine_check",
  GENERAL_SERVICE: "general_service",
};

const SCHEDULE_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

const VEHICLE_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  UNDER_MAINTENANCE: "under_maintenance",
};

module.exports = { MAINTENANCE_TYPES, SCHEDULE_STATUS, VEHICLE_STATUS };
