/**
 * authService.js
 * Handles registration and authentication with the evaluation server.
 * Stores and refreshes the Bearer token used by the Log function.
 */

require("dotenv").config();
const axios = require("axios");

const BASE_URL = process.env.EVAL_SERVER_BASE_URL;

// Candidate credentials — hardcoded for this submission
const CANDIDATE = {
  email: "gj6117@srmist.edu.in",
  name: "Gaurang Jadoun",
  mobileNo: "8077700483",
  githubUsername: "gj2908",
  rollNo: "RA2311004030007",
  accessCode: "QkbpxH",
};

// In-memory token store
let authToken = process.env.AUTH_TOKEN || null;

/**
 * Registers the candidate with the evaluation server.
 * Should be called once before authentication.
 * @returns {Promise<object>} Registration response data
 */
async function register() {
  const payload = {
    email: CANDIDATE.email,
    name: CANDIDATE.name,
    mobileNo: CANDIDATE.mobileNo,
    githubUsername: CANDIDATE.githubUsername,
    rollNo: CANDIDATE.rollNo,
    accessCode: CANDIDATE.accessCode,
  };


  try {
    const response = await axios.post(`${BASE_URL}/register`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("[authService] Registration successful.");
    return response.data;
  } catch (error) {
    const msg = error.response?.data || error.message;
    console.error("[authService] Registration failed:", msg);
    throw error;
  }
}

/**
 * Authenticates with the evaluation server using credentials + client secrets.
 * Stores the received Bearer token in memory.
 * @param {string} clientId - Client ID from registration response
 * @param {string} clientSecret - Client secret from registration response
 * @returns {Promise<string>} The access token
 */
async function authenticate(clientId, clientSecret) {
  const payload = {
    email: CANDIDATE.email,
    name: CANDIDATE.name,
    rollNo: CANDIDATE.rollNo,
    accessCode: CANDIDATE.accessCode,
    clientID: clientId,
    clientSecret: clientSecret,
  };

  try {
    const response = await axios.post(`${BASE_URL}/auth`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    authToken = response.data.access_token;
    console.log("[authService] Authentication successful. Token stored.");
    return authToken;
  } catch (error) {
    const msg = error.response?.data || error.message;
    console.error("[authService] Authentication failed:", msg);
    throw error;
  }
}

/**
 * Returns the currently stored auth token.
 * @returns {string|null}
 */
function getToken() {
  return authToken;
}

/**
 * Manually sets the auth token (useful when token is retrieved externally).
 * @param {string} token
 */
function setToken(token) {
  authToken = token;
}

module.exports = { register, authenticate, getToken, setToken, CANDIDATE };
