/**
 * subscriberController.js
 * Express route handlers for subscriber CRUD operations.
 */

const subscriberService = require("./subscriberService");
const { Log } = require("../../logging_middleware/src/logger");

function create(req, res) {
  Log("backend", "info", "controller", `POST /subscribers - body: ${JSON.stringify(req.body)}`);
  const result = subscriberService.addSubscriber(req.body);
  if (!result.success) {
    Log("backend", "warn", "controller", `POST /subscribers failed: ${result.error}`);
    return res.status(400).json({ success: false, error: result.error });
  }
  return res.status(201).json({ success: true, data: result.data });
}

function getAll(req, res) {
  Log("backend", "info", "controller", "GET /subscribers");
  const result = subscriberService.listSubscribers();
  return res.status(200).json({ success: true, data: result.data });
}

function getById(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `GET /subscribers/${id}`);
  const result = subscriberService.getSubscriber(id);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, data: result.data });
}

function update(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `PUT /subscribers/${id}`);
  const result = subscriberService.modifySubscriber(id, req.body);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, data: result.data });
}

function remove(req, res) {
  const { id } = req.params;
  Log("backend", "info", "controller", `DELETE /subscribers/${id}`);
  const result = subscriberService.removeSubscriber(id);
  if (!result.success) {
    return res.status(404).json({ success: false, error: result.error });
  }
  return res.status(200).json({ success: true, message: "Subscriber deleted." });
}

module.exports = { create, getAll, getById, update, remove };
