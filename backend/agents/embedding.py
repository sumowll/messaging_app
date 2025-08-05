# 1️⃣ services/embedding_service/main.py
# -------------------------------------------------------------
"""Ingests chat messages, chunks, embeds, and upserts into Qdrant.
Run with: uvicorn services.embedding_service.main:app --host 0.0.0.0 --port 5001
"""
import torch
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime
import os
from typing import List

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain_text_splitters import RecursiveCharacterTextSplitter
# from langchain.embeddings import HuggingFaceEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings
from qdrant_client import QdrantClient
from qdrant_client.http.models import PointStruct

QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))

app = FastAPI(title="Embedding Service")

splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    length_function=len,
)

device = "cuda" if torch.cuda.is_available() else "cpu"
print("Using device:", device)
emb_model = os.getenv("EMB_MODEL", "intfloat/e5-large")
embeddings = HuggingFaceEmbeddings(model_name=emb_model,
                                   model_kwargs={"device": device},
                                   encode_kwargs={"normalize_embeddings": True})


qdrant = QdrantClient(url=QDRANT_URL)

class MessageIn(BaseModel):
    user_id: str
    message_id: str
    text: str
    timestamp: datetime


from qdrant_client.models import Distance, VectorParams

@app.post("/embed", summary="Embed & upsert a single message")
async def embed_message(msg: MessageIn):
    if not msg.text:
        raise HTTPException(status_code=400, detail="Empty text")

    try:
        chunks: List[str] = splitter.split_text(msg.text)
        if not chunks:
            chunks = [msg.text]

        vectors = embeddings.embed_documents(chunks)

        collection_name = msg.user_id
        vector_size = len(vectors[0])

        # Check if collection exists
        collections = qdrant.get_collections().collections
        if collection_name not in [c.name for c in collections]:
            qdrant.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
            )

        points = [
            PointStruct(
                id=f"{msg.user_id}:{msg.message_id}:{i}",
                vector=vectors[i],
                payload={
                    "user_id": msg.user_id,
                    "msg_id": msg.message_id,
                    "chunk_index": i,
                    "timestamp": msg.timestamp.isoformat(),
                },
            )
            for i in range(len(chunks))
        ]

        qdrant.upsert(collection_name=collection_name, wait=True, points=points)
        return {"chunks_indexed": len(points)}

    except Exception as e:
        print("❌ ERROR:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("embedding:app", host="0.0.0.0", port=7000, reload=True)