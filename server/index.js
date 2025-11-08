// Minimal mock Express server for RepoMind
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Allow frontend at http://localhost:3000 (adjust if your frontend runs elsewhere)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
}));
app.use(express.json());

// Static demo data (3 items)
const baseDemo = [
  {
    repo: "vercel/next.js",
    summary: "The React framework for production — hybrid static & server rendering, ISR.",
    stars: 120000,
    language: "TypeScript",
    url: "https://github.com/vercel/next.js"
  },
  {
    repo: "facebook/react",
    summary: "A declarative, efficient, and flexible JavaScript library for building user interfaces.",
    stars: 210000,
    language: "JavaScript",
    url: "https://github.com/facebook/react"
  },
  {
    repo: "EternalKnight002/repo-mind",
    summary: "Demo RepoMind project (semantic README search) — prototype for embeddings + RAG.",
    stars: 42,
    language: "TypeScript",
    url: "https://github.com/EternalKnight002/repo-mind"
  }
];

// Extended demo generator
function makeExtendedDemo(query) {
  // generate 15 items by slightly mutating baseDemo
  const res = [];
  for (let i = 0; i < 15; i++) {
    const base = baseDemo[i % baseDemo.length];
    res.push({
      repo: `${base.repo.split('/')[0]}/mock-${i}`,
      summary: `${base.summary} (mock result ${i} — matched for "${query || ''}")`,
      stars: Math.max(0, base.stars - i * 10),
      language: i % 2 === 0 ? base.language : "JavaScript",
      url: `https://github.com/${base.repo.split('/')[0]}/mock-${i}`
    });
  }
  return res;
}

// Health check
app.get('/', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// POST /api/search
// body: { query: string }
// optional: query param ?mock=extended or ENV EXTENDED_MOCK=true to return a bigger dataset
app.post('/api/search', (req, res) => {
  try {
    const { query } = req.body || {};
    const mockParam = (req.query.mock || '').toLowerCase();
    const extendedByEnv = (process.env.EXTENDED_MOCK || '').toLowerCase() === 'true';

    if (mockParam === 'extended' || extendedByEnv) {
      const extended = makeExtendedDemo(query);
      return res.json(extended);
    }

    // default: return the 3 static demo items (optionally filtered by query)
    if (query && typeof query === 'string' && query.trim().length > 0) {
      const q = query.toLowerCase();
      const filtered = baseDemo.filter(item =>
        item.repo.toLowerCase().includes(q) ||
        (item.summary || '').toLowerCase().includes(q) ||
        (item.language || '').toLowerCase().includes(q)
      );
      return res.json(filtered.length ? filtered : baseDemo);
    }

    return res.json(baseDemo);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`RepoMind mock server listening on http://localhost:${PORT}`);
});
