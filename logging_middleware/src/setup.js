/**
 * setup.js
 * One-time setup script to register and authenticate with the evaluation server.
 *
 * Run this ONCE before starting your application:
 *   node src/setup.js
 *
 * It will print the access_token. Copy it into your .env as AUTH_TOKEN=<token>
 * or the authService will keep it in memory for the current process.
 */

require("dotenv").config();
const { register, authenticate, setToken } = require("./authService");

async function setup() {
  console.log("--- Evaluation Server Setup ---");
  console.log(`Email    : ${process.env.EMAIL}`);
  console.log(`Name     : ${process.env.NAME}`);
  console.log(`Roll No  : ${process.env.ROLL_NO}`);
  console.log("");

  // Step 1: Register (or use existing credentials)
  let clientId = process.env.CLIENT_ID;
  let clientSecret = process.env.CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log("No existing credentials found. Registering...");
    try {
      const registrationData = await register();
      clientId = registrationData.clientID;
      clientSecret = registrationData.clientSecret;
      console.log("Registration Response:", JSON.stringify(registrationData, null, 2));
    } catch {
      console.error("Registration failed.");
      process.exit(1);
    }
  } else {
    console.log("Using existing credentials from .env.");
  }

  // Step 2: Authenticate using clientId and clientSecret
  if (!clientId || !clientSecret) {
    console.error(
      "Could not obtain clientId/clientSecret."
    );
    process.exit(1);
  }

  let token;
  try {
    token = await authenticate(clientId, clientSecret);
    setToken(token);
    console.log("\nAccess Token:\n", token);
    console.log(
      "\nCopy the above token into your .env file as:\nAUTH_TOKEN=<token>"
    );
  } catch {
    console.error("Authentication failed.");
    process.exit(1);
  }

  console.log("\n--- Setup Complete ---");
}

setup();
