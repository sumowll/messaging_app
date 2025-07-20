from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta, timezone
import os

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/calendar']

app = FastAPI()

class CalendarRequest(BaseModel):
    query: str
    start_time: Optional[str] = None  # ISO 8601 format
    end_time: Optional[str] = None    # ISO 8601 format

def get_calendar_service():
    creds = None
    
    import pathlib
    BASE_DIR = pathlib.Path(__file__).resolve().parent
    creds_path = BASE_DIR.parent.parent / 'credentials' / 'calendarGoogle' / 'credentials.json'
    token_path = BASE_DIR.parent.parent / 'credentials' / 'calendarGoogle' / 'token.json'

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
    else:
        flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
        creds = flow.run_local_server(port=0)
        with open(token_path, 'w') as token:
            token.write(creds.to_json())

    service = build('calendar', 'v3', credentials=creds)
    return service

@app.post("/agent/calendar_tool")
def handle_calendar(req: CalendarRequest):
    service = get_calendar_service()

    # Parse or default times
    now_utc = datetime.now(timezone.utc)

    start = req.start_time or (
        (now_utc + timedelta(hours=1))
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )

    end   = req.end_time   or (
        (now_utc + timedelta(hours=2))
        .isoformat(timespec="seconds")
        .replace("+00:00", "Z")
    )

    event = {
        'summary': req.query,
        'start': {'dateTime': start, 'timeZone': 'UTC'},
        'end': {'dateTime': end, 'timeZone': 'UTC'},
    }

    try:
        created_event = service.events().insert(calendarId='primary', body=event).execute()
        import base64

        full_eid = created_event["htmlLink"].split("eid=")[1]            # base64(calendar+" "+event)
        decoded = base64.urlsafe_b64decode(full_eid + "==").decode()
        _, event_id = decoded.split(" ")
        # re-encode just the event ID
        eid_b64 = base64.urlsafe_b64encode(event_id.encode()).decode().rstrip("=")
        fixed_link = f"https://www.google.com/calendar/event?eid={eid_b64}"
        return {"Event created": fixed_link}

        # return {"result": f"Event created: {created_event.get('htmlLink')}"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("calendar_tool:app", host="0.0.0.0", port=8002, reload=True)