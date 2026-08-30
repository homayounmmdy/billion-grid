// mockApi.js
// Simulates a database of claimed squares.
// Keys are "x,y" strings. Values are { userId, color }.
// The grid is 1,000,000,000 x 1,000,000,000.

const GRID_SIZE = 1_000_000_000;
const CENTER = GRID_SIZE / 2;

// In-memory "database"
const DB = new Map();

// Pre-populate with some claimed squares near the center so the user
// sees something interesting when they first load the app.
function seedDatabase() {
  const seedColors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6',
    '#e67e22', '#1abc9c', '#ff6b9d', '#4ecdc4', '#ffe66d'
  ];
  for (let i = 0; i < 300; i++) {
    // Scatter squares in a 2000x2000 region around the center
    const x = Math.floor(CENTER - 1000 + Math.random() * 2000);
    const y = Math.floor(CENTER - 1000 + Math.random() * 2000);
    const userId = `user_${Math.floor(Math.random() * 50)}`;
    const color = seedColors[Math.floor(Math.random() * seedColors.length)];
    DB.set(`${x},${y}`, { userId, color });
  }
}
seedDatabase();

/**
 * Fetch all claimed squares within the given viewport bounds.
 * In a real backend this would be a spatial query (e.g. PostGIS, Redis GEO).
 */
export async function getVisibleSquares(minX, minY, maxX, maxY) {
  // Clamp to grid bounds
  minX = Math.max(0, Math.floor(minX));
  minY = Math.max(0, Math.floor(minY));
  maxX = Math.min(GRID_SIZE - 1, Math.ceil(maxX));
  maxY = Math.min(GRID_SIZE - 1, Math.ceil(maxY));

  // Simulate network latency
  await new Promise((r) => setTimeout(r, 80));

  const results = [];
  for (const [key, value] of DB.entries()) {
    const [x, y] = key.split(',').map(Number);
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      results.push({ x, y, userId: value.userId, color: value.color });
    }
  }
  return results;
}

/**
 * Attempt to claim a square. Returns { success, error? }.
 * Simulates a 1-second commit delay.
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

  // If the user already owns a *different* square, release it.
  // This enforces the "one square per user" rule.
  if (existing && existing.userId === userId) {
    return { success: false, error: 'You already own this square' };
  }

  // Release the user's previous square (if any)
  for (const [k, v] of DB.entries()) {
    if (v.userId === userId) {
      DB.delete(k);
      break;
    }
  }

  DB.set(key, { userId, color });
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
      return { x, y, color: value.color };
    }
  }
  return null;
}

export const GRID_SIZE_EXPORT = GRID_SIZE;