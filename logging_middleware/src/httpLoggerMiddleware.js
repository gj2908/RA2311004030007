/**
 * httpLoggerMiddleware.js
 * Express middleware that automatically logs incoming HTTP requests
 * and outgoing responses using the reusable Log function.
 *
 * Attach to your Express app with:
 *   app.use(httpLoggerMiddleware);
 */

const { Log } = require("./logger");

/**
 * Middleware: logs every incoming request at "info" level
 * and every response (including errors) at appropriate levels.
 */
function httpLoggerMiddleware(req, res, next) {
  const startTime = Date.now();

  // Log the incoming request
  Log(
    "backend",
    "info",
    "middleware",
    `Incoming ${req.method} ${req.originalUrl} from ${req.ip}`
  );

  // Intercept the response finish event to log response details
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Choose log level based on HTTP status code
    let level = "info";
    if (statusCode >= 500) {
      level = "error";
    } else if (statusCode >= 400) {
      level = "warn";
    }

    Log(
      "backend",
      level,
      "middleware",
      `Response ${statusCode} for ${req.method} ${req.originalUrl} in ${duration}ms`
    );
  });

  next();
}

/**
 * Express error-handling middleware.
 * Logs unhandled errors at "fatal" level before passing them along.
 *
 * Must be registered AFTER all routes:
 *   app.use(errorLoggerMiddleware);
 */
function errorLoggerMiddleware(err, req, res, next) {
  Log(
    "backend",
    "fatal",
    "middleware",
    `Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`
  );
  next(err);
}

module.exports = { httpLoggerMiddleware, errorLoggerMiddleware };
