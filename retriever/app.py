# # retriever/app.py
# from fastapi import FastAPI
# from pydantic import BaseModel
# import faiss
# from sentence_transformers import SentenceTransformer
# import numpy as np

# app = FastAPI()
# embed_model = SentenceTransformer("all-MiniLM-L6-v2")

# # DEMO corpus (replace later)
# CORPUS = [
#     {"id": "doc1", "text": "EBITDA stands for Earnings Before Interest, Taxes, Depreciation, and Amortization. It measures operating profitability."},
#     {"id": "doc2", "text": "Inflation affects bond yields because rising inflation reduces real returns, causing yields to increase."},
#     {"id": "doc3", "text": "Repo rate is the rate at which central banks lend to commercial banks and affects short-term interest rates."},
#     {"id": "doc4", "text": "Company financials show revenue, net income, and EBITDA margins; analysts use EBITDA margin for comparison."}
# ]

# CORPUS_TEXTS = [d["text"] for d in CORPUS]
# CORPUS_VECS = embed_model.encode(CORPUS_TEXTS, convert_to_numpy=True)
# d = CORPUS_VECS.shape[1]
# index = faiss.IndexFlatIP(d)
# faiss.normalize_L2(CORPUS_VECS)
# index.add(CORPUS_VECS)

# class RetrieveRequest(BaseModel):
#     query: str
#     k: int = 4

# @app.post("/retrieve")
# def retrieve(req: RetrieveRequest):
#     qvec = embed_model.encode([req.query], convert_to_numpy=True)
#     faiss.normalize_L2(qvec)
#     D, I = index.search(qvec, req.k)
#     contexts = []
#     for score, idx in zip(D[0], I[0]):
#         if idx < 0:
#             continue
#         contexts.append({
#             "id": CORPUS[idx]["id"],
#             "text": CORPUS[idx]["text"],
#             "score": float(score)
#         })
#     return {"contexts": contexts}






# retriever/app.py
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(title="Simple TF-IDF Retriever (demo)")

# DEMO corpus (replace later with real docs)
CORPUS = [
    {"id": "doc1", "text": "EBITDA stands for Earnings Before Interest, Taxes, Depreciation, and Amortization. It measures operating profitability."},
    {"id": "doc2", "text": "Inflation affects bond yields because rising inflation reduces real returns, causing yields to increase."},
    {"id": "doc3", "text": "Repo rate is the rate at which central banks lend to commercial banks and affects short-term interest rates."},
    {"id": "doc4", "text": "Company financials show revenue, net income, and EBITDA margins; analysts use EBITDA margin for comparison."}
]

DOC_IDS = [d["id"] for d in CORPUS]
DOC_TEXTS = [d["text"] for d in CORPUS]

# Build TF-IDF index once at startup
vectorizer = TfidfVectorizer(stop_words="english")
tfidf_matrix = vectorizer.fit_transform(DOC_TEXTS)  # shape: (n_docs, n_terms)

class RetrieveRequest(BaseModel):
    query: str
    k: int = 4

@app.post("/retrieve")
def retrieve(req: RetrieveRequest):
    query = req.query
    k = min(max(1, int(req.k)), len(DOC_TEXTS))
    q_vec = vectorizer.transform([query])  # shape (1, n_terms)
    sims = cosine_similarity(q_vec, tfidf_matrix)[0]  # shape (n_docs,)

    # Get top-k indices and scores
    top_idx = np.argsort(sims)[::-1][:k]
    contexts = []
    for idx in top_idx:
        score = float(sims[idx])
        if score <= 0.0:
            # if no similarity, still return something with low score
            pass
        contexts.append({
            "id": DOC_IDS[idx],
            "text": DOC_TEXTS[idx],
            "score": score
        })

    return {"contexts": contexts}
