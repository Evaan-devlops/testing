// src/components/FloatingAssistant.tsx
import React from "react";
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
// Adjust this import path if your folder layout differs.
// For typical layout: src/components/* -> src/services/apiService
import { saveData } from "../services/apiService";

type Props = {
  /** Round GIF source */
  gifSrc: string;
  /** AppBar (or any header) element ref to compute initial anchor position */
  anchorRef: React.RefObject<HTMLElement>;
  /** If Header has already created a session, pass it down */
  sessionId?: number;
  /**
   * Call to lazily create (or retrieve cached) session in Header.
   * We'll call this when the avatar is first clicked if sessionId isn't present.
   */
  ensureSession?: () => Promise<number>;
};

type Message = { id: string; from: "user" | "bot"; text: string };

const AVATAR_SIZE = 56; // px
const CHAT_WIDTH = 320; // px

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const FloatingAssistant: React.FC<Props> = ({ gifSrc, anchorRef, sessionId: sessionIdProp, ensureSession }) => {
  // --- layout & animation state ---
  const [anchored, setAnchored] = React.useState(true); // absolute vs fixed
  const [open, setOpen] = React.useState(false);

  // Rendered (smoothed) position
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Target position (immediate)
  const targetPos = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [dragging, setDragging] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const dragOffset = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafId = React.useRef<number | null>(null);

  // --- chat state ---
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [typing, setTyping] = React.useState(false);

  // --- session wiring (from Header) ---
  const [sessionId, setSessionId] = React.useState<number | null>(sessionIdProp ?? null);
  React.useEffect(() => {
    if (typeof sessionIdProp === "number" && sessionIdProp !== sessionId) {
      setSessionId(sessionIdProp);
    }
  }, [sessionIdProp, sessionId]);

  // ----- Initial anchor: center on AppBar bottom border -----
  React.useLayoutEffect(() => {
    if (!anchorRef.current) return;

    // If a previously saved avatar position exists, restore it and use fixed positioning.
    const saved = localStorage.getItem("vox-avatar-pos");
    if (saved) {
      const p = JSON.parse(saved) as { x: number; y: number };
      targetPos.current = p;
      setPos(p);
      setAnchored(false);
      return;
    }

    const rect = anchorRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 - AVATAR_SIZE / 2;
    const onBorderY = rect.bottom - AVATAR_SIZE / 2;
    const start = { x: centerX, y: onBorderY };
    targetPos.current = start;
    setPos(start);
  }, [anchorRef]);

  // ----- Smooth position animator (requestAnimationFrame + lerp) -----
  React.useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      const k = 0.25; // smoothing factor: larger => snappier
      const nx = pos.x + (targetPos.current.x - pos.x) * k;
      const ny = pos.y + (targetPos.current.y - pos.y) * k;
      const done = Math.hypot(targetPos.current.x - nx, targetPos.current.y - ny) < 0.1;
      setPos(done ? targetPos.current : { x: nx, y: ny });
      rafId.current = requestAnimationFrame(animate);
    };
    rafId.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-anchor on window resize when still anchored to header
  React.useEffect(() => {
    if (!anchored) return;
    const onResize = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      targetPos.current = {
        x: rect.left + rect.width / 2 - AVATAR_SIZE / 2,
        y: rect.bottom - AVATAR_SIZE / 2,
      };
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [anchored, anchorRef]);

  // ----- Pointer-based dragging (smooth + clamped) -----
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    setAnchored(false);
    dragOffset.current = { x: e.clientX - targetPos.current.x, y: e.clientY - targetPos.current.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const x = e.clientX - dragOffset.current.x;
    const y = e.clientY - dragOffset.current.y;
    const maxX = (window.innerWidth ?? 0) - AVATAR_SIZE - 8;
    const maxY = (window.innerHeight ?? 0) - AVATAR_SIZE - 8;
    targetPos.current = { x: clamp(x, 8, maxX), y: clamp(y, 8, maxY) };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    // persist last position
    localStorage.setItem("vox-avatar-pos", JSON.stringify(targetPos.current));
  };

  // Hover state (for tooltip + “ready to drag” scale)
  const onMouseEnter = () => setHovering(true);
  const onMouseLeave = () => setHovering(false);

  // --- click to open; ensure session exists first ---
  const onAvatarClick = async () => {
    if (!sessionId && ensureSession) {
      try {
        const sid = await ensureSession();
        setSessionId(sid);
      } catch {
        // swallow; UI will still open, and submit() will error nicely if no session
      }
    }
    setOpen((v) => !v);
  };

  // --- Enter to send ---
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  // ----- Animated typing dots (bot) -----
  const Dots = () => (
    <Box sx={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "currentColor",
            opacity: 0.5,
            animation: `blink 1s ${i * 0.15}s infinite`,
            "@keyframes blink": { "0%, 80%, 100%": { opacity: 0.2 }, "40%": { opacity: 1 } },
          }}
        />
      ))}
    </Box>
  );

  // ----- Chat bubble -----
  const Bubble: React.FC<{ from: "user" | "bot"; children: React.ReactNode }> = ({ from, children }) => (
    <Box
      sx={{
        alignSelf: from === "user" ? "flex-end" : "flex-start",
        maxWidth: "85%",
        px: 1.25,
        py: 0.75,
        borderRadius: 2,
        bgcolor: from === "user" ? "primary.main" : "grey.100",
        color: from === "user" ? "primary.contrastText" : "text.primary",
        boxShadow: 1,
      }}
    >
      <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
        {children}
      </Typography>
    </Box>
  );

  // ----- Submit: send user text -> create chat API -----
  const submit = async () => {
    const text = input.trim();
    if (!text) return;

    // push user bubble immediately
    const userMsg: Message = { id: crypto.randomUUID(), from: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    try {
      // make sure session exists
      let sid = sessionId;
      if (!sid && ensureSession) {
        sid = await ensureSession();
        setSessionId(sid);
      }
      if (!sid) throw new Error("Missing session_id");

      // Payload shape matches your screenshot (#6), replacing "user_input" with `text`
      const payload = {
        chat_completion_message: {
          session_id: sid, // <-- from header
          engine: "gpt-4o",
          messages: [
            {
              role: "user",
              content: "Which models are available in this application?",
              typecontent: [{ type: "text", content: text }],
            },
          ],
          sessionType: "assistant",
          temperature: 0.7,
          max_tokens: 1026,
          thinking_tokens: 1024,
          reasoning_efforts: "low",
          is_summarize: false,
          vision: true,
          output_tokens: 1026,
          is_compare_docs: false,
        },
      };

      // Keep the query string flags as shown in your screenshot
      const res = await saveData(
        "/vox/auth/service/chats?is_gen_ai_studio_client=false&regenerate_response=false&response_stream=false&route_to_genai=false&assistant=true",
        payload
      );

      // Defensive extraction until exact shape is confirmed
      const data = (res as any)?.data ?? res;
      const botText =
        data?.answer ??
        data?.message ??
        data?.content ??
        data?.response_text ??
        String(typeof data === "string" ? data : JSON.stringify(data)).slice(0, 500);

      setTyping(false);
      const botMsg: Message = { id: crypto.randomUUID(), from: "bot", text: botText };
      setMessages((m) => [...m, botMsg]);
    } catch (err: any) {
      setTyping(false);
      const botMsg: Message = {
        id: crypto.randomUUID(),
        from: "bot",
        text: `⚠️ Failed to create chat: ${err?.message ?? "Unknown error"}`,
      };
      setMessages((m) => [...m, botMsg]);
    }
  };

  // ----- Positioning + scale rules -----
  const baseTransform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  const scale = dragging ? 1.14 : hovering ? 1.08 : 1;

  const positioning = {
    position: anchored ? ("absolute" as const) : ("fixed" as const),
    left: 0,
    top: 0,
  };

  return (
    <>
      {/* Avatar (round GIF) */}
      <Tooltip title="VOX Assistant" arrow placement="top">
        <Box
          role="button"
          tabIndex={0}
          aria-label="Open VOX Assistant"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void onAvatarClick();
            }
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() => void onAvatarClick()}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          sx={{
            ...positioning,
            zIndex: 1300,
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: "50%",
            overflow: "hidden",
            cursor: dragging ? "grabbing" : "grab",
            outline: "2px solid #E0E0E0",
            bgcolor: "#fff",
            display: "grid",
            placeItems: "center",
            transformOrigin: "center",
            transition: "transform 120ms ease, box-shadow 120ms ease",
            transform: `${baseTransform} scale(${scale})`,
            boxShadow: dragging || hovering ? 4 : 0,
            willChange: "transform",
          }}
        >
          <Box
            component="img"
            src={gifSrc}
            alt="assistant"
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Box>
      </Tooltip>

      {/* Chat window (slides open from avatar) */}
      <Paper
        elevation={6}
        sx={{
          position: anchored ? "absolute" : "fixed",
          left: 0,
          top: 0,
          transform: `translate3d(${pos.x + AVATAR_SIZE + 12}px, ${pos.y}px, 0) ${
            open ? "scale(1)" : "scale(0.9)"
          }`,
          transformOrigin: "left top",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease, transform 180ms ease",
          p: 1.5,
          borderRadius: 2,
          bgcolor: "#fff",
          zIndex: 1300,
          width: CHAT_WIDTH,
          willChange: "transform, opacity",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            height: "6lh", // ~6 lines
            minHeight: 108,
            maxHeight: 132,
            overflowY: "auto",
            pr: 0.5,
            pb: 1,
          }}
        >
          {messages.map((m) => (
            <Bubble key={m.id} from={m.from}>
              {m.text}
            </Bubble>
          ))}
          {typing && (
            <Bubble from="bot">
              <Dots />
            </Bubble>
          )}
        </Box>

        <TextField
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your prompt…"
          fullWidth
          size="small"
          multiline
          maxRows={3}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 9999,
              "& fieldset": { borderColor: "#1976d2" },
              "&:hover fieldset": { borderColor: "#1976d2" },
              "&.Mui-focused fieldset": { borderColor: "#1976d2" },
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label="send"
                  onClick={() => void submit()}
                  disabled={!input.trim()}
                  edge="end"
                  size="small"
                >
                  <SendIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Paper>
    </>
  );
};

export default FloatingAssistant;
