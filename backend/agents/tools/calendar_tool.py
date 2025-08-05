from __future__ import annotations  # Must be first

# ─── Standard Library ────────────────────────────────────────────────────────────
import base64
import json
import os
import pathlib
import pprint
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

# ─── Third-Party Libraries ───────────────────────────────────────────────────────
import dateparser
from dateparser.search import search_dates
from dotenv import load_dotenv
from fastapi import FastAPI
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from pydantic import BaseModel, Field
from typing import Optional

# ─── LangChain ───────────────────────────────────────────────────────────────────
from langchain.output_parsers import OutputFixingParser
from langchain_core.output_parsers import PydanticOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_ollama.llms import OllamaLLM

# ─── Environment Setup ──────────────────────────────────────────────────────────
load_dotenv()

# ─── Constants ──────────────────────────────────────────────────────────────────
TZ = "America/New_York"
NY = ZoneInfo(TZ)

# ─── FastAPI App ────────────────────────────────────────────────────────────────
app = FastAPI()

# ─── Google API Scopes ──────────────────────────────────────────────────────────
SCOPES = ['https://www.googleapis.com/auth/calendar']



# ──────────────────────────────── CONSTANTS ────────────────────────────────
NY_TZ   = ZoneInfo("America/New_York")
TZ_NAME = "America/New_York"              # what Google Calendar wants

# ──────────────────────────────── DATA MODEL ───────────────────────────────
class Event(BaseModel):
    summary:     str = Field()
    start_time:  str = Field()
    end_time: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)

# ────────────────────────────── HELPERS ────────────────────────────────────
def parse_natural(text: str, *, base: datetime | None = None) -> datetime:
    """Parse arbitrary date/time phrases into a tz-aware datetime in America/New_York."""
    dt = dateparser.parse(
        text,
        settings={
            "TIMEZONE":               TZ_NAME,
            "RETURN_AS_TIMEZONE_AWARE": True,
            "PREFER_DATES_FROM":        "future",
            "RELATIVE_BASE":            base or datetime.now(NY_TZ),
        },
    )
    if dt is None:
        raise ValueError(f"Could not parse '{text}'")
    return dt.astimezone(NY_TZ)

# ────────────────────── MAIN FUNCTION ──────────────────────────────────────
def nlp_to_calendar_payload(text: str, *, as_json: bool = False) -> str | dict:
    """
    Convert free-form natural-language text to a Google Calendar event payload.

    Parameters
    ----------
    text     : str
        The raw user request, e.g. "Meet John tomorrow at 3 for an hour".
    as_json  : bool, default False
        If True, return a JSON-formatted string; otherwise return a Python dict.

    Returns
    -------
    str | dict
        A dict (or JSON string) with `summary`, `description`, `start`, `end`.
    """
    # 1.  LLM → structured model  ───────────────────────────────────────────
    # print("Input text:", text)
    llm         = OllamaLLM(model=os.getenv("OLLAMA_MODEL", "deepseek-r1:latest"))
    out_parser  = PydanticOutputParser(pydantic_object=Event)
    today = datetime.now(NY_TZ).strftime("%Y-%m-%d")
    prompt = PromptTemplate(
    template=(
        "You are a JSON-only assistant.\n"
        "Respond **only** with valid JSON that matches this schema:\n"
        "{format_instructions}\n\n"
        "Today's date is {today}.\n\n"
        "Text: {text}"
    ),
    input_variables=["text"],
    partial_variables={
        "format_instructions": out_parser.get_format_instructions(),
        "today": today,
    },
    )
    # print("Prompt template:", prompt.template)

    raw        = llm.invoke(prompt.format(text=text))
    # print("Raw LLM output:", raw)
    clean_raw  = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
    # print("Cleaned LLM output:", clean_raw)
    event_mod  = out_parser.invoke(clean_raw)               # → Event instance
    fields     = event_mod.model_dump(exclude_none=True)    # plain dict
    # print("Parsed fields:", fields)

    # 2.  Natural-language → real datetimes  ────────────────────────────────
    start_dt = parse_natural(fields["start_time"])
    end_dt   = (
        parse_natural(fields["end_time"], base=start_dt)
        if "end_time" in fields
        else start_dt + timedelta(hours=1)
    )

    # print("Parsed start:", start_dt)
    # print("Parsed end:", end_dt)

    if end_dt <= datetime.now(NY_TZ):
        raise ValueError("Event ends in the past; refusing to create it.")

    # 3.  Build Google Calendar body  ───────────────────────────────────────
    payload = {
        "summary":     fields["summary"],
        "description": fields.get("description", ""),
        "start": {"dateTime": start_dt.isoformat(), "timeZone": TZ_NAME},
        "end":   {"dateTime": end_dt.isoformat(),   "timeZone": TZ_NAME},
    }

    return json.dumps(payload, indent=2, ensure_ascii=False) if as_json else payload



SCOPES = ['https://www.googleapis.com/auth/calendar']

def get_calendar_service():

    BASE_DIR = pathlib.Path(__file__).resolve().parent
    creds_path = BASE_DIR.parent.parent / 'credentials' / 'calendarGoogle' / 'credentials.json'
    token_path = BASE_DIR.parent.parent / 'credentials' / 'calendarGoogle' / 'token.json'

    creds = None
    # 1) Load existing tokens if they exist
    if token_path.exists():
        creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)

    # 2) If expired **and** we have a refresh token, refresh in-place
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())

    # 3) Otherwise, or if no valid creds at all, run the full OAuth flow
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(str(creds_path), SCOPES)
        creds = flow.run_local_server(port=0)
        # save for next time
        with open(token_path, 'w') as f:
            f.write(creds.to_json())

    # 4) Build the Calendar API client
    return build('calendar', 'v3', credentials=creds)

class CalendarRequest(BaseModel):
    query: str

@app.post("/tools/calendar_tool")
def handle_calendar(req: CalendarRequest):

    service = get_calendar_service()

    # Parse the request
    try:
        event_body = nlp_to_calendar_payload(req.query)  # This will raise an error if parsing fails
        # print("Parsed request:", event_body)
  
    
    except ValueError as e:
        return {"error": str(e)}

    try:
        created_event = service.events().insert(calendarId='primary', body=event_body).execute()

        full_eid = created_event["htmlLink"].split("eid=")[1]            # base64(calendar+" "+event)
        decoded = base64.urlsafe_b64decode(full_eid + "==").decode()
        _, event_id = decoded.split(" ")
        # re-encode just the event ID
        eid_b64 = base64.urlsafe_b64encode(event_id.encode()).decode().rstrip("=")
        fixed_link = f"https://www.google.com/calendar/event?eid={eid_b64}"
        return {"Event created": fixed_link}

        # return {"result": f"Event created: {created_event.get('htmlLink')}"}
    except HttpError as e:
        print("Status code:", e.status_code)
        # The JSON with ‘domain’, ‘reason’, ‘location’ lives in e.content
        pprint.pprint(json.loads(e.content.decode("utf-8")), indent=2)
        raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("calendar_tool:app", host="0.0.0.0", port=8002, reload=True)
    # query = "Schedule a meeting with John Doe tomorrow at 3 PM for 1 hour."
    # req = CalendarRequest(query=query)
    # response = handle_calendar(req)
    # # response = nlp_to_calendar_payload(query, as_json=True)
    # print(response)