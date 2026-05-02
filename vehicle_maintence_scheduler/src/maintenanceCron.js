/**
 * maintenanceCron.js
 * Scheduled cron job that checks for overdue or upcoming maintenance schedules
 * and logs appropriate alerts.
 *
 * Runs every hour in production; can be adjusted via cron expression.
 */

const cron = require("node-cron");
const db = require("./db");
const { Log } = require("../../logging_middleware/src/logger");

/**
 * Checks all pending schedules and logs alerts for:
 *  - Overdue schedules (scheduledDate is in the past)
 *  - Schedules due within the next 24 hours
 */
function checkUpcomingAndOverdueSchedules() {
  Log("backend", "info", "cron_job", "Maintenance cron job triggered - checking schedules");

  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const schedules = db.getAllSchedules();
  const pendingSchedules = schedules.filter((s) => s.status === "pending");

  let overdueCount = 0;
  let upcomingCount = 0;

  pendingSchedules.forEach((schedule) => {
    const scheduledDate = new Date(schedule.scheduledDate);

    if (scheduledDate < now) {
      overdueCount++;
      Log(
        "backend",
        "warn",
        "cron_job",
        `Overdue maintenance: scheduleId=${schedule.id}, vehicleId=${schedule.vehicleId}, type=${schedule.maintenanceType}, dueOn=${schedule.scheduledDate}`
      );
    } else if (scheduledDate <= in24Hours) {
      upcomingCount++;
      Log(
        "backend",
        "info",
        "cron_job",
        `Upcoming maintenance in 24h: scheduleId=${schedule.id}, vehicleId=${schedule.vehicleId}, type=${schedule.maintenanceType}, dueOn=${schedule.scheduledDate}`
      );
    }
  });

  Log(
    "backend",
    "info",
    "cron_job",
    `Cron job complete: ${overdueCount} overdue, ${upcomingCount} upcoming in 24h, ${pendingSchedules.length} total pending`
  );
}

/**
 * Starts the maintenance cron job.
 * Runs every hour at minute 0.
 */
function startMaintenanceCron() {
  Log("backend", "info", "cron_job", "Maintenance scheduler cron job initializing - interval: every hour");

  // Run every hour: "0 * * * *"
  cron.schedule("0 * * * *", checkUpcomingAndOverdueSchedules);

  Log("backend", "info", "cron_job", "Maintenance cron job started successfully");
}

module.exports = { startMaintenanceCron, checkUpcomingAndOverdueSchedules };
