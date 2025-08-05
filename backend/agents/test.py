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
    from pydantic import BaseModel, Field

class Event(BaseModel):
    event_title: str = Field(alias="event title")
    start_time: str = Field(alias="start time")
    end_time: str = Field(alias="end time")
from langchain_core.output_parsers import PydanticOutputParser
parser = PydanticOutputParser(pydantic_object=Event)

from langchain_core.prompts import PromptTemplate
prompt = PromptTemplate(
    template="Extract event details from the text.\n{format_instructions}\nText: {text}\n",
    input_variables=["text"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)
from langchain_ollama import OllamaLLM
llm = OllamaLLM(model="deepseek-r1:latest")

input_text = "I have a doctor appointment tomorrow at 9"
prompt_text = prompt.format(text=input_text)
output = llm.invoke(prompt_text)
import re

raw_output = output  # the full raw string from the model

# Remove <think>...</think> blocks or standalone <think> tags
clean_output = re.sub(r"<think>.*?</think>", "", raw_output, flags=re.DOTALL)
clean_output = clean_output.replace("<think>", "").replace("</think>", "").strip()

# Now pass clean_output to your JSON parser
event = parser.invoke(clean_output)

event = parser.invoke(output)
data = event.model_dump(by_alias=True)
print(data)


