
from __future__ import annotations

import asyncio, json, requests
from pydantic import BaseModel, Field

from langchain.tools import StructuredTool
from langchain_ollama import ChatOllama   # or any chat-LLM that supports function/tool calling
from langgraph.prebuilt import create_react_agent
import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request
from pydantic import BaseModel
from fastapi import Body, FastAPI
from fastapi.responses import StreamingResponse

# ────────────────────────────────
# 1)  Wrap the HTTP tools
# ────────────────────────────────
# Calculator -------------------------------------------------------------
class CalcArgs(BaseModel):
    expression: str = Field(..., description="A valid arithmetic expression.")

def _remote_calc(expression: str) -> str:
    r = requests.post(
        "http://localhost:8001/tools/calculator_tool",
        json={"expression": expression},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["result"]

calculator_tool = StructuredTool.from_function(
    name="calculator_tool",
    description="Evaluate arithmetic like '2*(3+4)/7'.",
    args_schema=CalcArgs,
    func=_remote_calc,
    return_direct=True,   # stream result back verbatim
)

# Calendar ---------------------------------------------------------------
class CalArgs(BaseModel):
    query: str = Field(..., description="Natural-language request to create an event.")

def _remote_calendar(query: str) -> str:
    r = requests.post(
        "http://localhost:8002/tools/calendar_tool",
        json={"query": query},
        timeout=30,
    )
    r.raise_for_status()
    return json.dumps(r.json(), ensure_ascii=False)

calendar_tool = StructuredTool.from_function(
    name="calendar_tool",
    description="Create a Google Calendar event from text like "
                "'Lunch with Alice next Wed 12–1'.",
    args_schema=CalArgs,
    func=_remote_calendar,
    return_direct=True,
)

TOOLS = [calculator_tool, calendar_tool]

# ────────────────────────────────
# 2)  Choose an LLM
# ────────────────────────────────
llm = ChatOllama(model=os.getenv("OLLAMA_MODEL", "deepseek-r1:latest"))

# ────────────────────────────────
# 3)  Build & test the graph
# ────────────────────────────────
react_agent = create_react_agent(llm, TOOLS)
# Create FastAPI app
app = FastAPI()
# ────────────────────────────────
class ChatRequest(BaseModel):
    user_msg: str

@app.post("/agents/chat")
async def chat_with_agent(req: ChatRequest = Body(...)):
    payload = {"messages": [{"role": "user", "content": req.user_msg}]}

    async def stream_agent_response():
        sent_anything = False

        async for chunk, _ in react_agent.astream(payload, stream_mode="messages"):
            # chunk is usually an AIMessage / ToolMessage / str
            text = getattr(chunk, "content", "") or str(chunk)
            if text.strip():
                sent_anything = True
                yield text + "\n===========\n"

        # If the loop never yielded, the agent skipped tools and went straight
        # to its final answer.  Do a one-shot call and return that text.
        if not sent_anything:
            final_msg = await react_agent.invoke(payload)
            # final_msg is an AIMessage; its .content holds the answer text.
            yield final_msg.content + "\n"

    return StreamingResponse(stream_agent_response(),
                             media_type="text/plain")



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent_server:app", host="0.0.0.0", port=5050, reload=True)
    # asyncio.run(chat_with_agent("What is (3*7+2)/5? Also schedule coffee with John Doe tomorrow at 10 AM for an hour and give me the link."))
 

