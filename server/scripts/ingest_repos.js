// server/scripts/ingest_repos.js
// Fetch basic repo metadata from GitHub and write to server/data/repos.json
// Usage: GITHUB_TOKEN=xxx node ingest_repos.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const OUT_DIR = path.join(__dirname, '..', 'data');
const OUT_FILE = path.join(OUT_DIR, 'repos.json');

// Edit this list to include repos you want to ingest
const REPOS = [
  'vercel/next.js',
  'facebook/react',
  'EternalKnight002/repo-mind'
];

// Read token from env for higher rate limits (optional)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

function githubGet(pathname) {
  const options = {
    hostname: 'api.github.com',
    path: pathname,
    method: 'GET',
    headers: {
      'User-Agent': 'RepoMind-Ingest-Script',
      'Accept': 'application/vnd.github.v3+json',
    }
  };
  if (GITHUB_TOKEN) options.headers['Authorization'] = `token ${GITHUB_TOKEN}`;

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(raw)); }
          catch (err) { reject(err); }
        } else {
          reject(new Error(`GitHub API ${res.statusCode}: ${raw}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  try {
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

    const results = [];
    for (const full of REPOS) {
      console.log(`Fetching ${full}...`);
      const path = `/repos/${full}`;
      try {
        const repo = await githubGet(path);
        results.push({
          repo: `${repo.owner.login}/${repo.name}`,
          summary: repo.description || 'No description',
          stars: repo.stargazers_count || 0,
          language: repo.language || 'Unknown',
          url: repo.html_url
        });
      } catch (err) {
        console.warn(`Failed to fetch ${full}: ${err.message}. Using fallback mock item.`);
        results.push({
          repo: full,
          summary: 'Fallback—failed to fetch from GitHub',
          stars: 0,
          language: 'Unknown',
          url: `https://github.com/${full}`
        });
      }
    }

    fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2), 'utf8');
    console.log(`Wrote ${results.length} items to ${OUT_FILE}`);
  } catch (err) {
    console.error('Ingest failed:', err);
    process.exit(1);
  }
})();
