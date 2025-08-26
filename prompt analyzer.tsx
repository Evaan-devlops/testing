// helpers/analyzePrompt.ts
// Small helper to call your Prompt Analyzer via the internal path.
// Only dynamic field is session_id. Everything else mirrors your screenshot.

import { saveData } from "@/utils/saveData"; // <-- adjust import path if needed

export async function analyzePrompt(sessionId: number | string): Promise<string> {
  // Request body per your Swagger screenshot
  const payload = {
    engine: "anthropic.claude-3-5-sonnet-v1.0",
    temperature: 0.7,
    max_tokens: 90,
    session_id: sessionId,   // ← dynamic
    output_tokens: 90,
  };

  // Use the same internal style you used for completion:
  // saveData("/auth/service/completion", payload)
  const response: any = await saveData(
    "/auth/service/prompt_analyzer?genai_request=true",
    payload
  );

  // Your saveData pattern often wraps payload under response.data.data
  const data =
    response?.data?.data ??
    response?.data ??
    response ??
    {};

  // Most common shapes observed in your responses:
  // { result: { messages: [{ content: "..." }] } }
  // Fallbacks provided so UI won't break if the shape varies.
  const text =
    data?.result?.messages?.[0]?.content ??
    data?.messages?.[0]?.content ??
    data?.message ??
    "";

  return typeof text === "string" ? text : "";
}
