from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import requests

from langchain_ollama import ChatOllama
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.graph import END, MessageGraph

# Create FastAPI app
app = FastAPI()

# === LLM Setup ===
llm = ChatOllama(model="llama3.1")

# === Wrappers for External Tools ===

@tool
def calculator(expression: str) -> str:
    """Solve a math expression by calling the external calculator tool service."""
    try:
        res = requests.post("http://localhost:8001/agent/calculator_tool", json={"expression": expression})
        return res.json().get("result", "No result from calculator tool.")
    except Exception as e:
        return f"Error calling calculator tool: {e}"

@tool
def calendar_tool(query: str) -> str:
    """Create a calendar event using external calendar tool service."""
    try:
        res = requests.post("http://localhost:8002/agent/calendar_tool", json={"query": query})
        return res.json().get("result") or res.json().get("error", "No result from calendar tool.")
    except Exception as e:
        return f"Error calling calendar tool: {e}"

tools = [calculator, calendar_tool]

# Build ReAct agent
react_agent = create_react_agent(llm, tools)


# === Streaming Response ===
async def stream_agent_response(msg: str):
    payload = {"messages": [{"role": "user", "content": msg}]}

    async for chunk, _meta in react_agent.astream(          # ← unpack the tuple
        payload,
        stream_mode="messages",
    ):
        # chunk can be an AIMessageChunk, a BaseMessage, or a plain str
        if isinstance(chunk, str):
            yield chunk.encode()

        elif hasattr(chunk, "content"):
            if chunk.content:                         # skip the heart-beats
                yield chunk.content.encode()


# === FastAPI Endpoint ===

@app.post("/agent/chat")
async def chat_with_agent(request: Request):
    data = await request.json()
    user_msg = data.get("message")
    return StreamingResponse(stream_agent_response(user_msg), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent_server:app", host="0.0.0.0", port=5050, reload=True)
