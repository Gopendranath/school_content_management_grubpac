import { Router } from 'express';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

// Serve OpenAPI spec at /api-docs.json
router.get('/openapi.json', async (_req, res) => {
  try {
    const openApiPath = join(__dirname, '../../docs/openapi.json');
    const openApiSpec = await readFile(openApiPath, 'utf-8');
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load OpenAPI spec' });
  }
});

// Serve simple HTML page with Swagger UI at /api-docs
router.get('/', (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Content Broadcasting System API</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
        <style>
          html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
          *, *:before, *:after { box-sizing: inherit; }
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          window.onload = function() {
            const ui = SwaggerUIBundle({
              url: '/api-docs/openapi.json',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.SwaggerUIStandalonePreset
              ],
              layout: "BaseLayout",
              tryItOutEnabled: true
            });
          };
        </script>
      </body>
    </html>
  `);
});

export default router;
