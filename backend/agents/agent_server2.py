from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
# from langchain_community.chat_models import ChatOllama // deprecated, use langchain_ollama instead
from langchain_ollama import ChatOllama
# from langchain.agents.tools import Tool # // deprecated, use langchain.tools instead
from langchain.tools import tool
import json
import asyncio

app = FastAPI()

# Initialize model
llm = ChatOllama(model="llama3.1:8b", temperature=0)

# Define tools
@tool(description="Evaluate a math expression like '2 + 2'")
def calculator(expression: str) -> str:
    return str(eval(expression))


# !!!!!!!!!!!!!!!!!!!!!!!! I will start with create_react_agent, but later I will implement the ReAct langgraph manually
from langgraph.prebuilt import create_react_agent

react_agent = create_react_agent(llm, tools=[calculator])


from langchain.schema import HumanMessage, SystemMessage
# Format a ReAct prompt manually
def build_prompt(user_question, thoughts):
    tool_descriptions = "\n".join([f"{name}: {info['description']}" for name, info in tools.items()])
    return [
        SystemMessage(content=f"""You are a helpful agent that can use tools to solve problems.
Available tools:
{tool_descriptions}

Use the format:
Thought: what you want to do
Action: the tool to use
Action Input: the input to the tool
Observation: tool output
... (repeat)
Final Answer: the final answer to the user's question
"""),
        HumanMessage(content=f"Question: {user_question}\n\n{thoughts}")
    ]

# ReAct loop
async def run_react_agent(user_question):
    thoughts = ""
    for _ in range(5):  # max 5 steps
        messages = build_prompt(user_question, thoughts)
        response = llm.invoke(messages).content.strip()

        if "Final Answer:" in response:
            final = response.split("Final Answer:")[-1].strip()
            yield final
            return

        elif "Action:" in response:
            # Parse tool name and input
            try:
                action_line = next(line for line in response.splitlines() if line.startswith("Action:"))
                input_line = next(line for line in response.splitlines() if line.startswith("Action Input:"))
                tool_name = action_line.split("Action:")[1].strip()
                tool_input = input_line.split("Action Input:")[1].strip()
                result = tools[tool_name]["func"](tool_input)
                thoughts += f"{response}\nObservation: {result}\n"
            except Exception as e:
                yield f"[Error] Failed to run tool: {e}"
                return
        else:
            yield "[Error] Unexpected response format"
            return

    yield "[Error] Max steps reached"

# FastAPI route
@app.post("/agent/chat")
async def chat_with_agent(request: Request):
    data = await request.json()
    user_msg = data.get("message")

    if not user_msg:
        return {"error": "Message required"}

    async def event_stream():
        async for chunk in run_react_agent(user_msg):
            yield chunk

    return StreamingResponse(event_stream(), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("agent_server2:app", host="0.0.0.0", port=5050, reload=True)