Sweet—let’s drop a draggable, round GIF right on the header’s bottom border, and pop a tiny 6-line chat from it.

Below are **two small edits** to your header + **one new component**. Copy–paste as is.

---

# 1) Header changes (where your `<AppBar …>` is)

```tsx
// at top of the file
import React from "react";
import FloatingAssistant from "./FloatingAssistant"; // ⬅️ new file added below
import tourAi from "@/assets/icons/tourAi.gif";       // ⬅️ your gif path

// inside your component:
const appBarRef = React.useRef<HTMLDivElement>(null);

// ...later, replace your AppBar opening tag with this one so we can anchor:
<AppBar
  ref={appBarRef}                                     // ⬅️ add ref so we know where the border is
  sx={{
    backgroundColor: "#FFF",
    borderBottom: "1px solid #E0E0E0",
    position: isVoxAuthor ? "sticky" : "static",
    top: isVoxAuthor && 0,
    boxShadow: "none",
  }}
>
  {/* …your header content… */}
</AppBar>

{/* Put the assistant AFTER the AppBar so it can sit on the border and later float */}
<FloatingAssistant gifSrc={tourAi} anchorRef={appBarRef} />
```

> 💡 The assistant starts **centered on the AppBar’s bottom border**, then becomes **freely draggable** and stays where you drop it.

---

# 2) New file: `src/components/FloatingAssistant.tsx`

```tsx
import React from "react";
import { Box, Paper, Typography, IconButton, TextField, InputAdornment } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

/**
 * FloatingAssistant
 * - Starts anchored: centered on the AppBar bottom border (via anchorRef).
 * - Draggable: click+drag to move anywhere; it stays where you release it.
 * - On click: opens a smooth, 6-line mini chat window "attached" to the GIF.
 * - Textbox with rounded blue border, send inside input, enabled only with text.
 * - Shows user message (right), bot (left). While "waiting", shows animated dots.
 */
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
  const [pos, setPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragOffset = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const [input, setInput] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [typing, setTyping] = React.useState(false);

  // Compute initial anchored position: center at AppBar’s bottom border.
  React.useLayoutEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2 - AVATAR_SIZE / 2;
    const onBorderY = rect.bottom - AVATAR_SIZE / 2; // straddle the 1px border
    setPos({ x: centerX, y: onBorderY });
  }, [anchorRef]);

  // Drag handlers (pointer-based for mouse/touch).
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging(true);
    setAnchored(false); // once you drag, it floats (fixed positioning)
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Toggle open on avatar click (no drag)
  const onAvatarClick = () => setOpen((v) => !v);

  // Submit message (Enter or send icon)
  const submit = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: Message = { id: crypto.randomUUID(), from: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    // fake API: show typing dots, then a reply
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

  // Bubbles
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

  // Positioning style: anchored = absolute to the app bar’s flow; floating = fixed
  const avatarStyle = anchored
    ? {
        position: "absolute" as const,
        left: pos.x,
        top: pos.y,
      }
    : {
        position: "fixed" as const,
        left: pos.x,
        top: pos.y,
      };

  return (
    <>
      {/* Avatar (round GIF) */}
      <Box
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onAvatarClick}
        sx={{
          ...avatarStyle,
          zIndex: 1300,
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          borderRadius: "50%",
          overflow: "hidden",
          cursor: dragging ? "grabbing" : "grab",
          outline: "2px solid #E0E0E0",  // subtle ring to sit on the border
          bgcolor: "#fff",
          display: "grid",
          placeItems: "center",
          transition: "transform 180ms ease",
          "&:active": { transform: "scale(0.98)" },
        }}
      >
        <Box
          component="img"
          src={gifSrc}
          alt="assistant"
          sx={{ width: "100%", height: "100%", objectFit: "cover" }} // makes it perfectly round
        />
      </Box>

      {/* Chat window (slides open from avatar) */}
      <Paper
        elevation={6}
        sx={{
          position: anchored ? "absolute" : "fixed",
          left: pos.x + AVATAR_SIZE + 12, // extend from avatar’s right
          top: pos.y,
          width: CHAT_WIDTH,
          transformOrigin: "left top",
          transform: open ? "scale(1)" : "scale(0.9)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 180ms ease, transform 180ms ease",
          p: 1.5,
          borderRadius: 2,
          bgcolor: "#fff",
          zIndex: 1300,
        }}
      >
        {/* Messages area: exactly ~6 lines tall (uses lh unit where supported) */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
            height: "6lh",           // modern; falls back below
            minHeight: 108,          // fallback ~6 * 18px
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

        {/* Input with rounded blue outline and send button inside */}
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
```

---

## Notes & why this fits each requirement

* **(a) Round GIF on the border center**: initially positioned with the AppBar’s DOM rect; we offset by half the avatar height to straddle the bottom border.
* **(b) Draggable & persists**: pointer events update a fixed `pos`, so it stays where you leave it.
* **(c) Smoothly opens a 6-line chat**: tiny Paper scales/opacity-fades from the GIF; message pane height \~6 lines.
* **(d) Textbox with curved blue edges + send inside**: rounded 9999 radius, blue outline, end-adornment send icon enabled only when there’s text; Enter submits.
* **(e) User right, bot left, 3 flashing dots**: bubbles aligned, and a lightweight `blink` animation simulates typing until the dummy reply arrives.

If your project uses a different asset path, just update the `import tourAi` line.
