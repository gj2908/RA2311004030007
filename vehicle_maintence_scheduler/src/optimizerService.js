/**
 * optimizerService.js
 * Core scheduling optimizer for the Vehicle Maintenance Scheduler.
 *
 * Problem: For each depot (with a fixed MechanicHours budget), select a
 * subset of vehicle maintenance tasks that maximises total Impact without
 * exceeding the available mechanic-hours. This is a classic 0/1 Knapsack.
 *
 * Algorithm: Bottom-up dynamic programming, O(n * W) where W = budget * 10
 * (scaled to handle 1-decimal-place durations as integers).
 */

const { Log } = require("../../logging_middleware/src/logger");
const { fetchDepots, fetchVehicles } = require("./evalApiService");

const SCALE = 10; // Multiply hours by 10 to convert to integer units

/**
 * 0/1 Knapsack DP solver.
 *
 * @param {Array<{TaskID: string, Duration: number, Impact: number}>} tasks
 * @param {number} capacityHours - Mechanic hour budget for this depot
 * @returns {{ selectedTasks: Array, totalDuration: number, totalImpact: number }}
 */
function knapsack(tasks, capacityHours) {
  const capacity = Math.floor(capacityHours * SCALE);
  const n = tasks.length;

  // dp[i][w] = max impact using first i tasks with capacity w
  // Use 1D rolling array for memory efficiency
  const dp = new Array(capacity + 1).fill(0);

  // Track which items were chosen (keep pointer table for backtracking)
  const keep = Array.from({ length: n }, () => new Array(capacity + 1).fill(false));

  for (let i = 0; i < n; i++) {
    const weight = Math.floor(tasks[i].Duration * SCALE);
    const value = tasks[i].Impact;

    // Traverse backwards to maintain 0/1 property
    for (let w = capacity; w >= weight; w--) {
      if (dp[w - weight] + value > dp[w]) {
        dp[w] = dp[w - weight] + value;
        keep[i][w] = true;
      }
    }
  }

  // Backtrack to find which tasks were selected
  const selectedTasks = [];
  let w = capacity;
  for (let i = n - 1; i >= 0; i--) {
    if (keep[i][w]) {
      selectedTasks.push(tasks[i]);
      w -= Math.floor(tasks[i].Duration * SCALE);
    }
  }

  const totalDuration = selectedTasks.reduce((sum, t) => sum + t.Duration, 0);
  const totalImpact = selectedTasks.reduce((sum, t) => sum + t.Impact, 0);

  return {
    selectedTasks: selectedTasks.reverse(), // restore original order
    totalDuration: Math.round(totalDuration * 10) / 10,
    totalImpact,
  };
}

/**
 * Main orchestrator: fetches depots + tasks from the eval server,
 * runs knapsack for each depot, and returns the full schedule.
 *
 * @returns {Promise<object>} Full optimized schedule result
 */
async function computeOptimalSchedule() {
  Log("backend", "info", "service", "Starting optimal maintenance schedule computation");

  // 1. Fetch data from evaluation server
  const [depots, tasks] = await Promise.all([fetchDepots(), fetchVehicles()]);

  if (!depots || depots.length === 0) {
    Log("backend", "warn", "service", "No depots returned from evaluation server");
    throw new Error("No depots available from evaluation server.");
  }
  if (!tasks || tasks.length === 0) {
    Log("backend", "warn", "service", "No vehicle tasks returned from evaluation server");
    throw new Error("No vehicle tasks available from evaluation server.");
  }

  Log("backend", "info", "service", `Running knapsack for ${depots.length} depots, ${tasks.length} tasks`);

  // 2. Run knapsack for each depot
  const depotSchedules = depots.map((depot) => {
    const budget = depot.MechanicHours;
    const result = knapsack(tasks, budget);

    Log(
      "backend",
      "info",
      "service",
      `Depot ${depot.ID}: budget=${budget}h, selected=${result.selectedTasks.length} tasks, impact=${result.totalImpact}, duration=${result.totalDuration}h`
    );

    return {
      depotId: depot.ID,
      mechanicHoursBudget: budget,
      selectedTasks: result.selectedTasks,
      totalDuration: result.totalDuration,
      totalImpact: result.totalImpact,
      utilizationPercent:
        budget > 0
          ? Math.round((result.totalDuration / budget) * 1000) / 10
          : 0,
    };
  });

  const overallImpact = depotSchedules.reduce((sum, d) => sum + d.totalImpact, 0);
  const overallDuration = depotSchedules.reduce((sum, d) => sum + d.totalDuration, 0);

  Log(
    "backend",
    "info",
    "service",
    `Schedule computation complete: totalImpact=${overallImpact}, totalDuration=${overallDuration}h across ${depots.length} depots`
  );

  return {
    summary: {
      totalDepots: depots.length,
      totalTasksAvailable: tasks.length,
      overallTotalImpact: overallImpact,
      overallTotalDuration: Math.round(overallDuration * 10) / 10,
    },
    depotSchedules,
  };
}

module.exports = { computeOptimalSchedule, knapsack };
