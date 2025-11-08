// server/search_vector.js
require('dotenv').config();
const { OpenAI } = require('openai');
const { PineconeClient } = require('@pinecone-database/pinecone');

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_ENV = process.env.PINECONE_ENV;
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'repomind-index';

const openai = new OpenAI({ apiKey: OPENAI_KEY });
const pinecone = new PineconeClient();

async function initPinecone() {
  await pinecone.init({ apiKey: PINECONE_API_KEY, environment: PINECONE_ENV });
  return pinecone.Index(PINECONE_INDEX);
}

async function queryVectorDB(queryText, topK = 5) {
  const index = await initPinecone();

  // embed the query
  const embResp = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: queryText
  });
  const qVec = embResp.data[0].embedding;

  // query pinecone
  const queryResp = await index.query({
    queryRequest: {
      topK,
      includeValues: false,
      includeMetadata: true,
      vector: qVec
    }
  });

  // Normalize into repo cards - group by repo and return highest scoring chunk per repo
  const matches = queryResp.matches || [];
  const repoMap = {};
  for (const m of matches) {
    const repo = m.metadata?.repo || 'unknown';
    if (!repoMap[repo] || m.score > repoMap[repo].score) {
      repoMap[repo] = { repo, score: m.score, snippet: m.metadata?.text || '' };
    }
  }
  // Convert to array
  return Object.values(repoMap).sort((a,b) => b.score - a.score);
}

module.exports = { queryVectorDB };
