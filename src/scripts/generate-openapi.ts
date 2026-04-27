import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as yaml from 'js-yaml';
// @ts-ignore - postman-to-openapi uses default export
import postmanToOpenApi from 'postman-to-openapi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateOpenApi() {
  try {
    // Read Postman collection
    const postmanCollectionPath = join(__dirname, '../../docs/postman-collection.json');
    const postmanCollection = await readFile(postmanCollectionPath, 'utf-8');

    // Output path for OpenAPI spec
    const openApiPath = join(__dirname, '../../docs/openapi.json');

    // Convert to OpenAPI using the function (expects JSON string, output path, and options)
    await (postmanToOpenApi as any)(postmanCollection, openApiPath, {
      defaultTag: 'Content Broadcasting System',
      folderStrategy: 'folders',
      replaceVars: true,
      variableMap: {
        base_url: '/api/v1', // Use relative path for localhost and hosted compatibility
      },
    });

    // Read the generated spec and patch it (it's in YAML format)
    const generatedSpec = await readFile(openApiPath, 'utf-8');
    const spec = yaml.load(generatedSpec) as any;

    // Update server URL to be relative
    if (spec.servers) {
      spec.servers = [{ url: '/api/v1', description: 'API Base Path' }];
    }

    // Add JWT Bearer security scheme
    spec.components = spec.components || {};
    spec.components.securitySchemes = {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login endpoint',
      },
    };

    // Apply security to routes that need it (except public endpoints)
    if (spec.paths) {
      Object.keys(spec.paths).forEach(path => {
        const pathItem = spec.paths[path];
        Object.keys(pathItem).forEach(method => {
          const operation = pathItem[method];
          // Skip public endpoints
          if (path.includes('/auth/') || path.includes('/live/')) {
            return;
          }
          // Add security requirement
          operation.security = operation.security || [{ bearerAuth: [] }];
        });
      });
    }

    // Write the patched spec
    await writeFile(openApiPath, JSON.stringify(spec, null, 2), 'utf-8');

    console.log('✓ OpenAPI spec generated successfully at docs/openapi.json');
  } catch (error) {
    console.error('Error generating OpenAPI spec:', error);
    process.exit(1);
  }
}

generateOpenApi();
