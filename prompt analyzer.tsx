// src/helpers/analyzePrompt.ts
// Calls your internal Prompt Analyzer endpoint.
// Only dynamic field: session_id. Uses your context helpers.

export type AnalyzerDeps = {
  saveData: (url: string, body?: any) => Promise<any>;
  fetchData: (url: string, params?: Record<string, any>) => Promise<any>;
};

export async function analyzePrompt(
  sessionId: number | string,
  { saveData, fetchData }: AnalyzerDeps
): Promise<string> {
  // Payload matches your Swagger screenshot
  const payload = {
    engine: "anthropic.claude-3-5-sonnet-v1.0",
    temperature: 0.7,
    max_tokens: 90,
    session_id: sessionId, // ← ONLY dynamic field
    output_tokens: 90,
  };

  // 1) POST via saveData to your internal path
  const postRes: any = await saveData(
    "/auth/service/prompt_analyzer?genai_request=true",
    payload
  );

  // Try common response shapes first
  const fromPost =
    postRes?.data?.data?.result?.messages?.[0]?.content ??
    postRes?.data?.result?.messages?.[0]?.content ??
    postRes?.result?.messages?.[0]?.content ??
    postRes?.data?.message ??
    postRes?.message;

  if (typeof fromPost === "string" && fromPost.trim()) return fromPost;

  // 2) Optional fallback GET (some envs return an ACK then require a query)
  try {
    const getRes: any = await fetchData("/auth/service/prompt_analyzer", {
      session_id: sessionId,
    });

    const fromGet =
      getRes?.data?.data?.result?.messages?.[0]?.content ??
      getRes?.data?.result?.messages?.[0]?.content ??
      getRes?.result?.messages?.[0]?.content ??
      getRes?.data?.message ??
      getRes?.message ??
      "";

    return typeof fromGet === "string" ? fromGet : "";
  } catch {
    return "";
  }
}

