// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    middleware: [
      // 1. Handle local API requests for creating PRs
      (req, res, next) => {
        if (req.method === 'POST' && req.url.startsWith('/api/create-pr')) {
          console.log('🟢 Vite: Intercepted local /api/create-pr request');

          let body = '';
          req.on('data', (chunk) => { body += chunk.toString(); });

          req.on('end', async () => {
            try {
              const data = JSON.parse(body);
              const token = process.env.GITHUB_TOKEN;

              if (!token) {
                return res.status(500).json({
                  error: 'GITHUB_TOKEN not found. Add it to a .env.local file to test locally.'
                });
              }

              // Forward the request to the actual logic (or you can mock it locally)
              // For simplicity, we'll just return a success mock locally so the UI doesn't break,
              // OR you can paste the real GitHub API logic here.
              // Let's return a mock success for local testing to keep it simple:
              console.log('✅ Local mock: PR would be created for', data.githubUsername);
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                prUrl: 'https://github.com/homayounmmdy/billion-grid/pulls/1', // Mock URL
                message: 'Local mock successful'
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        }
        // 2. Handle local API requests for saving grid (from previous steps)
        else if (req.method === 'POST' && req.url.startsWith('/api/save-grid')) {
          console.log('🟢 Vite: Intercepted local /api/save-grid request');
          let body = '';
          req.on('data', (chunk) => { body += chunk.toString(); });
          req.on('end', () => {
            try {
              const newSquare = JSON.parse(body);
              const filePath = path.resolve(__dirname, 'public', 'grid-data.json');
              let existingData = [];
              if (fs.existsSync(filePath)) {
                existingData = JSON.parse(fs.readFileSync(filePath, 'utf-8') || '[]');
              }
              existingData.push({ ...newSquare, timestamp: new Date().toISOString() });
              fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf-8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      }
    ]
  }
});
