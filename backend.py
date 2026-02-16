Backend folder structure (simple + safe)
backend/
  app/
    main.py
    routes_chat.py
    schemas.py
    storage_json.py
    llm_client.py
  data/
    chats.json
  requirements.txt
  .env

1) backend/data/chats.json (create this file)
{
  "chats": []
}

2) backend/requirements.txt
fastapi
uvicorn
pydantic
python-dotenv
httpx

3) backend/.env (placeholders; DO NOT hardcode secrets in code)
DATA_FILE=./data/chats.json
CORS_ORIGINS=http://localhost:5173

# Later (optional): LLM provider endpoint + token settings (placeholders)
LLM_BASE_URL=https://YOUR_LLM_HOST
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=YOUR_KEY_HERE

4) backend/app/schemas.py
from pydantic import BaseModel  # Import BaseModel to define request/response schemas.
from typing import List, Literal, Optional  # Import typing helpers for strong type hints.


class ChatSummary(BaseModel):  # Define what sidebar needs for each chat.
    id: str  # Unique identifier of chat.
    title: str  # Title shown in sidebar.
    updatedAt: str  # ISO timestamp string used for sorting and display.


class ChatMessage(BaseModel):  # Define a single message shape stored in JSON and returned to UI.
    id: str  # Unique identifier of message.
    role: Literal["user", "assistant"]  # Restrict role values to user/assistant.
    content: str  # Message text.
    createdAt: str  # ISO timestamp string for ordering.


class ListChatsResponse(BaseModel):  # Define response wrapper for listing chats.
    chats: List[ChatSummary]  # List of chat summaries.


class CreateChatRequest(BaseModel):  # Define request schema for creating a chat.
    title: Optional[str] = "New chat"  # Title can be optional and defaults to "New chat".


class RenameChatRequest(BaseModel):  # Define request schema for renaming a chat.
    title: str  # New title text is required.


class SendMessageRequest(BaseModel):  # Define request schema for streaming endpoint.
    message: str  # User query text to be processed by backend/LLM.

5) backend/app/storage_json.py (JSON “database”)
import json  # Import json to read and write JSON files.
import os  # Import os for file path operations.
import uuid  # Import uuid to generate unique IDs.
from datetime import datetime, timezone  # Import datetime utilities for timestamps.
from typing import Any, Dict, List, Optional  # Import types for clarity.
import asyncio  # Import asyncio for async file lock coordination.


def now_iso() -> str:  # Create helper to generate consistent ISO timestamps.
    return datetime.now(timezone.utc).isoformat()  # Return UTC ISO formatted timestamp.


class JsonChatStore:  # Create a JSON-backed storage layer (acts like a tiny DB).
    def __init__(self, file_path: str) -> None:  # Initialize store with a file path.
        self.file_path = file_path  # Save path to JSON file.
        self._lock = asyncio.Lock()  # Create an async lock to prevent concurrent writes.

    async def _ensure_file(self) -> None:  # Ensure the JSON file exists with correct structure.
        os.makedirs(os.path.dirname(self.file_path), exist_ok=True)  # Create parent directory if missing.
        if not os.path.exists(self.file_path):  # Check if file is missing.
            async with self._lock:  # Lock before creating to avoid race conditions.
                if not os.path.exists(self.file_path):  # Re-check inside lock.
                    with open(self.file_path, "w", encoding="utf-8") as f:  # Open file for writing.
                        json.dump({"chats": []}, f, ensure_ascii=False, indent=2)  # Write empty store.

    async def _read(self) -> Dict[str, Any]:  # Read JSON store from disk.
        await self._ensure_file()  # Ensure file exists first.
        async with self._lock:  # Lock for safe read (consistent with writes).
            with open(self.file_path, "r", encoding="utf-8") as f:  # Open file for reading.
                return json.load(f)  # Parse and return JSON data.

    async def _write(self, data: Dict[str, Any]) -> None:  # Write JSON store to disk.
        await self._ensure_file()  # Ensure file exists first.
        async with self._lock:  # Lock to prevent concurrent writes.
            with open(self.file_path, "w", encoding="utf-8") as f:  # Open file for writing.
                json.dump(data, f, ensure_ascii=False, indent=2)  # Write JSON pretty formatted.

    async def list_chats(self, search: str = "") -> List[Dict[str, Any]]:  # Return chat summaries.
        data = await self._read()  # Read full store.
        chats = data.get("chats", [])  # Extract chats list.
        if search:  # If search query present.
            s = search.lower().strip()  # Normalize search query.
            chats = [c for c in chats if s in c.get("title", "").lower()]  # Filter by title match.
        chats.sort(key=lambda c: c.get("updatedAt", ""), reverse=True)  # Sort newest first.
        return [{"id": c["id"], "title": c["title"], "updatedAt": c["updatedAt"]} for c in chats]  # Map to summary.

    async def create_chat(self, title: str) -> Dict[str, Any]:  # Create a new chat in store.
        data = await self._read()  # Read store.
        chat_id = str(uuid.uuid4())  # Generate chat id.
        chat = {  # Build chat object.
            "id": chat_id,  # Store chat id.
            "title": title or "New chat",  # Store title.
            "updatedAt": now_iso(),  # Store updated timestamp.
            "messages": [],  # Initialize message list.
        }
        data["chats"].append(chat)  # Append chat to store.
        await self._write(data)  # Persist changes.
        return {"id": chat["id"], "title": chat["title"], "updatedAt": chat["updatedAt"]}  # Return summary.

    async def rename_chat(self, chat_id: str, title: str) -> None:  # Rename an existing chat.
        data = await self._read()  # Read store.
        for c in data.get("chats", []):  # Loop through chats.
            if c.get("id") == chat_id:  # Find matching chat.
                c["title"] = title  # Update title.
                c["updatedAt"] = now_iso()  # Update timestamp.
                await self._write(data)  # Persist changes.
                return  # Exit function.
        raise KeyError("Chat not found")  # Raise if chat does not exist.

    async def delete_chat(self, chat_id: str) -> None:  # Delete a chat.
        data = await self._read()  # Read store.
        before = len(data.get("chats", []))  # Store count before deletion.
        data["chats"] = [c for c in data.get("chats", []) if c.get("id") != chat_id]  # Filter out chat.
        after = len(data.get("chats", []))  # Store count after deletion.
        if after == before:  # If nothing removed.
            raise KeyError("Chat not found")  # Raise not found.
        await self._write(data)  # Persist changes.

    async def list_messages(self, chat_id: str) -> List[Dict[str, Any]]:  # Return messages for a chat.
        data = await self._read()  # Read store.
        for c in data.get("chats", []):  # Loop chats.
            if c.get("id") == chat_id:  # Match chat.
                return c.get("messages", [])  # Return messages list.
        raise KeyError("Chat not found")  # Raise if missing.

    async def append_message(self, chat_id: str, role: str, content: str) -> Dict[str, Any]:  # Add a message.
        data = await self._read()  # Read store.
        for c in data.get("chats", []):  # Loop chats.
            if c.get("id") == chat_id:  # Match chat.
                msg = {  # Build message object.
                    "id": str(uuid.uuid4()),  # Generate unique message id.
                    "role": role,  # Store role.
                    "content": content,  # Store content.
                    "createdAt": now_iso(),  # Store timestamp.
                }
                c.setdefault("messages", []).append(msg)  # Append message safely.
                c["updatedAt"] = now_iso()  # Update chat updatedAt.
                await self._write(data)  # Persist changes.
                return msg  # Return created message.
        raise KeyError("Chat not found")  # Raise if missing.

6) backend/app/llm_client.py (today: direct LLM; later: RAG + FAISS)

This file provides streaming tokens to the SSE endpoint.

import os  # Import os to read environment variables.
import asyncio  # Import asyncio to simulate streaming in demo mode.
from typing import AsyncGenerator  # Import AsyncGenerator for streaming responses.
import httpx  # Import httpx for async HTTP requests to external LLM services.


class LLMClient:  # Define a client wrapper for your LLM calls.
    def __init__(self) -> None:  # Initialize client.
        self.base_url = os.getenv("LLM_BASE_URL", "").strip()  # Read base URL from env.
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini").strip()  # Read model name from env.
        self.api_key = os.getenv("LLM_API_KEY", "").strip()  # Read API key from env.

    async def generate_stream(self, user_text: str) -> AsyncGenerator[str, None]:  # Stream assistant output.
        # If no base_url/api_key configured, we run a safe demo stream so frontend works.
        if not self.base_url or not self.api_key:  # Check configuration.
            demo = f"Demo response (no LLM configured): you said -> {user_text}"  # Create demo text.
            for ch in demo:  # Stream character-by-character to mimic tokens.
                await asyncio.sleep(0.01)  # Tiny delay to show streaming effect.
                yield ch  # Yield one character as a delta.
            return  # End generator.

        # Example generic LLM call (you will adapt this to your VOX/OpenAI gateway later).
        headers = {  # Prepare request headers.
            "Authorization": f"Bearer {self.api_key}",  # Use bearer token from env.
            "Content-Type": "application/json",  # Send JSON payload.
        }

        payload = {  # Prepare minimal payload.
            "model": self.model,  # Model name.
            "input": user_text,  # User input.
            "stream": True,  # Ask server to stream (depends on provider).
        }

        async with httpx.AsyncClient(timeout=None) as client:  # Create async HTTP client with no timeout for streams.
            async with client.stream("POST", f"{self.base_url}/chat", headers=headers, json=payload) as r:  # Make streaming request.
                r.raise_for_status()  # Raise if server returns error.
                async for line in r.aiter_lines():  # Iterate incoming lines.
                    if not line:  # Skip empty lines.
                        continue  # Continue loop.
                    # In real providers you parse event format; here we just yield raw line text.
                    yield line  # Yield delta to caller.


✅ Today it works even without LLM credentials.
Later we’ll replace payload/parsing to match your VOX token + LLM API (from your screenshots) and keep the same generate_stream() interface.

7) backend/app/routes_chat.py (all APIs + SSE streaming)
import json  # Import json to serialize SSE payloads.
from fastapi import APIRouter, HTTPException, Query  # Import router tools and HTTPException for errors.
from fastapi.responses import StreamingResponse  # Import StreamingResponse for SSE streaming.
from typing import AsyncGenerator  # Import AsyncGenerator for streaming generator.
from .schemas import CreateChatRequest, RenameChatRequest, SendMessageRequest  # Import request schemas.
from .storage_json import JsonChatStore  # Import JSON storage layer.
from .llm_client import LLMClient  # Import LLM client wrapper.


router = APIRouter(prefix="/api", tags=["chat"])  # Create a router with /api prefix and tag it.


def sse_event(event: str, data_obj: dict) -> str:  # Create a helper to format SSE event frames.
    return f"event: {event}\n" f"data: {json.dumps(data_obj)}\n\n"  # Return correctly formatted SSE string.


@router.get("/chats")  # Define endpoint: GET /api/chats
async def get_chats(search: str = Query(default="")):  # Accept optional search query.
    store = router.state.store  # Access shared store injected from app startup.
    chats = await store.list_chats(search=search)  # Load chats from JSON file.
    return chats  # Return list (frontend expects array of summaries).


@router.post("/chats")  # Define endpoint: POST /api/chats
async def post_chats(body: CreateChatRequest):  # Accept request body for create chat.
    store = router.state.store  # Access JSON store.
    created = await store.create_chat(title=body.title or "New chat")  # Create a chat in JSON file.
    return created  # Return created chat summary.


@router.patch("/chats/{chat_id}")  # Define endpoint: PATCH /api/chats/{id}
async def patch_chat(chat_id: str, body: RenameChatRequest):  # Accept chat id + new title.
    store = router.state.store  # Access JSON store.
    try:  # Handle not-found safely.
        await store.rename_chat(chat_id=chat_id, title=body.title)  # Rename chat in JSON file.
        return {"ok": True}  # Return success.
    except KeyError:  # If chat id not found.
        raise HTTPException(status_code=404, detail="Chat not found")  # Return 404 to frontend.


@router.delete("/chats/{chat_id}")  # Define endpoint: DELETE /api/chats/{id}
async def delete_chat(chat_id: str):  # Accept chat id.
    store = router.state.store  # Access JSON store.
    try:  # Try deleting.
        await store.delete_chat(chat_id=chat_id)  # Delete chat in JSON file.
        return {"ok": True}  # Return success.
    except KeyError:  # If missing.
        raise HTTPException(status_code=404, detail="Chat not found")  # Return 404.


@router.get("/chats/{chat_id}/messages")  # Define endpoint: GET /api/chats/{id}/messages
async def get_messages(chat_id: str):  # Accept chat id.
    store = router.state.store  # Access JSON store.
    try:  # Try reading.
        msgs = await store.list_messages(chat_id=chat_id)  # Load messages for chat.
        return msgs  # Return messages list.
    except KeyError:  # If missing.
        raise HTTPException(status_code=404, detail="Chat not found")  # Return 404.


@router.post("/chats/{chat_id}/stream")  # Define endpoint: POST /api/chats/{id}/stream
async def post_stream(chat_id: str, body: SendMessageRequest):  # Accept chat id + user message.
    store = router.state.store  # Access JSON store.
    llm = router.state.llm  # Access LLM client.

    try:  # Ensure chat exists by appending message; KeyError if missing.
        await store.append_message(chat_id=chat_id, role="user", content=body.message)  # Save user message to JSON.
    except KeyError:  # If chat missing.
        raise HTTPException(status_code=404, detail="Chat not found")  # Return 404.

    async def event_gen() -> AsyncGenerator[str, None]:  # Define SSE generator producing streamed tokens.
        assistant_text = ""  # Keep a buffer to store final assistant message.
        try:  # Wrap streaming in try to send error event.
            async for delta in llm.generate_stream(body.message):  # Stream delta tokens from LLM.
                assistant_text += delta  # Append delta to final assistant output.
                yield sse_event("delta", {"text": delta})  # Send SSE delta event to frontend.
            await store.append_message(chat_id=chat_id, role="assistant", content=assistant_text)  # Persist assistant message.
            yield sse_event("done", {})  # Send SSE done event.
        except Exception as e:  # Catch any error during streaming.
            yield sse_event("error", {"message": str(e)})  # Send SSE error event to frontend.

    return StreamingResponse(event_gen(), media_type="text/event-stream")  # Return SSE streaming respo
