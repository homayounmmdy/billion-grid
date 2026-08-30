// mockApi.js
const GRID_SIZE = 1_000_000_000;

// In-memory "database"
const DB = new Map();

/**
 * Load initial data from public/grid-data.json
 */
export async function loadInitialData() {
  try {
    const response = await fetch('/grid-data.json?t=' + Date.now());

    if (response.ok) {
      const data = await response.json();

      if (Array.isArray(data) && data.length > 0) {
        for (const item of data) {
          // Store with all fields including timestamp
          DB.set(`${item.x},${item.y}`, {
            userId: item.userId,
            color: item.color,
            timestamp: item.timestamp || null
          });
        }
        console.log(`✅ Loaded ${data.length} squares from public/grid-data.json`);
      } else {
        console.log('ℹ️ grid-data.json is empty. Starting with a clean, blank grid.');
      }
    } else {
      console.log('⚠️ Could not fetch grid-data.json. Starting with a clean, blank grid.');
    }
  } catch (e) {
    console.log('⚠️ Error loading grid-data.json. Starting with a clean, blank grid.', e);
  }
}

/**
 * Export all data to JSON format (includes timestamp)
 */
export function exportData() {
  const data = [];
  for (const [key, value] of DB.entries()) {
    const [x, y] = key.split(',').map(Number);
    data.push({
      x,
      y,
      userId: value.userId,
      color: value.color,
      timestamp: value.timestamp || null
    });
  }
  return data;
}

/**
 * Import data from JSON array
 */
export function importData(data) {
  DB.clear();
  for (const item of data) {
    DB.set(`${item.x},${item.y}`, {
      userId: item.userId,
      color: item.color,
      timestamp: item.timestamp || null
    });
  }
}

/**
 * Fetch claimed squares within the given viewport bounds
 */
export async function getVisibleSquares(minX, minY, maxX, maxY) {
  minX = Math.max(0, Math.floor(minX));
  minY = Math.max(0, Math.floor(minY));
  maxX = Math.min(GRID_SIZE - 1, Math.ceil(maxX));
  maxY = Math.min(GRID_SIZE - 1, Math.ceil(maxY));

  await new Promise((r) => setTimeout(r, 80));

  const results = [];
  for (const [key, value] of DB.entries()) {
    const [x, y] = key.split(',').map(Number);
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      results.push({
        x,
        y,
        userId: value.userId,
        color: value.color,
        timestamp: value.timestamp || null
      });
    }
  }
  return results;
}

/**
 * Attempt to claim a square.
 */
export async function commitSquare(x, y, userId, color) {
  await new Promise((r) => setTimeout(r, 1000));

  if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) {
    return { success: false, error: 'Out of bounds' };
  }

  const key = `${x},${y}`;
  const existing = DB.get(key);

  if (existing && existing.userId !== userId) {
    return { success: false, error: 'Already claimed' };
  }

  if (existing && existing.userId === userId) {
    return { success: false, error: 'You already own this square' };
  }

  // Release user's previous square (One square per user rule in UI)
  for (const [k, v] of DB.entries()) {
    if (v.userId === userId) {
      DB.delete(k);
      break;
    }
  }

  DB.set(key, {
    userId,
    color,
    timestamp: new Date().toISOString()
  });
  return { success: true };
}

/**
 * Fetch the square currently owned by a user (if any).
 */
export async function getUserSquare(userId) {
  await new Promise((r) => setTimeout(r, 50));
  for (const [key, value] of DB.entries()) {
    if (value.userId === userId) {
      const [x, y] = key.split(',').map(Number);
      return { x, y, color: value.color, timestamp: value.timestamp || null };
    }
  }
  return null;
}

export const GRID_SIZE_EXPORT = GRID_SIZE;
