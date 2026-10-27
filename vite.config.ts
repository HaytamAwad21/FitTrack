import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, normalizePath, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { LIBRARY_FILE, LIBRARY_SYNC_PATH, MAX_LIBRARY_BYTES, parseLibrary, serializeLibrary } from './src/data/libraryFile';

/**
 * Dev server only: receives the app's food library and writes it to
 * src/data/library.json, which every new install starts from. Only that one file is
 * ever written, only for requests from the app's own page, and only after the body
 * validates as a food library.
 */
function librarySync(): Plugin {
  let file = '';
  return {
    name: 'fittrack-library-sync',
    apply: 'serve',
    configResolved(config) {
      file = normalizePath(resolve(config.root, LIBRARY_FILE));
    },
    configureServer(server) {
      server.middlewares.use(LIBRARY_SYNC_PATH, (req, res) => {
        const reply = (status: number, message = '') => {
          if (res.writableEnded) return;
          res.statusCode = status;
          res.end(message);
        };
        if (req.method !== 'POST') return reply(405, 'Use POST');

        // Reject requests sent by other websites open in the same browser.
        const origin = req.headers.origin;
        if (origin) {
          let host = '';
          try {
            host = new URL(origin).host;
          } catch {
            // Leaves host empty, which is rejected below.
          }
          if (host !== req.headers.host) return reply(403, 'Cross-origin requests are not allowed');
        }
        if (!req.headers['content-type']?.startsWith('application/json')) return reply(415, 'Send JSON');

        const chunks: Buffer[] = [];
        let size = 0;
        req.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_LIBRARY_BYTES) {
            reply(413, 'Library too large');
            req.destroy();
          } else {
            chunks.push(chunk);
          }
        });
        req.on('end', () => {
          if (res.writableEnded) return;
          let body: unknown;
          try {
            body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
          } catch {
            return reply(400, 'Invalid JSON');
          }
          const foods = parseLibrary(body);
          if (!foods) return reply(400, 'Not a valid food library');

          const content = serializeLibrary(foods);
          if (existsSync(file) && readFileSync(file, 'utf8') === content) return reply(204);
          try {
            writeFileSync(file, content, 'utf8');
          } catch (error) {
            server.config.logger.error(`Could not write ${LIBRARY_FILE}: ${String(error)}`);
            return reply(500, 'Could not write the library file');
          }
          server.config.logger.info(`${LIBRARY_FILE} updated (${foods.length} foods)`, { timestamp: true });
          reply(204);
        });
      });
    },
    handleHotUpdate(ctx) {
      // The running app already has these foods; reloading the page for them would
      // only interrupt the user. The new file is used on the next page load.
      if (normalizePath(ctx.file) === file) return [];
    },
  };
}

export default defineConfig({
  plugins: [react(), librarySync()],
});
