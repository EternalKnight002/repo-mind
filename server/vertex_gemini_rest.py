# server/embeddings/vertex_gemini_rest.py
# Helpers to call Vertex AI / Gemini embedding model via REST using a service account.

import os
import requests
import json
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from typing import List

# load env (if you already call dotenv elsewhere, this is optional)
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

PROJECT_ID = os.getenv("GOOGLE_PROJECT_ID")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
SERVICE_ACCOUNT_FILE = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")  # path to service account json
# Recommended model: gemini-embedding-001 (high quality). Use textembedding-gecko@003 or others if you prefer.
MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")

if not PROJECT_ID or not SERVICE_ACCOUNT_FILE:
    # We do not immediately raise here so the module can be imported in environments
    # where these are intentionally set later. But print a friendly hint.
    print("Warning: GOOGLE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS not set; set them before calling embed functions.")

SCOPES = ["https://www.googleapis.com/auth/cloud-platform"]

def _get_access_token(service_account_file: str = None) -> str:
    """
    Return an access token string by loading the service account and refreshing credentials.
    Requires google-auth.
    """
    sa_file = service_account_file or SERVICE_ACCOUNT_FILE
    if not sa_file:
        raise RuntimeError("Service account JSON path required in GOOGLE_APPLICATION_CREDENTIALS")
    creds = service_account.Credentials.from_service_account_file(sa_file, scopes=SCOPES)
    creds.refresh(Request())
    if not creds.token:
        raise RuntimeError("Failed to obtain access token from service account")
    return creds.token

def embed_texts_gemini_rest(texts: List[str], project_id: str = None, location: str = None,
                            model: str = None, service_account_file: str = None,
                            auto_truncate: bool = True) -> List[List[float]]:
    """
    Embed a list of texts using Gemini via REST.
    Returns: list of embedding vectors (one per input text).
    Notes:
      - For gemini-embedding-001 the docs indicate only one input per request is allowed;
        this function will safely loop requests if necessary.
      - For other models that accept batches you could adapt to send multiple inputs per request.
    """
    project_id = project_id or PROJECT_ID
    location = location or LOCATION or "us-central1"
    model = model or MODEL or "gemini-embedding-001"
    token = _get_access_token(service_account_file)

    base_url = f"https://{location}-aiplatform.googleapis.com/v1/projects/{project_id}/locations/{location}/publishers/google/models/{model}:predict"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8",
    }

    embeddings = []

    # If model requires one-instance-per-request (gemini), loop.
    # For models that support multiple instances per request, you could batch here.
    for text in texts:
        body = {
            "instances": [
                {"content": text}
            ],
            "parameters": {
                "autoTruncate": auto_truncate
            }
        }
        resp = requests.post(base_url, headers=headers, json=body, timeout=60)
        if resp.status_code != 200:
            raise RuntimeError(f"Vertex AI embeddings request failed: {resp.status_code} {resp.text}")
        j = resp.json()
        # Response format per docs: {"predictions":[{"embeddings":{"values":[...], "statistics":{...}}}]}
        # navigate safely
        pred = j.get("predictions", [{}])[0]
        emb_obj = pred.get("embeddings") or pred.get("embedding") or {}
        values = emb_obj.get("values") or emb_obj.get("values", None)
        if values is None:
            # some model responses wrap differently; try to find numeric array
            # fallback: walk the dict for a list
            def find_list(obj):
                if isinstance(obj, list) and all(isinstance(x, (int, float)) for x in obj):
                    return obj
                if isinstance(obj, dict):
                    for v in obj.values():
                        found = find_list(v)
                        if found is not None:
                            return found
                return None
            values = find_list(j)
        if values is None:
            raise RuntimeError(f"Could not parse embedding vector from Vertex response: {json.dumps(j)[:1000]}")
        embeddings.append(values)
    return embeddings
