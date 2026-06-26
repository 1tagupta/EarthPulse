import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(), 
    tsconfigPaths(),
    {
      name: 'serve-project-output',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith('/project_output/')) {
            // Strip query parameters
            const cleanUrl = req.url.split('?')[0];
            const relativePath = cleanUrl.replace('/project_output/', '');
            const filePath = path.resolve(__dirname, 'project_output', relativePath);
            
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              // Set appropriate content type
              const ext = path.extname(filePath).toLowerCase();
              let mime = 'application/octet-stream';
              if (ext === '.json') mime = 'application/json';
              else if (ext === '.geojson') mime = 'application/geo+json';
              else if (ext === '.csv') mime = 'text/csv';
              else if (ext === '.txt') mime = 'text/plain';
              else if (ext === '.png') mime = 'image/png';
              else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
              
              res.setHeader('Content-Type', mime);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(fs.readFileSync(filePath));
              return;
            }
          }
          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
