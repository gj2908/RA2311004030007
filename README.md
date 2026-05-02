# RA2311004030007

Backend track submission repository.

## Repository Structure

```
RA2311004030007/
├── logging_middleware/           # Reusable logging package (shared by all services)
│   ├── src/
│   │   ├── index.js              # Public API exports
│   │   ├── logger.js             # Core Log(stack, level, package, message) function
│   │   ├── authService.js        # Register + authenticate with evaluation server
│   │   ├── httpLoggerMiddleware.js # Express HTTP auto-logger
│   │   ├── constants.js          # Valid stacks, levels, packages
│   │   ├── setup.js              # One-time registration/auth script
│   │   └── test.js               # Test script
│   ├── .env
│   └── package.json
│
├── vehicle_maintence_scheduler/  # Vehicle maintenance scheduling service
│   ├── src/
│   │   ├── index.js              # Entry point (port 3001)
│   │   ├── routes.js             # All route registrations
│   │   ├── vehicleController.js  # Vehicle route handlers
│   │   ├── scheduleController.js # Schedule route handlers
│   │   ├── vehicleService.js     # Vehicle business logic
│   │   ├── scheduleService.js    # Schedule business logic
│   │   ├── db.js                 # In-memory data store
│   │   ├── maintenanceCron.js    # Hourly cron job for overdue schedules
│   │   └── constants.js
│   ├── .env
│   └── package.json
│
├── notification_app_be/          # Notification system backend service
│   ├── src/
│   │   ├── index.js              # Entry point (port 3002)
│   │   ├── routes.js             # All route registrations
│   │   ├── notificationController.js
│   │   ├── subscriberController.js
│   │   ├── notificationService.js
│   │   ├── subscriberService.js
│   │   ├── db.js
│   │   └── constants.js
│   ├── .env
│   └── package.json
│
├── notification_system_design.md # Architecture and design document
├── .gitignore
└── README.md
```

## Setup

### 1. Install dependencies for each service

```bash
cd logging_middleware && npm install
cd ../vehicle_maintence_scheduler && npm install
cd ../notification_app_be && npm install
```

### 2. Register and get auth token (once)

```bash
cd logging_middleware
node src/setup.js
```

Copy the printed token into each service's `.env` as `AUTH_TOKEN=<token>`.

### 3. Start services

```bash
# Terminal 1 - Vehicle Scheduler (port 3001)
cd vehicle_maintence_scheduler && npm start

# Terminal 2 - Notification Service (port 3002)
cd notification_app_be && npm start
```
