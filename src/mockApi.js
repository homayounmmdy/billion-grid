// mockApi.js
const GRID_SIZE = 1_000_000_000;
const CENTER = GRID_SIZE / 2;
const DB = new Map();

function seedDatabase() {
  const seedColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(CENTER - 500 + Math.random() * 1000);
    const y = Math.floor(CENTER - 500 + Math.random() * 1000);
    const userId = `user_${Math.floor(Math.random() * 10)}`;
    const color = seedColors[Math.floor(Math.random() * seedColors.length)];
    DB.set(`${x},${y}`, { userId, color });
  }
}

export async function loadInitialData() {
  // 1. Try loading from the actual public file first
  try {
    const response = await fetch('/grid-data.json?t=' + Date.now()); // t= prevents aggressive caching
    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        for (const item of data) {
          DB.set(`${item.x},${item.y}`, { userId: item.userId, color: item.color });
        }
        console.log(`Loaded ${data.length} squares from public/grid-data.json`);
        return;
      }
    }
  } catch (e) {
    console.log('No grid-data.json found or empty, falling back to localStorage or seed.');
  }

  // 2. Fallback to localStorage
  const stored = localStorage.getItem('billionGridData');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      for (const item of data) {
        DB.set(`${item.x},${item.y}`, { userId: item.userId, color: item.color });
      }
      console.log(`Loaded ${data.length} squares from localStorage`);
      return;
    } catch (e) {
      console.error('Failed to parse localStorage data:', e);
    }
  }

  // 3. Final fallback: seed data
  seedDatabase();
}

export function exportData() {
  const data = [];
  for (const [key, value] of DB.entries()) {
    const [x, y] = key.split(',').map(Number);
    data.push({ x, y, userId: value.userId, color: value.color });
  }
  return data;
}

export function importData(data) {
  DB.clear();
  for (const item of data) {
    DB.set(`${item.x},${item.y}`, { userId: item.userId, color: item.color });
  }
}

// ... (keep getVisibleSquares, commitSquare, getUserSquare exactly as they were) ...
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
      results.push({ x, y, userId: value.userId, color: value.color });
    }
  }
  return results;
}

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

  for (const [k, v] of DB.entries()) {
    if (v.userId === userId) {
      DB.delete(k);
      break;
    }
  }

  DB.set(key, { userId, color });
  return { success: true };
}

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
