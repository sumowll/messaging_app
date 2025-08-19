# First, make sure you have the CUDA-12.9 build of PyTorch installed:
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu129

import torch
import torch.nn as nn
import torch.optim as optim
import torch, os, subprocess, sys

def test_cuda():
    
    print("PyTorch:", torch.__version__)
    print("Wheel CUDA version:", torch.version.cuda)
    print("torch.cuda.is_available():", torch.cuda.is_available())
    print("CUDA_VISIBLE_DEVICES =", os.getenv("CUDA_VISIBLE_DEVICES"))
    try:
        print(subprocess.check_output(["nvidia-smi", "-L"]).decode())
    except Exception as e:
        print("nvidia-smi error:", e)

import re
from datetime import timedelta, timezone
from dateparser.search import search_dates
import dateparser

def nlp_to_calendar_payload(text: str) -> dict:
    # 1. find the first date/time expression
    settings = {
        "PREFER_DATES_FROM": "future",
        "RETURN_AS_TIMEZONE_AWARE": True,
    }
    results = search_dates(text, settings=settings, add_detected_language=False)
    if not results:
        raise ValueError("Could not find a date/time in input")

    matched, dt = results[0]
    
    # 2. normalize to UTC and ISO-format
    start_utc = dt.astimezone(timezone.utc)
    start_iso = start_utc.isoformat(timespec="seconds").replace("+00:00", "Z")
    end_iso = (start_utc + timedelta(hours=1)) \
        .isoformat(timespec="seconds").replace("+00:00", "Z")

    # 3. remove the matched phrase plus any leading preposition
    #    e.g. "for tomorrow at 10pm" or "at 10pm tomorrow"
    pattern = re.compile(
        r"\b(?:for|at|on)\b\s*"            # optional leading preposition
        + re.escape(matched),              # the exact matched text
        flags=re.IGNORECASE
    )
    query = pattern.sub("", text).strip()

    # 4. clean up stray words
    query = re.sub(r"\bat\b|\bfor\b|\bon\b|\?\s*$", "", query, flags=re.IGNORECASE).strip()

    return {
        "query": query,
        "start_time": start_iso,
        "end_time": end_iso,
    }





if __name__ == "__main__":
    import asyncio
from agno.agent import Agent
from agno.models.ollama import chat, tools
from agno.tools.reasoning import ReasoningTools
from agno.tools.yfinance import YFinanceTools
from agno.tools.sql import SQLTools
import os
from dotenv import load_dotenv
load_dotenv()

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.1")
# reasoning_agent = Agent(
#     model=chat.Ollama(id=OLLAMA_MODEL),
#     tools=[
#         ReasoningTools(add_instructions=True),
#         YFinanceTools(stock_price=True, analyst_recommendations=True, company_info=True, company_news=True, historical_prices=True),
#         # SQLTools(list_tables=True, describe_table=True, run_sql_query=True)
#     ],
#     instructions="Answer concisely. If possible, return compact JSON only.",
#     markdown=True,
# )
# import inspect
# print(inspect.signature(ReasoningTools().think))


from logging_model import LoggingOllama
from agno.models.ollama import chat

wrapped_model = LoggingOllama(chat.Ollama(id="deepseek-r1:latest"))

reasoning_agent = Agent(
    model=wrapped_model,
    tools=[
        ReasoningTools(add_instructions=True),
        YFinanceTools(stock_price=True, analyst_recommendations=True, company_info=True, company_news=True, historical_prices=True)
        ],
    instructions="Answer concisely. If possible, return compact JSON only.",
    markdown=True,
)

reasoning_agent.run(
    "What is the current stock price of Apple? What is the latest news about it?",
    stream=True)

