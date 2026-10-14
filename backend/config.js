import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';

// Resolve configuration beside the backend, including when launched from elsewhere.
try { loadEnvFile(fileURLToPath(new URL('./.env', import.meta.url))); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
