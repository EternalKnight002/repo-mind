## Mock backend (server)

A minimal Express mock server for local dev.

Install & run:

```bash
cd server
npm install

# dev (auto-restarts on change)
npm run dev

# production
npm start

# Ingest GitHub metadata

# Optional: create a GitHub personal access token (no scopes needed for public repos) and set:
# (Linux / macOS)
GITHUB_TOKEN=ghp_xxx npm run ingest

# (Windows PowerShell)
$env:GITHUB_TOKEN="ghp_xxx"; npm run ingest

# Then run the server:
npm run dev
