// lib/logger.js

export function logError(message, error) {
  console.error(`[${new Date().toISOString()}] ${message}`, error);
}