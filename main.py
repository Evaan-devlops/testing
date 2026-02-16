Updated app/main.py (merged, safe, copy-paste)
from fastapi import FastAPI, Request  # Import FastAPI for app + Request for any existing request middleware usage.
import json  # Import json for any existing JSON operations in your codebase.
from fastapi.middleware.cors import CORSMiddleware  # Import CORS middleware for cross-origin frontend access.
from fastapi.middleware.gzip import GZipMiddleware  # Import GZip middleware to compress responses.
import v1.api as api  # Import your pre-existing v1 router module (do not remove).
import logging  # Import logging to keep existing logging behavior.
import os  # Import os to read environment variables for optional config.

# NOTE: We are importing these NEW modules for chat, without touching existing APIs.
from v1.chat_routes import router as chat_router  # Import chat router (new) under v1.
from v1.storage_json import JsonChatStore  # Import JSON file store (new).
from v1.llm_client import LLMClient  # Import LLM client wrapper (new).

log = logging.getLogger(__name__)  # Keep your existing logger instance.

# prefix = "/app"  # Keep your existing commented prefix line (if you use it later).

app = FastAPI()  # Create FastAPI app (kept exactly as your pre-existing code).

# -----------------------------
# CORS (kept, but made env-driven safely)
# -----------------------------
# Keep your default open CORS, but allow overriding via env without breaking existing behavior.
cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()  # Read optional env CORS origins (comma-separated).
origins = ["*"]  # Default to your existing behavior: allow all origins.
if cors_origins_env:  # If env has origins configured.
    origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]  # Use env origins list.

app.add_middleware(  # Add CORS middleware exactly like your pre-existing code.
    CORSMiddleware,  # Use CORS middleware.
    allow_origins=origins,  # Allow configured origins (default "*").
    allow_credentials=True,  # Keep your existing credentials setting.
    allow_methods=["*"],  # Keep your existing allow-all methods.
    allow_headers=["*"],  # Keep your existing allow-all headers.
)

# -----------------------------
# GZip (kept)
# -----------------------------
app.add_middleware(GZipMiddleware, minimum_size=500)  # Keep your existing GZip middleware setting.

# -----------------------------
# Existing routers (kept)
# -----------------------------
app.include_router(api.router)  # Keep your existing router include (DO NOT remove).

# -----------------------------
# NEW: Chat JSON store + LLM client wiring (added safely)
# -----------------------------
# Read JSON DB file path from env; default to a file in your backend folder.
data_file = os.getenv("DATA_FILE", "./data/chats.json").strip()  # Use env if present, else default.

store = JsonChatStore(file_path=data_file)  # Create JSON store instance used by chat APIs.
llm = LLMClient()  # Create LLM client instance used by chat streaming.

# Inject shared dependencies into the chat router state so endpoints can access them.
chat_router.state.store = store  # Attach store to router state.
chat_router.state.llm = llm  # Attach llm client to router state.

# Include chat router AFTER existing routers (order does not break anything; just adds endpoints).
app.include_router(chat_router)  # Register the new chat endpoints.

# -----------------------------
# Optional: health endpoint (added safely)
# -----------------------------
@app.get("/health")  # Add a small health route (does not conflict with existing).
async def health():  # Health handler.
    return {"ok": True}  # Return simple healthy status.
