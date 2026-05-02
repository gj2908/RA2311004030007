# logging_middleware

A reusable logging middleware package for backend applications. Implements the `Log(stack, level, package, message)` function that posts structured log entries to the evaluation server.

---

## Folder Structure

```
logging_middleware/
├── src/
│   ├── index.js                  # Public API exports
│   ├── logger.js                 # Core Log() function
│   ├── authService.js            # Register & authenticate with eval server
│   ├── httpLoggerMiddleware.js   # Express middleware (auto HTTP request logging)
│   ├── constants.js              # Valid stacks, levels, packages
│   ├── setup.js                  # One-time registration + auth script
│   └── test.js                   # Test script for Log function
├── .env                          # Environment variables
├── package.json
└── README.md
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure `.env`

The `.env` file is pre-filled with your credentials. Verify it looks like:

```
EVAL_SERVER_BASE_URL=http://20.207.122.201/evaluation-service
EMAIL=gj6117@srmist.edu.in
NAME=Gaurang Jadoun
MOBILE_NO=8077700483
GITHUB_USERNAME=gj2908
ROLL_NO=RA2311004030007
ACCESS_CODE=QkbpxH
AUTH_TOKEN=
```

### 3. Register and Authenticate (run once)

```bash
node src/setup.js
```

This will print the `access_token`. Copy it into `.env`:

```
AUTH_TOKEN=eyJh...
```

---

## Usage

### Core Log Function

```js
const { Log } = require('./src');

// Log(stack, level, package, message)
await Log("backend", "error", "handler", "received string, expected bool");
await Log("backend", "fatal", "db", "Critical database connection failure.");
await Log("backend", "info", "service", "Service started successfully.");
```

### Express HTTP Logger Middleware

```js
const express = require('express');
const { httpLoggerMiddleware, errorLoggerMiddleware } = require('./src');

const app = express();
app.use(httpLoggerMiddleware);   // logs all requests + responses

// ... your routes ...

app.use(errorLoggerMiddleware);  // logs unhandled errors (must be last)
```

---

## Valid Values

| Field   | Allowed Values |
|---------|---------------|
| stack   | `backend`, `frontend` |
| level   | `debug`, `info`, `warn`, `error`, `fatal` |
| package (backend) | `cache`, `controller`, `cron_job`, `db`, `domain`, `handler`, `repository`, `route`, `service`, `auth`, `config`, `middleware`, `utils` |

---

## Run Tests

```bash
node src/test.js
```

Ensure `AUTH_TOKEN` is set in `.env` before running tests.
