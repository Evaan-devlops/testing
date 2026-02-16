npm i -D typescript @types/react @types/react-dom

Create tsconfig.json at project root:

{
  "compilerOptions": {
    "target": "ES2020",                         // Modern JS target for Vite
    "useDefineForClassFields": true,            // TS emit behavior aligned with modern bundlers
    "lib": ["ES2020", "DOM", "DOM.Iterable"],    // Browser + modern JS libs
    "module": "ESNext",                         // Let Vite handle modules
    "skipLibCheck": true,                       // Faster builds; avoids noisy type errors in deps
    "moduleResolution": "Bundler",              // Best option for Vite
    "resolveJsonModule": true,                  // Allow importing JSON
    "isolatedModules": true,                    // Required by Vite/ESM tooling
    "noEmit": true,                             // Vite builds, TS doesn’t emit files
    "jsx": "react-jsx",                         // New JSX runtime
    "strict": true,                             // Safer types (won’t affect JS files)
    "allowJs": true,                            // ✅ KEY: allows existing .js/.jsx to coexist
    "checkJs": false,                           // Don’t type-check existing JS to avoid break/noise
    "types": ["vite/client"]                    // Vite env typing support
  },
  "include": ["src"]                            // Only compile source
}


Create src/vite-env.d.ts:

/// <reference types="vite/client" /> // Tell TS about Vite env + import.meta


✅ This guarantees: JSX files keep running, TSX files compile fine.

2) Add Tailwind (safe + recommended)

Run:

npm i -D tailwindcss postcss autoprefixer
npx tailwindcss init -p


Edit tailwind.config.js:

/** @type {import('tailwindcss').Config} */ // Tailwind config typing hint
export default { // Export tailwind config (Vite supports ESM)
  content: [ // Tell Tailwind where to scan classNames
    "./index.html", // Include root html
    "./src/**/*.{js,jsx,ts,tsx}", // Include all React source files
  ],
  theme: { // Theme section
    extend: {}, // We can extend later
  },
  plugins: [], // No plugins right now
};


In src/index.css (you already have it), add at TOP:

@tailwind base;        /* Tailwind base styles */
@tailwind components;  /* Tailwind component styles */
@tailwind utilities;   /* Tailwind utility classes */


✅ This won’t break anything — it only adds styling utilities.

3) Add Chat route without breaking existing routes

In your App.jsx (screenshot shows your Routes list), add:

A) Import the TSX page

Add near top:

import ChatPage from "./pages/ChatPage"; // Import new TSX chat page (Vite resolves .tsx)

B) Add a route

Inside <Routes> add:

<Route path="/chat" element={<ChatPage />} /> {/* Chat route */}


✅ That’s it. Existing routes remain unchanged.

4) Add the Chat files (copy-paste)

Create these files exactly:

src/types/chat.ts
// Define allowed roles used for alignment and styling.
export type ChatRole = "user" | "assistant"; // Restrict roles to two known values.

// Define the sidebar chat item type.
export type ChatSummary = { // Type for chat list items.
  id: string; // Unique chat id.
  title: string; // Chat title shown in sidebar.
  updatedAt: string; // ISO timestamp for sorting/display.
};

// Define the message type shown in the thread.
export type ChatMessage = { // Type for messages inside a chat.
  id: string; // Unique message id.
  role: ChatRole; // Who wrote the message.
  content: string; // Message text.
  createdAt: string; // ISO timestamp for ordering.
};

src/api/client.ts
// Shared fetch helper that standardizes error handling and JSON parsing.
export async function apiFetch<T>( // Generic function returning a typed response.
  input: RequestInfo | URL, // URL or Request object.
  init?: RequestInit // Optional fetch config.
): Promise<T> { // Promise of typed data.
  const res = await fetch(input, init); // Make the HTTP request.

  if (!res.ok) { // If response is not 2xx.
    const text = await res.text().catch(() => ""); // Try reading error body safely.
    throw new Error(text || `Request failed: ${res.status}`); // Throw an error for UI to show.
  }

  return (await res.json()) as T; // Parse JSON response.
}

src/api/chatsApi.ts
import { apiFetch } from "./client"; // Import shared fetch wrapper.
import type { ChatMessage, ChatSummary } from "../types/chat"; // Import types for compile-time safety.

// Read backend base URL from Vite env; fallback to localhost for dev.
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"; // Safe default.

// Build full URL for endpoints.
function url(path: string) { // Helper to avoid repeating base URL joins.
  return `${API_BASE}${path}`; // Return concatenated URL.
}

// GET /api/chats?search=
export function listChats(search: string): Promise<ChatSummary[]> { // Fetch chat sidebar list.
  const q = search ? `?search=${encodeURIComponent(search)}` : ""; // Build query string safely.
  return apiFetch<ChatSummary[]>(url(`/api/chats${q}`)); // Call API and return parsed JSON.
}

// POST /api/chats
export function createChat(title: string): Promise<ChatSummary> { // Create a new chat.
  return apiFetch<ChatSummary>(url(`/api/chats`), { // Call create endpoint.
    method: "POST", // POST for creating.
    headers: { "Content-Type": "application/json" }, // Send JSON.
    body: JSON.stringify({ title }), // Payload includes title.
  });
}

// PATCH /api/chats/:id
export function renameChat(chatId: string, title: string): Promise<void> { // Rename existing chat.
  return apiFetch<void>(url(`/api/chats/${chatId}`), { // Call rename endpoint.
    method: "PATCH", // PATCH for partial update.
    headers: { "Content-Type": "application/json" }, // Send JSON.
    body: JSON.stringify({ title }), // Payload includes new title.
  });
}

// DELETE /api/chats/:id
export function deleteChat(chatId: string): Promise<void> { // Delete a chat.
  return apiFetch<void>(url(`/api/chats/${chatId}`), { // Call delete endpoint.
    method: "DELETE", // DELETE for removal.
  });
}

// GET /api/chats/:id/messages
export function listMessages(chatId: string): Promise<ChatMessage[]> { // Get a chat thread.
  return apiFetch<ChatMessage[]>(url(`/api/chats/${chatId}/messages`)); // Call messages endpoint.
}

// POST /api/chats/:id/stream (SSE over fetch)
export async function streamChat( // Stream assistant output as deltas.
  chatId: string, // Chat id to stream into.
  message: string, // User message to send.
  onDelta: (text: string) => void // Callback for each received chunk.
): Promise<void> { // Resolves when stream ends.
  const res = await fetch(url(`/api/chats/${chatId}/stream`), { // Call streaming endpoint.
    method: "POST", // POST for sending user prompt.
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" }, // Request SSE.
    body: JSON.stringify({ message }), // Send minimal payload.
  });

  if (!res.ok || !res.body) { // Ensure stream is available.
    const text = await res.text().catch(() => ""); // Read error if present.
    throw new Error(text || `Stream failed: ${res.status}`); // Throw for UI.
  }

  const reader = res.body.getReader(); // Read stream chunks.
  const decoder = new TextDecoder("utf-8"); // Decode bytes to text.
  let buffer = ""; // Buffer partial SSE frames.

  while (true) { // Keep reading until server closes.
    const { value, done } = await reader.read(); // Read next chunk.
    if (done) break; // Exit if finished.

    buffer += decoder.decode(value, { stream: true }); // Append decoded chunk.

    const frames = buffer.split("\n\n"); // SSE frames separated by blank line.
    buffer = frames.pop() || ""; // Keep incomplete frame for next iteration.

    for (const frame of frames) { // Process each complete frame.
      const lines = frame.split("\n"); // Split into lines.
      const eventLine = lines.find((l) => l.startsWith("event:")); // Find event type.
      const dataLine = lines.find((l) => l.startsWith("data:")); // Find data payload line.

      const event = eventLine ? eventLine.replace("event:", "").trim() : "message"; // Default event.
      const data = dataLine ? dataLine.replace("data:", "").trim() : ""; // Extract data.

      if (event === "delta") { // If server sent incremental content.
        try { // Try parsing JSON.
          const parsed = JSON.parse(data) as { text?: string }; // Parse delta payload.
          onDelta(parsed.text || ""); // Emit appended text.
        } catch { // If server sends plain text.
          onDelta(data); // Emit raw data.
        }
      }

      if (event === "done") { // If server completed response.
        return; // End stream.
      }

      if (event === "error") { // If server signaled an error.
        throw new Error(data || "Streaming error"); // Throw for UI.
      }
    }
  }
}

src/pages/ChatPage.tsx (ChatGPT-like UI)
import React, { useEffect, useMemo, useRef, useState } from "react"; // Import React + hooks.
import type { ChatMessage, ChatSummary } from "../types/chat"; // Import types.
import { createChat, deleteChat, listChats, listMessages, renameChat, streamChat } from "../api/chatsApi"; // Import APIs.

// Typing indicator component (3 bouncing dots).
function TypingDots() { // Local component for streaming placeholder.
  return ( // Return JSX.
    <div className="flex items-center gap-2 text-sm text-gray-500"> {/* Container */}
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]" /> {/* Dot 1 */}
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]" /> {/* Dot 2 */}
      <span className="h-2 w-2 animate-bounce rounded-full bg-gray-400" /> {/* Dot 3 */}
      <span>Typing…</span> {/* Label */}
    </div>
  );
}

// Main Chat page.
export default function ChatPage() { // Export default for router.
  const [chats, setChats] = useState<ChatSummary[]>([]); // Sidebar chats.
  const [chatSearch, setChatSearch] = useState<string>(""); // Sidebar search text.
  const [activeChatId, setActiveChatId] = useState<string | null>(null); // Selected chat id.
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Current thread messages.
  const [input, setInput] = useState<string>(""); // Composer input.
  const [isLoadingChats, setIsLoadingChats] = useState<boolean>(false); // Chats loading.
  const [chatsError, setChatsError] = useState<string | null>(null); // Chats error.
  const [isLoadingThread, setIsLoadingThread] = useState<boolean>(false); // Thread loading.
  const [threadError, setThreadError] = useState<string | null>(null); // Thread error.
  const [isStreaming, setIsStreaming] = useState<boolean>(false); // Streaming state.

  const bottomRef = useRef<HTMLDivElement | null>(null); // Ref for auto-scroll.
  const hasAnyMessage = messages.length > 0; // Used for composer positioning.

  // Load sidebar chats whenever search changes (debounced).
  useEffect(() => { // Side effect for chat listing.
    const t = setTimeout(() => { // Debounce to reduce API calls.
      setIsLoadingChats(true); // Start loading indicator.
      setChatsError(null); // Clear any previous error.
      listChats(chatSearch) // Call backend list endpoint.
        .then((data) => setChats(data)) // Store result.
        .catch((e: Error) => setChatsError(e.message)) // Store error.
        .finally(() => setIsLoadingChats(false)); // Stop loading indicator.
    }, 250); // 250ms debounce.

    return () => clearTimeout(t); // Cleanup timeout.
  }, [chatSearch]); // Re-run when search text changes.

  // Load messages when active chat changes.
  useEffect(() => { // Side effect for loading thread messages.
    if (!activeChatId) { // If no chat selected.
      setMessages([]); // Clear thread.
      return; // Exit effect.
    }

    setIsLoadingThread(true); // Start loading.
    setThreadError(null); // Clear error.
    listMessages(activeChatId) // Fetch messages.
      .then((data) => setMessages(data)) // Store messages.
      .catch((e: Error) => setThreadError(e.message)) // Store error message.
      .finally(() => setIsLoadingThread(false)); // Stop loading.
  }, [activeChatId]); // Trigger on chat change.

  // Auto-scroll when messages change or streaming updates.
  useEffect(() => { // Side effect for scrolling.
    bottomRef.current?.scrollIntoView({ behavior: "smooth" }); // Scroll to bottom smoothly.
  }, [messages, isStreaming]); // Trigger when messages/streaming changes.

  // Find the active chat object.
  const activeChat = useMemo(() => { // Memoize to avoid repeated find work.
    return chats.find((c) => c.id === activeChatId) || null; // Return matching chat or null.
  }, [chats, activeChatId]); // Dependencies.

  // Create new chat.
  async function handleNewChat() { // New chat handler.
    try { // Catch errors.
      setThreadError(null); // Clear thread error.
      const created = await createChat("New chat"); // Create chat via API.
      setChats((prev) => [created, ...prev]); // Put new chat at top.
      setActiveChatId(created.id); // Select new chat.
      setMessages([]); // Reset messages.
    } catch (e) { // Handle error.
      setThreadError((e as Error).message); // Show error.
    }
  }

  // Rename a chat.
  async function handleRenameChat(chatId: string) { // Rename action.
    const next = window.prompt("Rename chat to:"); // Prompt user for new title.
    if (!next) return; // Exit if cancelled/empty.

    try { // Attempt API update.
      await renameChat(chatId, next); // Call rename endpoint.
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: next } : c))); // Update UI.
    } catch (e) { // Handle error.
      alert((e as Error).message); // Basic feedback.
    }
  }

  // Delete a chat.
  async function handleDeleteChat(chatId: string) { // Delete action.
    const ok = window.confirm("Delete this chat?"); // Confirm destructive action.
    if (!ok) return; // Exit if cancelled.

    try { // Attempt deletion.
      await deleteChat(chatId); // Call delete endpoint.
      setChats((prev) => prev.filter((c) => c.id !== chatId)); // Remove from list.
      if (activeChatId === chatId) setActiveChatId(null); // Clear selection if needed.
      if (activeChatId === chatId) setMessages([]); // Clear messages if needed.
    } catch (e) { // Handle error.
      alert((e as Error).message); // Basic feedback.
    }
  }

  // Send message and stream assistant response.
  async function handleSend() { // Send handler.
    const trimmed = input.trim(); // Normalize input.
    if (!trimmed) return; // Skip empty.

    try { // Guard network/stream errors.
      setThreadError(null); // Clear thread error.

      let chatId = activeChatId; // Use existing chat if selected.
      if (!chatId) { // If no chat selected yet.
        const created = await createChat(trimmed.slice(0, 40) || "New chat"); // Create chat with short title.
        setChats((prev) => [created, ...prev]); // Add to sidebar.
        chatId = created.id; // Use created id.
        setActiveChatId(created.id); // Select it.
        setMessages([]); // Reset thread.
      }

      const userMsg: ChatMessage = { // Build optimistic user message.
        id: `local-u-${Date.now()}`, // Temporary id.
        role: "user", // User role.
        content: trimmed, // Message content.
        createdAt: new Date().toISOString(), // Timestamp.
      };

      const assistantMsg: ChatMessage = { // Build assistant placeholder for streaming.
        id: `local-a-${Date.now()}`, // Temporary id.
        role: "assistant", // Assistant role.
        content: "", // Start empty.
        createdAt: new Date().toISOString(), // Timestamp.
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]); // Append both to UI.
      setInput(""); // Clear textarea.
      setIsStreaming(true); // Enable streaming UI.

      await streamChat(chatId, trimmed, (delta) => { // Start SSE streaming.
        setMessages((prev) => { // Functional update for correctness.
          const next = [...prev]; // Copy array.
          const idx = next.findIndex((m) => m.id === assistantMsg.id); // Find assistant placeholder.
          if (idx === -1) return prev; // If missing, keep previous.
          next[idx] = { ...next[idx], content: next[idx].content + delta }; // Append delta.
          return next; // Return updated state.
        });
      });

      setIsStreaming(false); // Streaming done.
    } catch (e) { // Handle error.
      setIsStreaming(false); // Ensure streaming state resets.
      setThreadError((e as Error).message); // Show error.
    }
  }

  // Enter to send; Shift+Enter for newline.
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) { // Keydown handler.
    if (e.key === "Enter" && !e.shiftKey) { // Enter without shift.
      e.preventDefault(); // Prevent newline.
      void handleSend(); // Trigger send.
    }
  }

  return ( // Render UI.
    <div className="h-screen w-screen bg-gray-50"> {/* Full screen */}
      <div className="flex h-full"> {/* Two-column layout */}

        {/* LEFT SIDEBAR */}
        <aside className="w-80 border-r bg-white"> {/* Sidebar container */}
          <div className="flex items-center justify-between p-4"> {/* Sidebar header */}
            <h2 className="text-lg font-semibold">Chats</h2> {/* Title */}
            <button onClick={handleNewChat} className="rounded-lg bg-black px-3 py-2 text-sm text-white"> {/* New */}
              + New
            </button>
          </div>

          <div className="px-4 pb-3"> {/* Search box wrapper */}
            <input
              value={chatSearch} // Controlled input.
              onChange={(e) => setChatSearch(e.target.value)} // Update search state.
              placeholder="Search chats…" // Placeholder.
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring" // Styling.
            />
          </div>

          {isLoadingChats && ( // Loading state.
            <div className="px-4 py-2 text-sm text-gray-500">Loading chats…</div> // Text.
          )}

          {chatsError && ( // Error state.
            <div className="mx-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"> {/* Box */}
              <div className="font-medium">Could not load chat history</div> {/* Title */}
              <div className="mt-1">{chatsError}</div> {/* Details */}
              <button onClick={() => setChatSearch((s) => s)} className="mt-2 underline">Retry</button> {/* Retry */}
            </div>
          )}

          <div className="mt-2 h-[calc(100%-140px)] overflow-y-auto"> {/* Scroll list */}
            {chats.map((c) => ( // Render each chat.
              <div
                key={c.id} // Unique key.
                className={`group flex items-center justify-between px-4 py-3 hover:bg-gray-50 ${activeChatId === c.id ? "bg-gray-100" : ""}`} // Styling.
              >
                <button onClick={() => setActiveChatId(c.id)} className="flex-1 text-left"> {/* Select chat */}
                  <div className="truncate text-sm font-medium">{c.title}</div> {/* Title */}
                  <div className="text-xs text-gray-500">{new Date(c.updatedAt).toLocaleString()}</div> {/* Date */}
                </button>

                <div className="ml-2 hidden items-center gap-2 group-hover:flex"> {/* Hover actions */}
                  <button onClick={() => handleRenameChat(c.id)} className="text-xs text-gray-600 underline">Rename</button> {/* Rename */}
                  <button onClick={() => handleDeleteChat(c.id)} className="text-xs text-red-600 underline">Delete</button> {/* Delete */}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* RIGHT CHAT AREA */}
        <main className="flex flex-1 flex-col"> {/* Main chat column */}
          <div className="border-b bg-white px-6 py-4"> {/* Top bar */}
            <div className="text-sm text-gray-500">Chat</div> {/* Label */}
            <div className="text-lg font-semibold">{activeChat?.title || "New conversation"}</div> {/* Title */}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6"> {/* Thread container */}
            {!activeChatId && !hasAnyMessage && ( // Empty state.
              <div className="mx-auto mt-24 max-w-2xl text-center"> {/* Center */}
                <h1 className="text-2xl font-semibold">How can I help?</h1> {/* Heading */}
                <p className="mt-2 text-gray-500">Start a new chat by typing below.</p> {/* Subtext */}
              </div>
            )}

            {isLoadingThread && ( // Thread loading.
              <div className="text-sm text-gray-500">Loading conversation…</div> // Text.
            )}

            {threadError && ( // Thread error.
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"> {/* Box */}
                {threadError} {/* Error text */}
              </div>
            )}

            <div className="mx-auto flex max-w-3xl flex-col gap-4"> {/* Thread width */}
              {messages.map((m) => ( // Render each message.
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}> {/* Align */}
                  <div
                    className={`${m.role === "user" ? "bg-black text-white" : "bg-white text-gray-900"} max-w-[80%] rounded-2xl border px-4 py-3 text-sm shadow-sm`} // Bubble
                  >
                    {m.content || (m.role === "assistant" && isStreaming ? <TypingDots /> : null)} {/* Content or typing */}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} /> {/* Scroll anchor */}
            </div>
          </div>

          {/* COMPOSER */}
          <div className={`border-t bg-white px-6 py-4 transition-all duration-300 ${hasAnyMessage ? "" : "pb-10"}`}> {/* Bottom bar */}
            <div className={`mx-auto flex max-w-3xl flex-col ${hasAnyMessage ? "" : "items-center"}`}> {/* Center initially */}
              <div className="flex w-full items-end gap-2"> {/* Row */}
                <textarea
                  value={input} // Controlled value.
                  onChange={(e) => setInput(e.target.value)} // Update state.
                  onKeyDown={handleKeyDown} // Enter-to-send.
                  placeholder="Message…" // Placeholder.
                  rows={hasAnyMessage ? 2 : 3} // Taller when centered.
                  className="w-full resize-none rounded-2xl border px-4 py-3 text-sm outline-none focus:ring" // Styling.
                />
                <button
                  onClick={() => void handleSend()} // Send.
                  disabled={isStreaming} // Disable during stream.
                  className="rounded-2xl bg-black px-4 py-3 text-sm text-white disabled:opacity-50" // Styling.
                >
                  Send
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">Enter to send • Shift+Enter for newline</div> {/* Hint */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

5) Add .env for backend base URL (Vite style)

Create root .env:

VITE_API_BASE_URL=http://localhost:8000
