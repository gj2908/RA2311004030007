/**
 * vehicleController.js
 * Express route handlers for vehicle CRUD operations.
 */

const vehicleService = require("./vehicleService");
const { Log } = require("../../logging_middleware/src/logger");

/**
 * POST /vehicles
 * Create a new vehicle.
 */
function createVehicle(req, res) {
  Log("backend", "info", "controller", `POST /vehicles - body: ${JSON.stringify(req.body)}`);
  const result = vehicleService.addVehicle(req.body);
  if (!result.success) {
    Log("backend", "warn", "controller", `POST /vehicles failed: ${result.error}`);
    return res.status(400).json({ success: false, error: result.error });
  }
  return res.status(201).json({ success: true, data: result.data });
}

/**
 * GET /vehicles
 * List all vehicles.
 */
function getAllVehicles(req, res) {
  Log("backend", "info", "controller", "GET /vehicles");
  const result = vehicleService.listVehicles();
  return res.status(200).json({ success: true, data: result.data });
}

/**
 * GET /vehicles/:id
 * Get a vehicle by ID.
 */
function getVehicleById(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `GET /vehicles/${id}`);
  const result = vehicleService.getVehicle(id);
  if (!result.success) {
    Log("backend", "warn", "controller", `GET /vehicles/${id} not found`);
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, data: result.data });
}

/**
 * PUT /vehicles/:id
 * Update a vehicle.
 */
function updateVehicle(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `PUT /vehicles/${id}`);
  const result = vehicleService.modifyVehicle(id, req.body);
  if (!result.success) {
    Log("backend", "warn", "controller", `PUT /vehicles/${id} failed: ${result.error}`);
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, data: result.data });
}

/**
 * DELETE /vehicles/:id
 * Delete a vehicle.
 */
function deleteVehicle(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `DELETE /vehicles/${id}`);
  const result = vehicleService.removeVehicle(id);
  if (!result.success) {
    Log("backend", "warn", "controller", `DELETE /vehicles/${id} failed: ${result.error}`);
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, message: "Vehicle deleted successfully." });
}

module.exports = { createVehicle, getAllVehicles, getVehicleById, updateVehicle, deleteVehicle };
