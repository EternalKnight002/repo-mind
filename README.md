# RepoMind — AI Semantic Search for GitHub

RepoMind is an AI-powered project that lets you **search GitHub repositories by meaning**, not just keywords. It uses embeddings, vector search, and LLM summarization to understand developer queries and return relevant repositories with short AI-generated summaries.

---

## 🚀 Features

* Search GitHub repos using **natural language**
* **AI summaries** of each repo’s README
* **Vector similarity search** using Pinecone or Chroma
* **RAG pipeline** (retrieval-augmented generation)
* Simple REST API for queries

---

## 🧠 Tech Stack

* **Frontend:** Next.js + Tailwind CSS
* **Backend:** Node.js + Express
* **Vector DB:** Pinecone / ChromaDB
* **LLM:** OpenAI GPT-4-turbo (or Gemini)
* **Cache:** Redis (optional)

---

## ⚙️ Setup

```bash
# Clone the repo
git clone https://github.com/your-username/repo-mind.git
cd repo-mind

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Add your API keys

# Start the development servers
npm run dev
```

---

## 🔌 API Example

```bash
POST /api/search
{
  "query": "best open-source AI chatbot frameworks"
}
```

Response:

```json
[
  {
    "repo": "microsoft/semantic-kernel",
    "summary": "A framework for integrating AI models into applications.",
    "stars": 11000
  }
]
```

---

## 📄 License

MIT License © 2025 RepoMind
