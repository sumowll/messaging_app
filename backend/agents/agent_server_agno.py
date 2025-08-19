# -*- coding: utf-8 -*-
from __future__ import annotations

import os, json, requests
from fastapi import FastAPI, Body
from fastapi.responses import StreamingResponse

from agno.agent import Agent
from agno.models.ollama import Ollama
from agno.tools import tool
from agno.storage.dynamodb import DynamoDbStorage
from agno.vectordb.qdrant import Qdrant
from agno.knowledge.json import JSONKnowledgeBase
from agno.api.routes import register_api_routes  # prebuilt FastAPI routes (Agno)

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "deepseek-r1:latest")

# ── Tools (replace StructuredTool with @tool) ──────────────────────────────────
@tool(name="calculator_tool", description="Evaluate arithmetic like 2*(3+4)/7", stop_after_tool_call=True)
def calculator_tool(expression: str) -> str:
    r = requests.post("http://localhost:8001/tools/calculator_tool", json={"expression": expression}, timeout=10)
    r.raise_for_status()
    return r.json()["result"]

@tool(name="calendar_tool", description="Create Google Calendar events from NL text", stop_after_tool_call=True)
def calendar_tool(query: str) -> str:
    r = requests.post("http://localhost:8002/tools/calendar_tool", json={"query": query}, timeout=30)
    r.raise_for_status()
    return json.dumps(r.json(), ensure_ascii=False)

# ── Model ──────────────────────────────────────────────────────────────────────
llm = Ollama(id=OLLAMA_MODEL)

# ── Storage (DynamoDB) ────────────────────────────────────────────────────────
storage = DynamoDbStorage(
    table_name=os.getenv("AGENT_TABLE", "agent_sessions"),
    region_name=os.getenv("AWS_REGION", "us-east-1"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
)

# ── Knowledge (Qdrant) ────────────────────────────────────────────────────────
qdrant = Qdrant(
    collection=os.getenv("QDRANT_COLLECTION", "messages_knowledge"),
    url=os.getenv("QDRANT_URL", "http://localhost:6333"),
    api_key=os.getenv("QDRANT_API_KEY"),
)
knowledge = JSONKnowledgeBase(paths=["./seed/conversations.json"], vector_db=qdrant)

agent = Agent(
    name="react_agent",
    model=llm,
    tools=[calculator_tool, calendar_tool],
    knowledge=knowledge,
    storage=storage,
    add_history_to_messages=True,
    add_datetime_to_instructions=True,
    markdown=True,
    show_tool_calls=True,
)

app = FastAPI()
register_api_routes(app, agent=agent, prefix="/v1")  # Agno’s prebuilt routes

# ── Fallback conversational stream (if you still want it) ─────────────────────
class ChatRequest(BaseException):
    user_msg: str

@app.post("/agents/chat")
async def chat_with_agent(req: ChatRequest = Body(...)):
    async def stream():
        async for chunk, _ in agent.astream({"messages": [{"role": "user", "content": req.user_msg}]},
                                            stream_mode="messages"):
            text = getattr(chunk, "content", "") or str(chunk)
            if text.strip():
                yield text + "\n===========\n"
    return StreamingResponse(stream(), media_type="text/plain")
