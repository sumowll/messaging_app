from agno.agent import Agent
from agno.models.ollama import chat, tools
from agno.tools.reasoning import ReasoningTools
from agno.tools.yfinance import YFinanceTools
from agno.tools.sql import SQLTools
import os
from dotenv import load_dotenv
load_dotenv()

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
from logging_ollama import LoggingOllama
wrapped_model = LoggingOllama(id="deepseek-r1:latest")
model = chat.Ollama(id=OLLAMA_MODEL)

reasoning_agent = Agent(
    # model=wrapped_model,
    model=model,
    tools=[
        ReasoningTools(add_instructions=True),
        YFinanceTools(stock_price=True, analyst_recommendations=True, company_info=True, company_news=True, historical_prices=True),
        # SQLTools(list_tables=True, describe_table=True, run_sql_query=True)
    ],
    instructions="Answer concisely. If possible, return compact JSON only.",
    markdown=True,
)
import inspect
print(inspect.signature(ReasoningTools().think))



response_stream = reasoning_agent.run(message="what is the current price of apple and what is the fair value from Morningstar", stream=True, stream_intermediate_steps=True,)


for event in response_stream:
    # Content chunks (either intermediate or final)
    if getattr(event, "content", None):
        # content_type may be "text/plain" etc.; ignore here unless you need branching
        print(event.content, end="", flush=True)

    # Tool events
    elif getattr(event, "tool", None):
        # event.tool likely has fields like name/status/args/result depending on your impl
        status = getattr(event.tool, "status", "called")
        name = getattr(event.tool, "name", None)
        label = f"{name} - {status}" if name else f"{status}"
        print(f"\n[Tool: {label}]\n", flush=True)

    # Started / completed
    elif getattr(event, "event", None) == "run_started":
        print("\n[Run started]\n", flush=True)
    elif getattr(event, "event", None) == "run_completed":
        print("\n\n[Run completed]\n", flush=True)

    # Errors
    elif getattr(event, "error", None):
        print(f"\n[Error] {event.error}\n", flush=True)
