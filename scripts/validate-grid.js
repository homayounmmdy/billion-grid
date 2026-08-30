// scripts/validate-grid.js
// Enforces: "At most ONE new square can be added per commit"
// Works both locally (Husky) and in CI (GitHub Actions)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '..', 'public', 'grid-data.json');
const RELATIVE_PATH = 'public/grid-data.json';

console.log('🔍 Validating public/grid-data.json (one square per commit rule)...');
console.log(`   Running in: ${process.env.CI ? 'CI (GitHub Actions)' : 'Local (Husky)'}`);

// ---------- Helper: create a unique key for a square entry ----------
function entryKey(item) {
    return `${item.x},${item.y},${item.userId},${item.color},${item.timestamp}`;
}

// ---------- Helper: read the file from a git ref ----------
function readFromGit(ref) {
    try {
        const output = execSync(`git show ${ref}:${RELATIVE_PATH}`, {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        return JSON.parse(output || '[]');
    } catch (err) {
        return [];
    }
}

// ---------- 1. Check if file exists ----------
if (!fs.existsSync(filePath)) {
    console.log('ℹ️  grid-data.json does not exist yet. Skipping validation.');
    process.exit(0);
}

// ---------- 2. Read current file ----------
let currentData;
try {
    const content = fs.readFileSync(filePath, 'utf-8');
    currentData = JSON.parse(content);
} catch (err) {
    console.error('❌ FAILED: grid-data.json contains invalid JSON.');
    console.error('   Error:', err.message);
    process.exit(1);
}

if (!Array.isArray(currentData)) {
    console.error('❌ FAILED: grid-data.json must contain a JSON array.');
    process.exit(1);
}

// ---------- 3. Validate structure of every entry ----------
for (let i = 0; i < currentData.length; i++) {
    const item = currentData[i];
    if (
        typeof item.x !== 'number' ||
        typeof item.y !== 'number' ||
        typeof item.userId !== 'string' ||
        typeof item.color !== 'string' ||
        typeof item.timestamp !== 'string'
    ) {
        console.error(`❌ FAILED: Entry at index ${i} is missing required fields.`);
        console.error('   Expected: { x, y, userId, color, timestamp }');
        console.error('   Got:', JSON.stringify(item));
        process.exit(1);
    }
}

// ---------- 4. Determine the previous state to compare against ----------
let previousData = [];

if (process.env.CI) {
  // GitHub Actions: compare against the base branch (usually 'main')
    const baseRef = process.env.GITHUB_BASE_REF
        ? `origin/${process.env.GITHUB_BASE_REF}`
        : 'HEAD^';

  console.log(`   Comparing current branch against: ${baseRef}`);

    try {
    // Verify the ref actually exists in this clone before trying to read it
    execSync(`git rev-parse --verify ${baseRef}`, { stdio: 'ignore' });
        previousData = readFromGit(baseRef);
    console.log(`   ✅ Found ${previousData.length} existing squares in ${baseRef}`);
    } catch (err) {
    console.log(`   ⚠️ Could not find ${baseRef} in this clone. Treating as 0 previous squares.`);
    console.log(`   (Tip: Ensure 'fetch-depth: 0' is set in your GitHub Actions workflow)`);
        previousData = [];
    }
} else {
    // Local Husky: compare against HEAD
    try {
        execSync('git rev-parse HEAD', { stdio: 'ignore' });
        previousData = readFromGit('HEAD');
    } catch (err) {
        previousData = [];
    }
}

if (!Array.isArray(previousData)) {
    previousData = [];
}

// ---------- 5. Find NEW entries (in current but not in previous) ----------
const previousKeys = new Set(previousData.map(entryKey));
const newEntries = currentData.filter((item) => !previousKeys.has(entryKey(item)));

// ---------- 6. Check for REMOVED entries (warning only) ----------
const currentKeys = new Set(currentData.map(entryKey));
const removedEntries = previousData.filter((item) => !currentKeys.has(entryKey(item)));

if (removedEntries.length > 0) {
    console.warn(
        `⚠️  Warning: ${removedEntries.length} square(s) were removed from grid-data.json.`
    );
}

// ---------- 7. Enforce: at most ONE new square per commit ----------
if (newEntries.length === 0) {
    console.log('✅ Valid: No new squares added in this commit.');
    process.exit(0);
}

if (newEntries.length === 1) {
    const sq = newEntries[0];
    console.log(`✅ Valid: Exactly 1 new square added by ${sq.userId} at (${sq.x}, ${sq.y}).`);
    process.exit(0);
}

// ---------- 8. VIOLATION: Block the commit ----------
console.error('');
console.error('╔════════════════════════════════════════════════════════════════╗');
console.error('║  ❌ COMMIT BLOCKED: Multiple Squares Added in One Commit       ║');
console.error('╚════════════════════════════════════════════════════════════════╝');
console.error('');
console.error(`You are trying to add ${newEntries.length} new squares in a single commit.`);
console.error('Rule: Only ONE new square may be added per commit.');
console.error('');
console.error('New squares detected in this commit:');
console.error('─────────────────────────────────────────────────────────────────');
newEntries.forEach((sq, i) => {
    console.error(`  ${i + 1}. (${sq.x}, ${sq.y}) by ${sq.userId} with color ${sq.color}`);
});
console.error('─────────────────────────────────────────────────────────────────');
console.error('');
process.exit(1);g
