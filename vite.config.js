// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'custom-save-api',
      configureServer(server) {
        // This intercepts the request BEFORE Vite's default 404 handler
        server.middlewares.use('/api/save-grid', (req, res, next) => {
          if (req.method === 'POST') {
            console.log('🟢 Vite Plugin: Intercepted POST /api/save-grid');

            let body = '';
            req.on('data', (chunk) => {
              body += chunk.toString();
            });

            req.on('end', () => {
              try {
                const newSquare = JSON.parse(body); // { x, y, userId, color }
                const filePath = path.resolve(__dirname, 'public', 'grid-data.json');

                // 1. Read existing data
                let existingData = [];
                if (fs.existsSync(filePath)) {
                  const fileContent = fs.readFileSync(filePath, 'utf-8');
                  existingData = JSON.parse(fileContent || '[]');
                }

                // 2. Add timestamp to the new square
                const squareWithTimestamp = {
                  ...newSquare,
                  timestamp: new Date().toISOString()
                };

                // 3. Simply append to the list (NO filtering - keep complete history)
                existingData.push(squareWithTimestamp);

                // 4. Write back to file
                fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2), 'utf-8');
                console.log(`🟢 Successfully appended square to grid-data.json (Total: ${existingData.length} squares)`);

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                console.error('🔴 Error saving file:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
          } else {
            next(); // Let Vite handle GET or other methods
          }
        });
      }
    }
  ]
});
