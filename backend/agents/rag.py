# run "docker run -p 6333:6333 qdrant/qdrant"

from dotenv import load_dotenv
load_dotenv()                # <-- reads .env in CWD and exports into os.environ

import os
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")


# 2️⃣ services/rag_service/main.py
# -------------------------------------------------------------
"""Query‑time retrieval + generation.
Run with: uvicorn services.rag_service.main:app --host 0.0.0.0 --port 8002
"""
import os
from typing import List
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from langchain.memory import ConversationBufferMemory
from langchain_ollama import OllamaLLM
from langchain_huggingface import HuggingFaceEmbeddings

from langchain_qdrant import RetrievalMode, QdrantVectorStore
from langchain_qdrant import Qdrant

from qdrant_client import QdrantClient

QDRANT_URL = os.getenv("QDRANT_URL", "http://qdrant:6333")
# Use the high‐quality open-source embedding model
EMB_MODEL = os.getenv("EMB_MODEL", "sentence-transformers/all-mpnet-base-v2")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama2:13b")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
TOP_K = int(os.getenv("TOP_K", 6))

app = FastAPI(title="RAG Service")

embeddings = HuggingFaceEmbeddings(model_name=EMB_MODEL)
qdrant_client = QdrantClient(url=QDRANT_URL)
llm = OllamaLLM(model=OLLAMA_MODEL, base_url=OLLAMA_URL)

class QueryIn(BaseModel):
    user_id: str
    question: str
    history: List[List[str]] = []  # [[user, assistant], …]

class QueryOut(BaseModel):
    answer: str
    sources: List[str]

@app.post("/query", response_model=QueryOut)
async def query(q: QueryIn):
    if q.user_id not in [c.name for c in qdrant_client.get_collections().collections]:
        raise HTTPException(status_code=404, detail="No data for user")

    vectordb = Qdrant(
        client=qdrant_client,
        collection_name=q.user_id,
        embeddings=embeddings,
    )
    retriever = vectordb.as_retriever(search_kwargs={"k": TOP_K})

    memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
    for user_msg, ai_msg in q.history:
        memory.chat_memory.add_user_message(user_msg)
        memory.chat_memory.add_ai_message(ai_msg)

    chain = ConversationalRetrievalChain.from_llm(
        llm=llm, retriever=retriever, memory=memory, return_source_documents=True
    )

    result = chain({"question": q.question})
    answer = result["answer"]
    docs = result["source_documents"]
    sources = [f"…{d.page_content[:80]}… (id={d.metadata.get('msg_id')})" for d in docs]

    return QueryOut(answer=answer, sources=sources)

# =============================================================

# 3️⃣ graph/rag_node.py (LangGraph node)
# -------------------------------------------------------------
"""A LangGraph node that wraps the RAG service so other nodes/tools can call it."""
from langgraph.graph import StateGraph
from langchain_core.output_parsers import BaseOutputParser
import requests, os, json

RAG_URL = os.getenv("RAG_URL", "http://rag-service:8002/query")

class RagParser(BaseOutputParser):
    def parse(self, text: str):
        data = json.loads(text)
        return data["answer"]

def build_graph():
    g = StateGraph()

    def rag_call(state):
        payload = {
            "user_id": state["user_id"],
            "question": state["input"],
            "history": state["history"],
        }
        resp = requests.post(RAG_URL, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return {"answer": data["answer"], "sources": data["sources"]}

    g.add_node(rag_call, name="rag")
    g.set_entry_point("rag")
    return g.compile()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("rag:app", host="0.0.0.0", port=7010, reload=True)

# =============================================================

# 4️⃣ docker-compose.yml (minimal prod stack)
# -------------------------------------------------------------
# version: "3.9"
# services:
#   qdrant:
#     image: qdrant/qdrant:v1.9.1
#     volumes:
#       - qdrant_data:/qdrant/storage
#     ports:
#       - "6333:6333"
#   ollama:
#     image: ollama/ollama:latest
#     volumes:
#       - ollama_data:/root/.ollama
#     environment:
#       - OLLAMA_MODELS=llama2:13b
#     ports:
#       - "11434:11434"
#   embedding_service:
#     build: ./services/embedding_service
#     depends_on: [qdrant]
#     environment:
#       - QDRANT_URL=http://qdrant:6333
#   rag_service:
#     build: ./services/rag_service
#     depends_on: [qdrant, ollama]
#     environment:
#       - QDRANT_URL=http://qdrant:6333
#       - OLLAMA_URL=http://ollama:11434
# volumes:
#   qdrant_data:
#   ollama_data:

# =============================================================
# 5️⃣ .env.example
# -------------------------------------------------------------
# QDRANT_URL=http://qdrant:6333
# OLLAMA_URL=http://ollama:11434
# OLLAMA_MODEL=llama2:13b
# EMB_MODEL=sentence-transformers/all-mpnet-base-v2
# TOP_K=6
# CHUNK_SIZE=1000
# CHUNK_OVERLAP=200

# =============================================================
# 6️⃣ Node.js integration snippet (controllers/rag.js)
# -------------------------------------------------------------
# const axios = require("axios");
# exports.askHistory = async (req, res, next) => {
#   const { userId, question, history } = req.body; // history = [[user, ai], ...]
#   try {
#     const { data } = await axios.post("http://rag-service:8002/query", {
#       user_id: userId,
#       question,
#       history,
#     });
#     res.json(data);
#   } catch (err) {
#     next(err);
#   }
# };
# =============================================================
# End of file
