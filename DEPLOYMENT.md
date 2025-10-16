Deployment guide

This repository contains a client (SPA) and a server (Express) in the same monorepo. For straightforward hosting on Vercel, deploy the client only and host the server separately (recommended).

1. Approve native build scripts (if you use pnpm)

If your CI prompts about native build scripts (e.g. @swc/core, esbuild), run locally and commit the approved lockfile:

pnpm approve-builds
git add pnpm-lock.yaml
git commit -m "Approve native build scripts"
git push

This prevents interactive prompts in CI.

2. Client-only deployment to Vercel (recommended)

- Vercel Project Settings > General > Build & Output settings:
  - Install Command: pnpm install
  - Build Command: npm run build:client
  - Output Directory: dist/spa

Alternatively, Vercel will automatically run the script named "vercel-build" if present; this repo provides that script which runs the client build.

- Environment variables (client-side safe):
  - SUPABASE_URL
  - SUPABASE_ANON_KEY

These keys are safe for public clients (anon key) and allow the SPA to talk to Supabase.

3. Server deployment (recommended separate host)

The server requires a Node environment and secret keys (do NOT expose these to public client builds). Host options: Fly, Render, Heroku, Netlify Functions (with adjustments), or a dedicated VPS.

- Build and start (on the server host):
  - npm run build
  - node dist/server/node-build.mjs

- Required environment variables (server-only, keep secret):
  - SUPABASE_SERVICE_ROLE (service role key)
  - SUPABASE_URL
  - SERVICE_ACCOUNT_SECRET_URL or SERVICE_ACCOUNT_JSON (for Firebase admin)
  - ADMIN_KEY (optional admin password used in demo)

4. If you want a single deploy on Vercel (not recommended)

Vercel does not run long-lived Express servers. To run server routes on Vercel you must:

- Convert server routes into Vercel Serverless Functions under /api (refactor Express endpoints to match serverless handler signature), or
- Use a Docker deployment on a Vercel plan that supports custom containers (enterprise/teams).

5. Quick troubleshooting

- If your Vercel build fails with native build script prompts: approve builds (see step 1).
- If dist/server/node-build.mjs is missing, ensure the server build ran (npm run build) and that vite built server artifacts (check build logs).
- If Supabase routes are disabled at runtime, confirm SUPABASE_SERVICE_ROLE and SUPABASE_URL are set in the environment for the server.

6. Changes made in this PR

- Added helper scripts to package.json:
  - "build:client-only": runs the client build only
  - "vercel-build": alias to the client build for Vercel

- Added this DEPLOYMENT.md explaining how to deploy the client to Vercel and where to host the server.

If you want, I can open a PR with these changes now. If you prefer, I can also convert server routes into Vercel serverless functions (this requires more refactor).
