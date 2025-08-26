// src/pages/chatGPT/index.tsx
import * as React from "react";
import { Box, Typography } from "@mui/material";
import PromptSuggestions from "./PromptSuggestions";
import { analyzePrompt } from "@/helpers/analyzePrompt";
import { useVoxAppContext } from "@/context/VoxAppContext";

export default function Chat() {
  const { saveData, fetchData } = useVoxAppContext();

  // ... your existing state ...

  // [L1512] ↓↓↓ Add analyzer state/effect RIGHT BEFORE `return (`
  const [recommendedText, setRecommendedText] = React.useState<string>("");
  const [lastSessionId, setLastSessionId] = React.useState<number | string>();
  const [runKey, setRunKey] = React.useState(0); // bump on each submit

  // Derive the single line to show (extract after "Recommended Tool:" if present)
  const recommendedLine = React.useMemo(() => {
    if (!recommendedText) return "";
    const m = recommendedText.match(/Recommended Tool:\s*(.+)/i);
    return (m ? m[1] : recommendedText).trim();
  }, [recommendedText]);

  // Call analyzer whenever we have a (new) session_id — BEFORE PromptSuggestions renders
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!lastSessionId) {
        setRecommendedText("");
        return;
      }

      const text =
        (await analyzePrompt(lastSessionId, { saveData, fetchData })) || "";

      // Hide section if analyzer says "CONTINUE WITH CHAT"
      const next = /CONTINUE WITH CHAT/i.test(text) ? "" : text;

      if (!cancelled) setRecommendedText(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [lastSessionId, runKey, saveData, fetchData]);

  // ===== handleSubmit (only the lines relevant to analyzer are shown) =====
  async function handleSubmit(/* your args */) {
    // ... your existing code that builds params ...
    const params: any = await (window as any).generateChatParams?.(/* ... */);
    const session_id = params?.session_id;
    const max_tokens = params?.max_tokens ?? 0;

    // IMPORTANT: trigger analyzer BEFORE the max_tokens guard
    setRecommendedText("");        // clear old
    setLastSessionId(session_id);  // provide fresh session
    setRunKey((k) => k + 1);       // force rerun even if session id repeats

    if (max_tokens === 0) {
      // ... your alert and return ...
      return;
    }

    // ... your normal chat flow ...
  }

  // [L1513] return begins here in your file
  return (
    <Box sx={{ p: 2 }}>
      {/* ... whatever is above in your layout ... */}

      {/* [L1916] ===== Recommended Tool SECTION (placed BEFORE PromptSuggestions) ===== */}
      {!!recommendedLine && (
        <Box
          sx={{
            maxWidth: "calc(60vw + 139px)",
            margin: "0 auto",
            mb: "8px",
            "@media (max-width: 900px)": { maxWidth: "100%" },
          }}
        >
          <Typography
            sx={{
              fontSize: "12px",
              fontWeight: 700,
              lineHeight: "16.34px",
              textAlign: "left",
              color: "#3578FF",
              mb: "4px",
            }}
          >
            Recommended Tool
          </Typography>

          <Box
            sx={{
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: "10px",
              padding: "8px 10px",
              background: "rgba(53,120,255,0.04)",
              fontSize: "12.5px",
            }}
          >
            {recommendedLine}
          </Box>
        </Box>
      )}

      {/* [L1924–L1933] Your existing PromptSuggestions call — now appears AFTER the section */}
      <PromptSuggestions
        suggestionList={suggestionList}
        setUserInput={setUserInput}
        sessionId={chatGPT?.selectedSession?.session_id}
        // You can stop passing recommendedText if your component doesn’t use it anymore
        // recommendedText={recommendedText}
      />

      {/* ... your input + submit, etc. ... */}
    </Box>
  );
}
