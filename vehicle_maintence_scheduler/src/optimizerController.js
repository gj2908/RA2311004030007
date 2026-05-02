/**
 * optimizerController.js
 * Express route handler for the maintenance optimization endpoint.
 */

const { computeOptimalSchedule } = require("./optimizerService");
const { Log } = require("../../logging_middleware/src/logger");

/**
 * GET /optimize
 * Fetches depots and vehicle tasks from the evaluation server,
 * runs the knapsack optimizer for each depot, and returns the
 * optimal maintenance schedule.
 */
async function optimize(req, res) {
  Log("backend", "info", "controller", "GET /optimize - running maintenance schedule optimizer");

  try {
    const result = await computeOptimalSchedule();
    Log(
      "backend",
      "info",
      "controller",
      `GET /optimize - success: ${result.summary.totalDepots} depots, impact=${result.summary.overallTotalImpact}`
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    Log("backend", "error", "controller", `GET /optimize failed: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = { optimize };
