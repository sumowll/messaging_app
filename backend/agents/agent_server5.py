from fastapi import FastAPI
from langchain_core.tools import tool
from langserve import add_routes
from langgraph.graph import StateGraph, END
from langchain_core.runnables import RunnableLambda
import requests
from typing import TypedDict, Optional

# === Define MCP tools as LangChain tools ===
@tool
def calendar_tool(query: str) -> str:
    """Check the calendar or create an event.""" 
    res = requests.post("http://localhost:8001/agent/calendar_tool", json={"query": query})
    return res.json().get("result", "No calendar result")

@tool
def calculator_tool(expression: str) -> str:
    """Evaluate a basic math expression.""" 
    res = requests.post("http://localhost:8002/agent/calculator_tool", json={"expression": expression})
    return res.json().get("result", "No calculator result")

# === Define a state schema ===

class GraphState(TypedDict):
    input: str
    tool: Optional[str]
    arg: Optional[str]

# === Define a simple planner node ===

def planner_node(state: GraphState) -> GraphState:
    text = state["input"].lower()
    if "calendar" in text or "meeting" in text:
        return {"input": state["input"], "tool": "calendar_tool", "arg": text}
    elif "add" in text or "multiply" in text or any(c.isdigit() for c in text):
        return {"input": state["input"], "tool": "calculator_tool", "arg": text}
    else:
        return {"input": state["input"], "tool": None, "arg": "I don't know what to do."}

# === Build LangGraph ===

graph_builder = StateGraph(GraphState)
graph_builder.add_node("planner", RunnableLambda(planner_node))
graph_builder.add_node("calendar_tool", calendar_tool)
graph_builder.add_node("calculator_tool", calculator_tool)

graph_builder.set_entry_point("planner")

# Routes to tool nodes
graph_builder.add_conditional_edges("planner", 
    lambda x: x["tool"] or END, 
    {
        "calendar_tool": "calendar_tool",
        "calculator_tool": "calculator_tool",
        None: END
    }
)

# Send output of tool nodes to END
graph_builder.add_edge("calendar_tool", END)
graph_builder.add_edge("calculator_tool", END)

app = FastAPI()

add_routes(app, graph_builder.compile(), path="/agent")



if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent_server5:app", host="0.0.0.0", port=5050, reload=True)