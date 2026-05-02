/**
 * evalApiService.js
 * Fetches Depot and Vehicle task data from the evaluation server.
 * Both endpoints are protected routes requiring a Bearer token.
 */

require("dotenv").config();
const axios = require("axios");
const { getToken } = require("../../logging_middleware/src/authService");
const { Log } = require("../../logging_middleware/src/logger");

const BASE_URL = process.env.EVAL_SERVER_BASE_URL;

/**
 * Returns Axios headers with the current Bearer auth token.
 * @returns {object}
 */
function authHeaders() {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Fetches all depots from the evaluation server.
 * Each depot has: { ID, MechanicHours }
 * @returns {Promise<Array>} Array of depot objects
 */
async function fetchDepots() {
  Log("backend", "info", "service", "Fetching depots from evaluation server");
  try {
    const response = await axios.get(`${BASE_URL}/depots`, {
      headers: authHeaders(),
    });
    const depots = response.data?.depots || response.data || [];
    Log("backend", "info", "service", `Fetched ${depots.length} depots from evaluation server`);
    return depots;
  } catch (error) {
    const errDetails = error.response?.data || error.message;
    Log("backend", "error", "service", `Failed to fetch depots: ${JSON.stringify(errDetails)}`);
    throw new Error(`Depot API error: ${JSON.stringify(errDetails)}`);
  }
}

/**
 * Fetches all vehicle maintenance tasks from the evaluation server.
 * Each task has: { TaskID, Duration, Impact }
 * @returns {Promise<Array>} Array of task objects
 */
async function fetchVehicles() {
  Log("backend", "info", "service", "Fetching vehicle tasks from evaluation server");
  try {
    const response = await axios.get(`${BASE_URL}/vehicles`, {
      headers: authHeaders(),
    });
    const vehicles = response.data?.vehicles || response.data || [];
    Log("backend", "info", "service", `Fetched ${vehicles.length} vehicle tasks from evaluation server`);
    return vehicles;
  } catch (error) {
    const errDetails = error.response?.data || error.message;
    Log("backend", "error", "service", `Failed to fetch vehicles: ${JSON.stringify(errDetails)}`);
    throw new Error(`Vehicles API error: ${JSON.stringify(errDetails)}`);
  }
}

module.exports = { fetchDepots, fetchVehicles };
