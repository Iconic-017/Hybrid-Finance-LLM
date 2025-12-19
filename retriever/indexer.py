# retriever/indexer.py
from sentence_transformers import SentenceTransformer
import faiss
import numpy as np

embed_model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_texts(texts):
    return embed_model.encode(texts, show_progress_bar=True, convert_to_numpy=True)

# example usage:
if __name__ == "__main__":
    docs = ["Quarterly report 2024 Q1 summary ...", "How interest rates affect bond yields ..."]
    vecs = embed_texts(docs)
    dim = vecs.shape[1]
    index = faiss.IndexFlatIP(dim)
    faiss.normalize_L2(vecs)
    index.add(vecs)
    # later: query embedding and search
