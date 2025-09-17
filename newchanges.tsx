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

type Props = {
  gifSrc: string;
  anchorRef: React.RefObject<HTMLElement>;
};

type Message = { id: string; from: "user" | "bot"; text: string };

const AVATAR_SIZE = 56; // px
const CHAT_WIDTH = 320; // px

const FloatingAssistant: React.FC<Props> = ({ gifSrc, anchorRef }) => {
  const [anchored, setAnchored] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  // Rendered position (smoothed); target position (immediate)
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const targetPos = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [dragging, setDragging] = React.useState(false);
  const [hovering, setHovering] = React.useState(false);
  const dragOffset = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafId = React.useRef<number | null>(null);

  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [typing, setTyping] = React.useState(false);

  // Initial anchor: center on AppBar bottom border
  React.useLayoutEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 - AVATAR_SIZE / 2;
    const onBorderY = rect.bottom - AVATAR_SIZE / 2;
    const start = { x: centerX, y: onBorderY };
    targetPos.current = start;
    setPos(start);
  }, [anchorRef]);

  // Smooth position animator (rAF + lerp)
  React.useEffect(() => {
    const animate = () => {
      // simple critically-damped-ish lerp
      const k = 0.25; // smoothing factor: larger = snappier
      const nx = pos.x + (targetPos.current.x - pos.x) * k;
      const ny = pos.y + (targetPos.current.y - pos.y) * k;

      // If close enough, snap; else keep animating
      if (Math.abs(nx - pos.x) < 0.1 && Math.abs(ny - pos.y) < 0.1) {
        setPos(targetPos.current);
        rafId.current = requestAnimationFrame(animate);
        return;
      }
      setPos({ x: nx, y: ny });
      rafId.current = requestAnimationFrame(animate);
    };
    rafId.current = requestAnimationFrame(animate);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* run once */]);

  // Dragging (pointer-based)
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    setAnchored(false);
    dragOffset.current = { x: e.clientX - targetPos.current.x, y: e.clientY - targetPos.current.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    targetPos.current = {
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y,
    };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Hover state (for tooltip + “ready to drag” scale)
  const onMouseEnter = () => setHovering(true);
  const onMouseLeave = () => setHovering(false);

  const onAvatarClick = () => setOpen((v) => !v);

  // Messaging
  const submit = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: crypto.randomUUID(), from: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const botMsg: Message = {
        id: crypto.randomUUID(),
        from: "bot",
        text: "This is a placeholder response from the API.",
      };
      setMessages((m) => [...m, botMsg]);
    }, 1100);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Animated typing dots
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

  // Fixed positioning + GPU-accelerated translate for smoothness
  const positioning = {
    position: anchored ? ("absolute" as const) : ("fixed" as const),
    left: 0,
    top: 0,
    transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
  };

  // Scale rules:
  // - hover (ready to drag): 1.08
  // - dragging: 1.14
  const scale = dragging ? 1.14 : hovering ? 1.08 : 1;

  return (
    <>
      {/* Avatar (round GIF) */}
      <Tooltip title="VOX Assistant" arrow placement="top">
        <Box
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={onAvatarClick}
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
            // Smooth scale + subtle shadow while interacting
            transformOrigin: "center",
            transition: "transform 120ms ease, box-shadow 120ms ease",
            transform: `${positioning.transform} scale(${scale})`,
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
          transform: `translate3d(${pos.x + AVATAR_SIZE + 12}px, ${pos.y}px, 0) ${open ? "scale(1)" : "scale(0.9)"}`,
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
            height: "6lh",
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
                  onClick={submit}
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
