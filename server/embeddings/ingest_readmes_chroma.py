# server/embeddings/ingest_readmes_chroma.py
# Usage:
#   python ingest_readmes_chroma.py
# It will read repos list, fetch READMEs, chunk them, compute embeddings (sentence-transformers),
# and upsert to a local Chroma collection persisted under ./chroma_db

import os
import json
import pathlib
import requests
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv

load_dotenv()

# CONFIG
OUT_DIR = pathlib.Path(__file__).resolve().parents[1] / 'data'
OUT_DIR.mkdir(parents=True, exist_ok=True)
CHROMA_DIR = str(pathlib.Path(__file__).resolve().parents[1] / 'chroma_db')

# Repos to ingest - edit this list
REPOS = [
    "EternalKnight002/repo-mind",
    "vercel/next.js",
    "facebook/react"
]

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "").strip()  # optional, for higher rate limits
MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")  # small & fast

# helper: fetch raw README text using GitHub API (raw content)
def fetch_readme(owner, repo):
    url = f"https://api.github.com/repos/{owner}/{repo}/readme"
    headers = {"User-Agent": "RepoMind-Ingest"}
    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"
    # request raw content
    # Accept header for raw content: application/vnd.github.v3.raw
    r = requests.get(url, headers={**headers, "Accept": "application/vnd.github.v3.raw"})
    if r.status_code == 200:
        return r.text
    else:
        print(f"Warning: failed to fetch README for {owner}/{repo} ({r.status_code})")
        return f"# {owner}/{repo}\n\n(README fetch failed or not found)"

# crude chunker: split by paragraphs and accumulate up to ~max_chars
def chunk_text(text, max_chars=1500):
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks = []
    buffer = ""
    for p in paras:
        if len(buffer) + len(p) + 2 > max_chars:
            if buffer:
                chunks.append(buffer.strip())
            buffer = p
        else:
            buffer = buffer + "\n\n" + p if buffer else p
    if buffer:
        chunks.append(buffer.strip())
    return chunks

def main():
    print("Loading embedding model:", MODEL_NAME)
    model = SentenceTransformer(MODEL_NAME)

    # init chroma client
    client = chromadb.Client(Settings(chroma_db_impl="duckdb+parquet", persist_directory=CHROMA_DIR))

    collection_name = "repomind_readmes"
    # create or get collection
    try:
        collection = client.get_collection(collection_name)
        print(f"Using existing collection: {collection_name}")
    except Exception:
        collection = client.create_collection(name=collection_name)
        print(f"Created new collection: {collection_name}")

    docs_meta = []  # store repo-level metadata for later
    total_vectors = 0

    for repo_full in REPOS:
        owner, repo = repo_full.split("/")
        print(f"\nFetching README for {repo_full} ...")
        content = fetch_readme(owner, repo)
        chunks = chunk_text(content, max_chars=1500)
        print(f" - created {len(chunks)} chunk(s)")

        # embed in batches
        batch_size = 16
        ids = []
        embeddings = []
        metadatas = []
        documents = []  # textual content
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i+batch_size]
            embs = model.encode(batch, show_progress_bar=False)
            for j, emb in enumerate(embs):
                chunk_index = i + j
                vec_id = f"{repo_full}::chunk::{chunk_index}"
                ids.append(vec_id)
                embeddings.append(emb.tolist() if hasattr(emb, "tolist") else list(emb))
                metadatas.append({
                    "repo": repo_full,
                    "chunk_index": chunk_index,
                    "text_preview": batch[j][:800]
                })
                documents.append(batch[j])

        # upsert to chroma
        print(f"Upserting {len(ids)} vectors for {repo_full} ...")
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents
        )
        total_vectors += len(ids)
        docs_meta.append({"repo": repo_full, "chunks": len(ids)})

    # persist chroma DB
    client.persist()
    # write repo mapping file
    OUT_DIR.joinpath("repos.json").write_text(json.dumps(docs_meta, indent=2))
    print(f"\nDone. Upserted {total_vectors} vectors. Chroma DB at: {CHROMA_DIR}")

if __name__ == "__main__":
    main()
