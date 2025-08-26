// src/pages/chatGPT/index.tsx
// Only changes:
// 1) import & use analyzePrompt
// 2) call analyzer (via useEffect) *right before* PromptSuggestions render
// 3) if analyzer text contains "CONTINUE WITH CHAT" → hide Recommended Tool
//    by passing an empty string to <PromptSuggestions />

import * as React from "react";
import { Box } from "@mui/material";
import PromptSuggestions from "./PromptSuggestions";
import { analyzePrompt } from "@/helpers/analyzePrompt";
import { useVoxAppContext } from "@/context/VoxAppContext";

export default function Chat() {
  const { saveData, fetchData } = useVoxAppContext();

  // --- your existing state (trimmed for clarity) ---
  const [userInput, setUserInput] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [suggestionList, setSuggestionList] = React.useState<string[]>([]);

  // 🔹 analyzer state
  const [recommendedText, setRecommendedText] = React.useState<string>("");
  const [lastSessionId, setLastSessionId] = React.useState<number | string>();
  const [runKey, setRunKey] = React.useState(0); // bump per submit

  const setAlertMessage = (o: { severity: "error" | "info"; message: string }) =>
    console[o.severity === "error" ? "error" : "log"](o.message);

  // ====== your existing handleSubmit ======
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // -- your real generator here (this is a placeholder) --
      const params: any = await (window as any).generateChatParams?.(userInput);
      const session_id = params?.session_id;
      const max_tokens = params?.max_tokens ?? 0;

      // ✅ do this BEFORE max_tokens === 0 guard so analyzer runs every time
      setRecommendedText("");        // clear previous result
      setLastSessionId(session_id);  // drive analyzer effect
      setRunKey((k) => k + 1);       // force rerun even if session_id repeats

      if (max_tokens === 0) {
        setAlertMessage({
          severity: "error",
          message: "Prompt text is too long, kindly shorten the prompt.",
        });
        setLoading(false);
        return;
      }

      // ...your normal chat request flow continues...

    } catch (e: any) {
      setAlertMessage({ severity: "error", message: e?.message ?? "Failed" });
    } finally {
      setLoading(false);
    }
  };

  // ====== 🔴 call analyzePrompt before <PromptSuggestions /> renders ======
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!lastSessionId) {
        setRecommendedText("");
        return;
      }

      const text = await analyzePrompt(lastSessionId, { saveData, fetchData }) || "";

      // NEW RULE: Hide Recommended Tool if analyzer suggests CONTINUE WITH CHAT
      const shouldHide = /CONTINUE WITH CHAT/i.test(text);
      const next = shouldHide ? "" : text;

      if (!cancelled) setRecommendedText(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [lastSessionId, runKey, saveData, fetchData]);

  // ====== UI ======
  return (
    <Box sx={{ p: 2 }}>
      {/* ... any other components above ... */}

      {/* ⬇️ analyzePrompt effect has already run; pass its result here */}
      <PromptSuggestions
        suggestionList={suggestionList}
        setUserInput={setUserInput}
        sessionId={lastSessionId as any}
        recommendedText={recommendedText} // empty string hides the section
      />

      {/* input + submit */}
      <Box sx={{ mt: 2 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Type your prompt…"
            style={{ width: "60%", padding: 8 }}
          />
          <button disabled={loading} type="submit" style={{ marginLeft: 8 }}>
            Send
          </button>
        </form>
      </Box>
    </Box>
  );
}
