// server/scripts/ingest_readmes.js
// Fetch README for repos, chunk them, embed with OpenAI, upsert to Pinecone.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENV = process.env.PINECONE_ENV;
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'repomind-index';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

if (!OPENAI_KEY || !PINECONE_API_KEY || !PINECONE_ENV) {
  console.error('Missing OPENAI_API_KEY or PINECONE_API_KEY or PINECONE_ENV in .env');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_KEY });

const pinecone = new PineconeClient();
(async () => {
  await pinecone.init({
    apiKey: PINECONE_API_KEY,
    environment: PINECONE_ENV
  });
})();

// Repos to ingest — edit this list
const REPOS = [
  'EternalKnight002/repo-mind',
  'vercel/next.js',
  'facebook/react'
];

function githubGet(pathname) {
  const options = {
    hostname: 'api.github.com',
    path: pathname,
    method: 'GET',
    headers: {
      'User-Agent': 'RepoMind-Ingest',
      'Accept': 'application/vnd.github.v3.raw' // raw README content for /repos/:owner/:repo/readme
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
          resolve(raw);
        } else {
          reject(new Error(`GitHub API ${res.statusCode}: ${raw}`));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Chunk function: simple sliding window by sentences / words
function chunkText(text, maxTokens = 500) {
  // crude chunker: split by paragraphs, then accumulate until approx maxTokens chars
  const paras = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let buffer = '';
  for (const p of paras) {
    if ((buffer + '\n\n' + p).length > maxTokens && buffer) {
      chunks.push(buffer.trim());
      buffer = p;
    } else {
      buffer = buffer ? (buffer + '\n\n' + p) : p;
    }
  }
  if (buffer) chunks.push(buffer.trim());
  return chunks;
}

// Upsert to Pinecone (batch)
async function upsertVectors(indexName, vectors) {
  const index = pinecone.Index(indexName);
  const BATCH = 50;
  for (let i = 0; i < vectors.length; i += BATCH) {
    const chunk = vectors.slice(i, i + BATCH);
    await index.upsert({ upsertRequest: { vectors: chunk } });
  }
}

// main
(async () => {
  try {
    // ensure data dir
    const outDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    // check or create index (Pinecone)
    const admin = pinecone;
    const existingIndexes = await admin.listIndexes();
    if (!existingIndexes.includes(PINECONE_INDEX)) {
      console.log('Creating Pinecone index:', PINECONE_INDEX);
      // simple index; adjust dimension after embedding call if needed
      await admin.createIndex({
        createRequest: { name: PINECONE_INDEX, dimension: 1536 }
      });
      // Wait a moment if necessary (Pinecone may take a few seconds)
      console.log('Index created (may take a few seconds to become ready).');
    }

    const index = pinecone.Index(PINECONE_INDEX);

    const allVectors = [];

    for (const full of REPOS) {
      console.log('Fetching README for', full);
      const [owner, repo] = full.split('/');
      // fetch raw README via GitHub API
      const readmePath = `/repos/${owner}/${repo}/readme`;
      let content = '';
      try {
        content = await githubGet(readmePath);
      } catch (err) {
        console.warn('Failed to fetch README for', full, err.message);
        content = `# ${full}\n\n(README fetch failed)`;
      }

      const chunks = chunkText(content, 2000); // chunk size ~2000 chars
      console.log(`Created ${chunks.length} chunks for ${full}`);

      // embed all chunks via OpenAI (batch)
      for (let i = 0; i < chunks.length; i += 10) {
        const batch = chunks.slice(i, i + 10);
        const texts = batch.map(t => t.replace(/\n+/g, '\n').slice(0, 8000)); // safety

        const resp = await openai.embeddings.create({
          model: 'text-embedding-3-large',
          input: texts
        });

        const embeddings = resp.data.map(d => d.embedding);
        for (let j = 0; j < embeddings.length; j++) {
          const id = `${full}::chunk::${i + j}`;
          allVectors.push({
            id,
            values: embeddings[j],
            metadata: {
              repo: full,
              chunk_index: i + j,
              text: batch[j].slice(0, 1000) // store short preview
            }
          });
        }
      }
    }

    if (allVectors.length === 0) {
      console.log('No vectors to upsert, exiting.');
      return;
    }

    console.log(`Upserting ${allVectors.length} vectors to Pinecone index ${PINECONE_INDEX}`);
    // upsert in batches
    await upsertVectors(PINECONE_INDEX, allVectors.map(v => ({ id: v.id, values: v.values, metadata: v.metadata })));

    // write a small mapping file so we can show repo-level cards later
    fs.writeFileSync(path.join(outDir, 'repos.json'), JSON.stringify(REPOS, null, 2), 'utf8');
    console.log('Ingest completed successfully.');
  } catch (err) {
    console.error('Ingest failed:', err);
    process.exit(1);
  }
})();
