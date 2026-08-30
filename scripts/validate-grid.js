// scripts/validate-grid.js
// Validates that each userId appears at most once in public/grid-data.json
// Exit code 0 = valid, Exit code 1 = invalid (commit will be blocked)

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.resolve(__dirname, '..', 'public', 'grid-data.json');

console.log('🔍 Validating public/grid-data.json...');

// 1. Check if file exists
if (!fs.existsSync(filePath)) {
    console.log('ℹ️  grid-data.json does not exist yet. Skipping validation.');
    process.exit(0);
}

// 2. Read and parse the file
let data;
try {
    const content = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(content);
} catch (err) {
    console.error('❌ FAILED: grid-data.json contains invalid JSON.');
    console.error('   Error:', err.message);
    process.exit(1);
}

// 3. Must be an array
if (!Array.isArray(data)) {
    console.error('❌ FAILED: grid-data.json must contain a JSON array.');
    process.exit(1);
}

// 4. Empty array is valid
if (data.length === 0) {
    console.log('✅ Valid: grid-data.json is empty (no squares claimed yet).');
    process.exit(0);
}

// 5. Validate each entry has required fields
for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (
        typeof item.x !== 'number' ||
        typeof item.y !== 'number' ||
        typeof item.userId !== 'string' ||
        typeof item.color !== 'string'
    ) {
        console.error(`❌ FAILED: Entry at index ${i} is missing required fields.`);
        console.error('   Expected: { x, y, userId, color, timestamp }');
        console.error('   Got:', JSON.stringify(item));
        process.exit(1);
    }
}

// 6. Check for duplicate userIds
const userCounts = new Map();
for (const item of data) {
    userCounts.set(item.userId, (userCounts.get(item.userId) || 0) + 1);
}

const duplicates = [];
for (const [userId, count] of userCounts.entries()) {
    if (count > 1) {
        duplicates.push({ userId, count });
    }
}

if (duplicates.length > 0) {
    console.error('');
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ COMMIT BLOCKED: One-Square-Per-User Rule Violated      ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    console.error('');
    console.error('The following users have more than one square in grid-data.json:');
    console.error('');
    for (const { userId, count } of duplicates) {
        console.error(`   • ${userId} → ${count} squares (should be exactly 1)`);
    }
    console.error('');
    console.error('Please fix public/grid-data.json so each userId appears only once.');
    console.error('');
    process.exit(1);
}

// 7. All good!
console.log(`✅ Valid: ${data.length} square(s), each user has at most 1 square.`);
process.exit(0);
