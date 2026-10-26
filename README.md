# Cognitrace frontend

React + TypeScript + Vite frontend for Cognitrace. Existing screens and styling remain, but real API mode is intentionally limited to routes the FastAPI backend implements.

## Local setup (PowerShell)

~~~powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
~~~

The Vite development server prints its local URL (normally http://localhost:5173). To make a production build, run npm run build. To run adapter unit tests offline, run npm test.

## Modes

Local development defaults to demo mode unless `VITE_USE_MOCK_API=false` is set. Production builds use the real backend unless `VITE_USE_MOCK_API=true` is explicitly set. The UI shows a DEMO MODE badge whenever mock data is active.

Real mode uses Supabase Auth, keeps its user token in memory only, and submits the complete set of notes once when the user completes a session. Drafts do not persist across refreshes. The backend supports session create-and-extract, history, and individual reads. It does not yet support incremental AI chat, deletion, pattern-history retrieval, recommendations, or feedback; those controls are not presented as working integrations.

## Environment variables

Copy the placeholders from .env.example to .env.local:

- VITE_API_BASE_URL: non-secret backend URL; defaults to https://cognitrace-ai.onrender.com/api.
- VITE_USE_MOCK_API: use `true` for a local demo; set `false` in hosted production to force real API mode.
- VITE_SUPABASE_URL: public project URL.
- VITE_SUPABASE_PUBLISHABLE_KEY: public client key intended for browser use. It is not a Supabase secret/service-role key.

Do not put GEMINI_API_KEY, COGNITRACE_API_TOKEN, a Supabase secret key, or any server credential in a VITE_* variable. Vite embeds those values into public JavaScript.

The backend must have SUPABASE_URL, a Gemini key, CORS_ALLOWED_ORIGINS, and COGNITRACE_DB_PATH set on the server. For bearer headers, the backend keeps allow_credentials=false and the client uses credentials: omit.

## Hosted deployment checklist

Add these as frontend **build environment variables** in the hosting provider, then trigger a fresh deployment. Vite embeds them at build time; changing runtime settings without rebuilding will not update the frontend bundle.

- `VITE_USE_MOCK_API=false`
- `VITE_API_BASE_URL=https://cognitrace-ai.onrender.com/api` (or the actual deployed backend URL ending in `/api`)
- `VITE_SUPABASE_URL` set to the deployed Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` set to that project's publishable key

The frontend cannot authenticate against the backend until the Supabase values are real. The backend's `CORS_ALLOWED_ORIGINS` must include the exact hosted frontend origin. Never place Gemini, database, or Supabase service-role secrets in frontend variables.

## Current backend mapping

- POST /sessions posts { "session_text": "..." } and returns the existing workflow result.
- GET /sessions?limit=100&offset=0 reads the authenticated user's history.
- GET /sessions/{session_id} reads one session owned by the current user.

The base URL already ends in /api; these route paths are appended by src/api/backendAdapter.ts. No unsupported auth, message, analysis, delete, pattern, recommendation, or feedback API routes are called.
