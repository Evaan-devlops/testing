import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

/**
 * ExportToWord
 * ------------
 * Renders a small Download button. On click, it grabs the innerHTML of the DOM
 * node referenced by `exportRef` (your message content), wraps it in a minimal
 * Word-friendly HTML document, and downloads a `.doc` file.
 *
 * Notes:
 * - We purposely **don't** touch the avatar/bot icon because your ref should
 *   point only to the response box. If an avatar somehow leaks inside the ref,
 *   mark it with `data-export="exclude"` and we'll strip it.
 */
interface Props {
  /** Ref to the element that contains ONLY the assistant response content */
  exportRef: React.RefObject<HTMLElement>;
  /** Optional custom filename without extension (defaults to "chat-response") */
  filename?: string;
}

const ExportToWord: React.FC<Props> = ({ exportRef, filename }) => {
  const handleDownload = React.useCallback(() => {
    const el = exportRef.current;
    if (!el) return;

    // Clone and sanitize (remove anything marked as "do not export")
    const clone = el.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[data-export="exclude"]').forEach((n) => n.remove());
    // (extra safety) remove common avatar roles if they ever slip inside the ref
    clone
      .querySelectorAll('img[alt="AI"], img.avatar, img[data-role="avatar"]')
      .forEach((n) => n.remove());

    // Build a Word-friendly HTML document. Word opens HTML perfectly fine
    // when served with "application/msword" and a .doc filename.
    const html =
      `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Chat Export</title>
<style>
  body { font-family: -apple-system, Segoe UI, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #111; }
  h1,h2,h3 { font-weight: 600; }
  ul,ol { padding-left: 24px; }
  code, pre { font-family: Consolas, Menlo, monospace; white-space: pre-wrap; word-break: break-word; }
  table { border-collapse: collapse; }
  table, th, td { border: 1px solid #ddd; padding: 6px; }
</style>
</head>
<body>
${clone.innerHTML}
</body>
</html>`;

    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename || "chat-response"}.doc`; // .doc opens in Word
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [exportRef, filename]);

  return (
    <Tooltip title="Download (.doc)">
      <IconButton onClick={handleDownload} color="primary" size="small" sx={{ ml: 1 }}>
        <DownloadIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  );
};

export default ExportToWord;
#############################################################################3

import ExportToWord from "../../components/ExportToWord";


// Keep avatar OUTSIDE this div so it is neither copied nor exported
// <img src="/assets/chatIcon.svg" alt="AI" />  ← leave this outside

<div ref={contentRef} style={{ width: "100%", display: "flex" }}>
  {/* assistant response markup lives here */}
</div>


<MessageTools
  message={message}
  contentRef={contentRef}
  updateMessages={updateMessages}
  setMessages={setMessages}
/>

function MessageTools(props: MessageToolsInterface) {
  const { contentRef, /* ...rest */ } = props;

  return (
    <>
      {/* NEW: Download button (before copy) */}
      <ExportToWord exportRef={contentRef} filename="Mudram_Chat" />

      {/* Existing: Copy button */}
      <CopyRichContent copyRef={contentRef} />
    </>
  );
}
