# logging_ollama.py
import json
from typing import Any, Dict, Iterable, List, Optional, Type
from pydantic import BaseModel
from agno.models.ollama import chat

class LoggingOllama(chat.Ollama):
    def _log_schema(self, tools, functions, tool_choice, tool_call_limit):
        print("\n=== TOOL SCHEMA SENT TO MODEL ===")
        print(json.dumps(tools or [], indent=2, ensure_ascii=False))
        print("=== FUNCTIONS (if any) ===")
        print(json.dumps(functions or [], indent=2, ensure_ascii=False))
        print("=== TOOL CHOICE / LIMIT ===")
        print(json.dumps({
            "tool_choice": tool_choice,
            "tool_call_limit": tool_call_limit,
        }, indent=2))
        print("=================================\n")

    # Non-streaming
    def response(
        self,
        *,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        functions: Optional[List[Dict[str, Any]]] = None,
        tool_choice: Optional[Any] = None,
        tool_call_limit: Optional[int] = None,
        response_format: Optional[Dict[str, Any] | Type[BaseModel]] = None,
        **kwargs: Any,
    ):
        self._log_schema(tools, functions, tool_choice, tool_call_limit)
        return super().response(
            messages=messages, tools=tools, functions=functions,
            tool_choice=tool_choice, tool_call_limit=tool_call_limit,
            response_format=response_format, **kwargs
        )

    # Streaming
    def response_stream(
        self,
        *,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        functions: Optional[List[Dict[str, Any]]] = None,
        tool_choice: Optional[Any] = None,
        tool_call_limit: Optional[int] = None,
        response_format: Optional[Dict[str, Any] | Type[BaseModel]] = None,
        **kwargs: Any,
    ) -> Iterable[Any]:
        self._log_schema(tools, functions, tool_choice, tool_call_limit)
        yield from super().response_stream(
            messages=messages, tools=tools, functions=functions,
            tool_choice=tool_choice, tool_call_limit=tool_call_limit,
            response_format=response_format, **kwargs
        )
