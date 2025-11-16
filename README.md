📡 RepoMind Server

AI-powered backend for semantic GitHub README search

This folder contains the backend/API server for RepoMind, powering ingestion, embedding, vector search, and AI-generated summaries using Gemini + ChromaDB.

🚀 Features

🔍 Natural-language repo search
Convert user queries → embeddings → retrieve similar README chunks → summarize.

🤖 Gemini embeddings (REST API)
Zero paid services required; fully compatible with Google’s free-tier API.

🧠 RAG pipeline
Chunking → embeddings → vector DB retrieval → LLM summarization.

📦 ChromaDB local vector store
Free, easy-to-set-up, ideal for demo and local development.

🕸 GitHub README scraper
Fetches and normalizes repository README content.

🔐 Fully environment-driven config (.env)

🗂 Folder Structure
server/
│
├── routes/
│   └── searchRoutes.js
│
├── controllers/
│   └── searchController.js
│
├── services/
│   ├── githubService.js
│   ├── geminiEmbedService.js
│   ├── chromaService.js
│   └── summarizerService.js
│
├── jobs/
│   └── ingestRepo.js
│
├── utils/
│   └── chunker.js
│
├── app.js
├── server.js
└── package.json

⚙️ Tech Stack

Node.js + Express

Gemini REST API

ChromaDB (local or persistent directory)

Axios for external API calls

Cheerio for README cleanup

Dotenv for configuration

🔧 Setup Instructions
1️⃣ Install dependencies
cd server
npm install

2️⃣ Create environment file

Create .env:

PORT=5000
GITHUB_TOKEN=your_github_token
GEMINI_API_KEY=your_key
CHROMA_DIR=./chroma


GitHub token optional, but increases rate limits.

3️⃣ Start development server
npm run dev


OR:

node server.js

🛠 Available Scripts
Script	Purpose
npm run dev	Starts server with nodemon
npm start	Starts production server
npm run ingest	Runs ingestion script manually
🧩 API Endpoints
POST /api/search

Search for repositories semantically.

Body:

{
  "query": "react state management libraries",
  "filters": { "language": "JavaScript" }
}


Returns:

Repo name

Clean summary (LLM)

Stars

Links

Matched chunk excerpt

Similarity score

POST /api/ingest

Protected or manual-only (CLI recommended)

{
  "repos": ["owner/repo"]
}


Runs:

Fetch README

Chunk

Embed

Upsert to Chroma

🧵 Data Flow (Backend RAG Pipeline)
GitHub README → Chunk → Gemini Embeddings → ChromaDB
                                 ↑
                           Query Embedding
                                 ↑
                         User Search Query
                                 ↓
                       Chroma similarity KNN
                                 ↓
                       LLM Summary (Gemini)

🪝 Key Services
/services/githubService.js

Fetch README + metadata.

/services/geminiEmbedService.js

We use REST version of Gemini:

POST https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent

/services/chromaService.js

Local vector store with metadata.

/services/summarizerService.js

LLM-based summarization.

🔐 Environment Variables
Name	Description
PORT	Server port
GITHUB_TOKEN	For GitHub API
GEMINI_API_KEY	Gemini REST key
CHROMA_DIR	Vector DB directory

🧭 Roadmap (Server)

 Caching using Redis

 Rate-limit protection middleware

 Batch ingestion of top trending repos

 Repo-to-repo similarity endpoint

 Scheduled weekly refresh job

 ## 📄 License

MIT License © 2025 RepoMind
