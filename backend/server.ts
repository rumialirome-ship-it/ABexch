/**
 * @deprecated The main application entry point is now located at 'src/server.ts'.
 * This file is intentionally left empty to prevent accidental execution of a stale server instance.
 * Please run the application via the scripts in package.json (e.g., 'npm run dev').
 */
// @google/genai-dev-tool: Fix: Changed import to resolve 'process.exit' type error.
import * as process from 'process';

console.error("DEPRECATION WARNING: You are running the old server entry point at /backend/server.ts.");
console.error("The correct entry point is /backend/src/server.ts.");
console.error("Please update your execution script or use 'npm run dev' or 'npm start'.");
process.exit(1);