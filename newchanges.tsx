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
import MinimizeIcon from "@mui/icons-material/Minimize";
import ChatBubbleIcon from "@mui/icons-material/ChatBubbleOutline";
import { saveData } from "../services/apiService"; // adjust if needed

type Props = {
  gifSrc: string;
  anchorRef: React.RefObject<HTMLElement>;
  sessionId?: number;
  ensureSession?: () => Promise<number>;
};

type Message = { id: string; from: "user" | "bot"; text: string };

type VoxMessage = { msg_text?: string; msg?: string };
type VoxChatResponse =
  | {
      status_code?: number;
      status?: string;
      result?: string;
      message?: VoxMessage[] | VoxMessage | null;
    }
  | any;

/** ---------- tweakables ---------- */
const AVATAR_SIZE = 80;               // bigger round GIF
const CHAT_WIDTH = 440;               // wider chat panel
const MAX_MESSAGES_HEIGHT = "60vh";   // panel grows up to this, then scrolls
const MIN_MESSAGES_HEIGHT = 120;      // minimum messages area height (px)
const DOCK_SIZE = 56;                 // right-edge launcher size
/** -------------------------------- */

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const FloatingAssistant: React.FC<Props> = ({
  gifSrc,
  anchorRef,
  sessionId: sessionIdProp,
  ensureSession,
}) => {
  // layout / animation
  const [anchored, setAnchored] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [minimized, setMinimized] = React.useState(false);

  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetPos = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const dragOffset = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafId = React.useRef<number | null>(null);

  // chat state
  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [typing, setTyping] = React.useState(false);
  const messagesBoxRef = React.useRef<HTMLDivElement | null>(null);

  // session
  const [sessionId, setSessionId] = React.useState<number | null>(sessionIdProp ?? null);
  React.useEffect(() => {
    if (typeof sessionIdProp === "number" && sessionIdProp !== sessionId) {
      setSessionId(sessionIdProp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdProp]);

  // initial anchor (or restore saved avatar position)
  React.useLayoutEffect(() => {
    if (!anchorRef.current) return;
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

  // smooth animator
  React.useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      const k = 0.25;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-anchor on resize when still anchored
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

  // dragging
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    setAnchored(false);
    dragOffset.current = {
      x: e.clientX - targetPos.current.x,
      y: e.clientY - targetPos.current.y,
    };
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
    localStorage.setItem("vox-avatar-pos", JSON.stringify(targetPos.current));
  };

  const onMouseEnter = () => setHovering(true);
  const onMouseLeave = () => setHovering(false);

  // ensure a session if possible
  const ensureSessionNow = async () => {
    if (!sessionId && ensureSession) {
      const sid = await ensureSession();
      setSessionId(sid);
      return sid;
    }
    return sessionId!;
  };

  const onAvatarClick = async () => {
    try {
      await ensureSessionNow();
    } catch {
      /* submit() will show the error if needed */
    }
    setOpen((v) => !v);
    setMinimized(false);
  };

  // Enter to send
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  // auto-scroll newest
  React.useEffect(() => {
    const el = messagesBoxRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, typing, open]);

  // normalize backend message field to array
  const toArray = (m: VoxChatResponse["message"]): VoxMessage[] => {
    if (!m) return [];
    if (Array.isArray(m)) return m;
    if (typeof m === "object") return [m as VoxMessage];
    return [];
  };

  // send to API
  const submit = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { id: crypto.randomUUID(), from: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);

    try {
      const sid = await ensureSessionNow();
      if (!sid) throw new Error("Missing session_id");

      const payload = {
        chat_completion_message: {
          session_id: sid,
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

      const url =
        "/vox/auth/service/chats?is_gen_ai_studio_client=false&regenerate_response=false&response_stream=false&route_to_genai=false&assistant=true";

      const res: any = await saveData(url, payload);
      const json: VoxChatResponse = (res?.data ?? res) as VoxChatResponse;

      const arr = toArray(json?.message);
      const first = arr.find((m) => (m.msg_text ?? m.msg)?.toString().trim()) ?? arr[0];
      let botText = first ? (first.msg_text ?? first.msg ?? "").toString().trim() : "";

      if (!botText && typeof json?.result === "string") {
        try {
          const r = JSON.parse(json.result);
          if (r && typeof r.content === "string") botText = r.content.trim();
        } catch {}
      }
      if (!botText) botText = "No response text returned by the service.";

      setTyping(false);
      setMessages((m) => [...m, { id: crypto.randomUUID(), from: "bot", text: botText }]);
    } catch (err: any) {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          from: "bot",
          text: `⚠️ Failed to create chat: ${err?.message ?? "Unknown error"}`,
        },
      ]);
    }
  };

  // UI bits
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
            "@keyframes blink": {
              "0%, 80%, 100%": { opacity: 0.2 },
              "40%": { opacity: 1 },
            },
          }}
        />
      ))}
    </Box>
  );

  const Bubble: React.FC<{ from: "user" | "bot"; children: React.ReactNode }> = ({
    from,
    children,
  }) => (
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

  // positioning + scale
  const baseTransform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  const scale = dragging ? 1.14 : hovering ? 1.08 : 1;
  const positioning = {
    position: anchored ? ("absolute" as const) : ("fixed" as const),
    left: 0,
    top: 0,
  };

  /** ---------------- Dock launcher (right edge) ---------------- */
  const restoreFromDock = async () => {
    // put avatar near right edge (visible) before opening
    setAnchored(false);
    const margin = 16;
    const x = (window.innerWidth ?? 0) - AVATAR_SIZE - margin;
    const y = Math.round((window.innerHeight ?? 0) * 0.6) - AVATAR_SIZE / 2;
    const clamped = {
      x: clamp(x, margin, (window.innerWidth ?? 0) - AVATAR_SIZE - margin),
      y: clamp(y, margin, (window.innerHeight ?? 0) - AVATAR_SIZE - margin),
    };
    targetPos.current = clamped;
    setPos(clamped);

    await ensureSessionNow();
    setMinimized(false);
    setOpen(true);
  };

  const DockLauncher = () =>
    minimized ? (
      <Tooltip title="Open VOX Assistant" placement="left">
        <Box
          role="button"
          aria-label="Open VOX Assistant"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              void restoreFromDock();
            }
          }}
          onClick={() => void restoreFromDock()}
          sx={{
            position: "fixed",
            top: "60%",
            right: 12,
            transform: "translateY(-50%)",
            width: DOCK_SIZE,
            height: DOCK_SIZE,
            borderRadius: DOCK_SIZE / 2,
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.12)",
            boxShadow: 4,
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            zIndex: 3000,          // on top of everything
            pointerEvents: "auto",
          }}
        >
          <ChatBubbleIcon />
        </Box>
      </Tooltip>
    ) : null;

  return (
    <>
      {/* Right-edge dock (only when minimized) */}
      <DockLauncher />

      {/* Avatar (hidden when minimized) */}
      {!minimized && (
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
              position: anchored ? "absolute" : "fixed",
            }}
          >
            {/* Mini overlay minimize button on the avatar (works even when chat closed) */}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // don’t open chat
                setOpen(false);
                setMinimized(true);
              }}
              sx={{
                position: "absolute",
                top: -6,
                right: -6,
                width: 24,
                height: 24,
                bgcolor: "#fff",
                border: "1px solid rgba(0,0,0,0.12)",
                boxShadow: 2,
                zIndex: 1400,
                pointerEvents: "auto",
                "&:hover": { bgcolor: "#fafafa" },
              }}
            >
              <MinimizeIcon fontSize="inherit" />
            </IconButton>

            <Box
              component="img"
              src={gifSrc}
              alt="assistant"
              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>
        </Tooltip>
      )}

      {/* Chat window (hidden when minimized) */}
      {!minimized && (
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
          {/* Header row with minimize */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2" sx={{ flex: 1 }}>
              VOX Assistant
            </Typography>
            <Tooltip title="Minimize">
              <IconButton
                size="small"
                onClick={() => {
                  setOpen(false);
                  setMinimized(true);
                }}
              >
                <MinimizeIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box
            ref={messagesBoxRef}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              maxHeight: MAX_MESSAGES_HEIGHT,
              minHeight: MIN_MESSAGES_HEIGHT,
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
            maxRows={6}
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
      )}
    </>
  );
};

export default FloatingAssistant;
