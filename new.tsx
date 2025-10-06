// Header.tsx
import React from "react";
import { saveData } from "@/services/apiService"; // <-- same import path you use elsewhere

// ...inside your Header component:
const [sessionId, setSessionId] = React.useState<number | null>(null);
const creatingRef = React.useRef(false);

/** Call once, cache result, and return the session_id */
const ensureSession = async (): Promise<number> => {
  if (sessionId) return sessionId;
  if (creatingRef.current) {
    // prevent double-taps racing
    await new Promise((r) => setTimeout(r, 300));
    return ensureSession();
  }
  creatingRef.current = true;

  // Build payload exactly like your screenshot #1
  const payload = {
    new_session: {
      temperature: 0.7,
      max_tokens: 1026,
      engine: "gpt-4o",
      session_title: "Which models are available in this application",
      status_id: 1,
      sessionType: "assistant",
      filelist: [
        { fileName: "Vox flow knowledge base.docx", indexName: "individual" },
        { fileName: "Vox Author Knowledge Base.docx", indexName: "individual" },
        { fileName: "Vox Gen AI studio knowledge base2.docx", indexName: "individual" },
        { fileName: "Vox knowledge base.docx", indexName: "individual" },
      ],
      application: "VOX",
      use_vision_chat: false,
    },
    advance_params: {
      num_of_citations: 2,
      vector_score_threshold: 0.2,
      parent_document_retriever: false,
      with_agent: false,
      rerank_model: false,
      recursion_limit: 2,
    },
  };

  try {
    // Same pattern as your Chat() snippet:
    const res = await saveData("/auth/service/session/create", payload);

    // Robustly extract the *first* session_id anywhere in the payload
    // (image #4 shows it near the top)
    const tryDirect = (res?.data as any)?.session_id;
    let sid: number | null = typeof tryDirect === "number" ? tryDirect : null;

    if (!sid) {
      // fall back: scan JSON string for first "session_id": NNN
      const str = JSON.stringify(res?.data ?? res);
      const m = str.match(/"session_id"\s*:\s*(\d+)/);
      sid = m ? Number(m[1]) : null;
    }

    if (!sid) throw new Error("session_id not found in create-session response");

    setSessionId(sid);
    return sid;
  } finally {
    creatingRef.current = false;
  }
};

// …where you render it:
<FloatingAssistant
  gifSrc={tourAi}
  anchorRef={appBarRef}
  sessionId={sessionId ?? undefined}
  ensureSession={ensureSession}
/>
const res: any = await saveData("/auth/service/session/create", payload);

// prefer the axios-style .data if present
const json = res?.data ?? res;

const tryDirect = json?.session_id;
let sid: number | null = typeof tryDirect === "number" ? tryDirect : null;

if (!sid) {
  const str = JSON.stringify(json);
  const m = str.match(/"session_id"\s*:\s*(\d+)/);
  sid = m ? Number(m[1]) : null;
}
if (!sid) throw new Error("session_id not found in create-session response");
setSessionId(sid);
