// Small helper to call your Prompt Analyzer.
// All fields are hard-coded from your screenshot except session_id.

export async function analyzePrompt(sessionId: number | string): Promise<string> {
  // ⚙️ Configure via .env if you prefer; hard defaults are provided too.
  const BASE_URL =
    import.meta.env.VITE_PROMPT_ANALYZER_URL ||
    "https://vox-dev.pfizer.com/vox/auth/service/prompt_analyzer";
  const AUTH_TOKEN =
    import.meta.env.VITE_AUTH_TOKEN || ""; // e.g. "Bearer 0001YssrCgluf4BgasL...". Keep empty if not needed.

  const body = {
    engine: "anthropic.claude-3-5-sonnet-v1.0",
    temperature: 0.7,
    max_tokens: 90,
    session_id: sessionId, // <-- only dynamic field
    output_tokens: 90,
  };

  const res = await fetch(`${BASE_URL}?genai_request=true`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "Content-Type": "application/json",
      ...(AUTH_TOKEN ? { Authorization: AUTH_TOKEN } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // do not throw — just return empty so UI won’t break
    return "";
  }

  const json = await res.json();

  // Your screenshot shows: { status_code, status, result: { messages: [{ content }], ... } }
  // Try the most likely shapes, then fall back to empty.
  const text =
    json?.result?.messages?.[0]?.content ??
    json?.data?.messages?.[0]?.content ??
    json?.message ??
    "";

  return typeof text === "string" ? text : "";
}
