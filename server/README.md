# RepoMind Server

AI-powered backend for semantic GitHub README search using Gemini embeddings + ChromaDB.

---

## 🚀 Features

* Natural-language repo search
* Gemini embeddings (REST)
* RAG pipeline (chunk → embed → store → retrieve → summarize)
* ChromaDB vector storage
* GitHub README scraping
* Express.js API

---

## 🗂 Folder Structure

```
server/
├── routes/
├── controllers/
├── services/
├── jobs/
├── utils/
├── app.js
├── server.js
└── package.json
```

---

## ⚙️ Tech Stack

* Node.js + Express
* Gemini REST API
* ChromaDB
* Axios
* Cheerio
* Dotenv

---

## 🔧 Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env`

```
PORT=5000
GITHUB_TOKEN=your_github_token
GEMINI_API_KEY=your_key
CHROMA_DIR=./chroma
```

### 3. Start server

```bash
npm run dev
```

---

## 🛠 Scripts

| Script           | Description             |
| ---------------- | ----------------------- |
| `npm run dev`    | Start dev server        |
| `npm start`      | Start production server |
| `npm run ingest` | Run ingestion job       |

---

## 🧩 API Endpoints

### **POST /api/search**

Search repositories semantically.

**Body:**

```json
{
  "query": "react state management libraries",
  "filters": { "language": "JavaScript" }
}
```

### **POST /api/ingest**

Trigger ingestion:

```json
{
  "repos": ["owner/repo"]
}
```

---

## 🧵 Data Flow (RAG)

```
GitHub README → Chunk → Gemini Embed → ChromaDB
                                 ↑
                           Query Embedding
                                 ↑
                         User Search Query
                                 ↓
                       Chroma KNN Retrieval
                                 ↓
                       Gemini LLM Summary
```

---

## 🧭 Roadmap

* Add Redis caching
* Add rate limiting
* Weekly ingestion cron job
* Repo-to-repo similarity
* Advanced filters (stars, topics)

---

## 📄 License

MIT License © 2025 RepoMind
