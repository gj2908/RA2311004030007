/**
 * index.js
 * Public API of the logging_middleware package.
 *
 * Exports:
 *  - Log(stack, level, package, message)  -> core log function
 *  - httpLoggerMiddleware                 -> auto-logs HTTP requests/responses
 *  - errorLoggerMiddleware                -> auto-logs unhandled Express errors
 *  - authService                          -> register/authenticate with eval server
 *  - constants                            -> valid stacks, levels, packages
 */

const { Log, validateLogParams } = require("./logger");
const {
  httpLoggerMiddleware,
  errorLoggerMiddleware,
} = require("./httpLoggerMiddleware");
const authService = require("./authService");
const constants = require("./constants");

module.exports = {
  Log,
  validateLogParams,
  httpLoggerMiddleware,
  errorLoggerMiddleware,
  authService,
  constants,
};
