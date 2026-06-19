const crypto = require("crypto");

const SESSION_TTL_MS = 10 * 60 * 1000;
const sessions = new Map();

function createSession(data) {
  const id = crypto.randomUUID();
  sessions.set(id, data);
  setTimeout(() => sessions.delete(id), SESSION_TTL_MS);
  return id;
}

function getSession(id) {
  return sessions.get(id);
}

module.exports = { createSession, getSession };
