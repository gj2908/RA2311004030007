/**
 * priorityInboxService.js
 *
 * Stage 6 - Priority Inbox
 *
 * Fetches notifications from the evaluation server's Notification API and returns
 * the top 10 most important ones. Priority is determined by a combination of:
 *   1. Type weight  — Placement > Result > Event > everything else
 *   2. Recency      — newer notifications score higher
 *
 * The top 10 are found using a min-heap of fixed size 10, which gives us
 * O(n log 10) time — effectively O(n) — rather than sorting the entire list O(n log n).
 *
 * Candidate details:
 *   Name:  Gaurang Jadoun
 *   Roll:  RA2311004030007
 *   Email: gj6117@srmist.edu.in
 */

require("dotenv").config();
const axios = require("axios");
const { getToken } = require("../../logging_middleware/src/authService");
const { Log } = require("../../logging_middleware/src/logger");

const BASE_URL = process.env.EVAL_SERVER_BASE_URL;

// ─── Type Weight Table ────────────────────────────────────────────────────────
// Weight represents the importance of a notification type.
// Placement carries the highest importance, then Result, then Event.
// All other types (mid-sem, project-review, farewell, etc.) share a low default weight.
const TYPE_WEIGHT = {
  Placement: 30,
  Result:    20,
  Event:     10,
};
const DEFAULT_WEIGHT = 5;

function getTypeWeight(type) {
  return TYPE_WEIGHT[type] !== undefined ? TYPE_WEIGHT[type] : DEFAULT_WEIGHT;
}

// ─── Scoring Function ─────────────────────────────────────────────────────────
/**
 * Computes a numeric priority score for a single notification.
 *
 * Formula:  score = type_weight * 10  -  age_in_hours * 1
 *
 * This means:
 *   - A Placement notification from right now scores 300.
 *   - A Result from right now scores 200.
 *   - A Placement from 7 days ago (168 hours) scores 300 - 168 = 132.
 *   - An Event from 1 hour ago scores 100 - 1 = 99.
 *
 * Type weight dominates for recent notifications, but old low-importance
 * notifications eventually fall below fresh lower-priority ones.
 *
 * @param {object} notification - { ID, Type, Message, Timestamp }
 * @returns {number} Priority score (higher = more important)
 */
function computeScore(notification) {
  const typeWeight = getTypeWeight(notification.Type);

  // Timestamp format from API: "2026-04-22 17:51:38"
  const ts = new Date(notification.Timestamp.replace(" ", "T") + "Z");
  const ageInHours = (Date.now() - ts.getTime()) / (1000 * 60 * 60);

  return typeWeight * 10 - ageInHours;
}

// ─── Min-Heap (keyed on score) ────────────────────────────────────────────────
/**
 * MinHeap keeps the K highest-scored items seen so far.
 * Adding an item is O(log K). With K=10 this is essentially O(1) per item.
 */
class MinHeap {
  constructor() {
    this.heap = [];
  }

  size() {
    return this.heap.length;
  }

  peek() {
    return this.heap[0];
  }

  push(item) {
    this.heap.push(item);
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].score <= this.heap[i].score) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  _sinkDown(i) {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.heap[l].score < this.heap[smallest].score) smallest = l;
      if (r < n && this.heap[r].score < this.heap[smallest].score) smallest = r;
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

// ─── Top-N Extractor ──────────────────────────────────────────────────────────
/**
 * Finds the top N notifications by score using a min-heap of size N.
 *
 * For each notification:
 *   - If heap has fewer than N items, push it in.
 *   - If the notification's score beats the current minimum in the heap,
 *     pop the minimum and push the new item.
 *   - Otherwise discard it.
 *
 * At the end, drain the heap in reverse order (lowest score first, reversed = highest first).
 *
 * Time:  O(n log N) — linear scan, log-N heap ops
 * Space: O(N)        — heap never grows beyond N
 *
 * @param {Array} notifications
 * @param {number} n
 * @returns {Array} Top N notifications sorted by score descending
 */
function getTopN(notifications, n) {
  const heap = new MinHeap();

  for (const notification of notifications) {
    const scored = { ...notification, score: computeScore(notification) };

    if (heap.size() < n) {
      heap.push(scored);
    } else if (scored.score > heap.peek().score) {
      heap.pop();
      heap.push(scored);
    }
  }

  // Drain heap — comes out lowest-first, so reverse for descending order
  const result = [];
  while (heap.size() > 0) {
    result.unshift(heap.pop());
  }
  return result;
}

// ─── API Fetch ────────────────────────────────────────────────────────────────
/**
 * Fetches all notifications from the evaluation server.
 * @returns {Promise<Array>}
 */
async function fetchNotifications() {
  const token = getToken();
  Log("backend", "info", "service", "Fetching notifications from evaluation server for priority inbox");

  const response = await axios.get(`${BASE_URL}/notifications`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const notifications = response.data?.notifications || response.data || [];
  Log("backend", "info", "service", `Fetched ${notifications.length} notifications from evaluation server`);
  return notifications;
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Main entry point: fetches all notifications and returns the top 10 by priority score.
 * @param {number} [limit=10]
 * @returns {Promise<object>}
 */
async function getPriorityInbox(limit = 10) {
  Log("backend", "info", "service", `getPriorityInbox called: limit=${limit}`);

  try {
    const notifications = await fetchNotifications();

    if (!notifications || notifications.length === 0) {
      Log("backend", "warn", "service", "Priority inbox: no notifications returned from evaluation server");
      return { total: 0, top: [], scoreBreakdown: [] };
    }

    const top = getTopN(notifications, limit);

    Log(
      "backend",
      "info",
      "service",
      `Priority inbox computed: total=${notifications.length}, top=${top.length}, highest_score=${top[0]?.score?.toFixed(2)}`
    );

    return {
      total: notifications.length,
      showing: top.length,
      top: top.map((n) => ({
        id:        n.ID,
        type:      n.Type,
        message:   n.Message,
        timestamp: n.Timestamp,
        score:     Math.round(n.score * 100) / 100,
      })),
    };
  } catch (error) {
    const detail = error.response?.data || error.message;
    Log("backend", "error", "service", `Priority inbox fetch failed: ${JSON.stringify(detail)}`);
    throw new Error(`Failed to fetch priority inbox: ${JSON.stringify(detail)}`);
  }
}

module.exports = { getPriorityInbox, computeScore, getTopN, MinHeap };
