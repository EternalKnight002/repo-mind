# server/embeddings/vector_search_service.py
# Simple Flask API to query local Chroma DB and return repo-level results.
# Run: python vector_search_service.py

from flask import Flask, request, jsonify
import os
import pathlib
import json
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

APP = Flask(__name__)

BASE_DIR = pathlib.Path(__file__).resolve().parents[1]
CHROMA_DIR = str(BASE_DIR / 'chroma_db')
REPOS_FILE = BASE_DIR / 'data' / 'repos.json'

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

print("Loading embedding model:", MODEL_NAME)
model = SentenceTransformer(MODEL_NAME)

client = chromadb.Client(Settings(chroma_db_impl="duckdb+parquet", persist_directory=CHROMA_DIR))
collection_name = "repomind_readmes"
collection = client.get_collection(collection_name)

def aggregate_by_repo(matches):
    repo_map = {}
    for m in matches:
        meta = m.get('metadata', {})
        repo = meta.get('repo', 'unknown')
        score = m.get('distance', None) or m.get('score', None)
        # Chroma may return 'distance' smaller = better for some metric; we'll keep order from results
        snippet = meta.get('text_preview') or ''
        if repo not in repo_map:
            repo_map[repo] = {
                'repo': repo,
                'best_score': score,
                'snippet': snippet,
                'hits': 1
            }
        else:
            repo_map[repo]['hits'] += 1
    # convert to list
    results = list(repo_map.values())
    # sort by hits (descending) — simple heuristic; you can sort by score if available
    results.sort(key=lambda x: x.get('hits', 0), reverse=True)
    return results

@APP.route("/search", methods=["POST"])
def search():
    data = request.get_json() or {}
    query = data.get("query", "")
    top_k = int(data.get("topK", 8))

    if not query or not query.strip():
        return jsonify([])

    # embed query
    q_emb = model.encode([query])[0].tolist()

    # query Chroma
    results = collection.query(
        query_embeddings=[q_emb],
        n_results=top_k,
        include=['metadatas', 'documents', 'distances']
    )

    # results structure: results['metadatas'][0] is list of metadatas
    metadatas = results.get('metadatas', [[]])[0]
    distances = results.get('distances', [[]])[0]
    docs = results.get('documents', [[]])[0]

    matches = []
    for i, m in enumerate(metadatas):
        matches.append({
            'metadata': m,
            'document': docs[i] if i < len(docs) else '',
            'distance': distances[i] if i < len(distances) else None
        })

    repo_agg = aggregate_by_repo(matches)

    # enrich with repo metadata if present in repos.json
    repo_meta_map = {}
    if REPOS_FILE.exists():
        try:
            arr = json.loads(REPOS_FILE.read_text())
            # if arr is list of dicts with repo names or just list, normalize
            for item in arr:
                if isinstance(item, dict) and 'repo' in item:
                    repo_meta_map[item['repo']] = item
                elif isinstance(item, str):
                    repo_meta_map[item] = {}
        except Exception:
            pass

    # map aggregated results to card shape
    cards = []
    for r in repo_agg:
        repo_name = r['repo']
        meta = repo_meta_map.get(repo_name, {})
        card = {
            'repo': repo_name,
            'summary': r.get('snippet') or meta.get('summary') or 'Relevant README snippet',
            'stars': meta.get('stars') or 0,
            'language': meta.get('language') or 'Unknown',
            'url': f"https://github.com/{repo_name}"
        }
        cards.append(card)

    return jsonify(cards)

if __name__ == "__main__":
    port = int(os.getenv("CHROMA_PORT", 5111))
    APP.run(host="0.0.0.0", port=port, debug=False)
