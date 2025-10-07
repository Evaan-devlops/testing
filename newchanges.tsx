You’re getting two tooltips because the avatar itself has a Tooltip (“VOX Assistant”) and the minimize button has its own. When you hover the minimize button, the parent tooltip also fires.

Fix: temporarily disable the avatar tooltip while the mouse is over the minimize button.

### Minimal patch

1. Add a state flag:

```tsx
const [suppressAvatarTooltip, setSuppressAvatarTooltip] = React.useState(false);
```

2. On the **avatar** tooltip, wire that flag:

```tsx
<Tooltip
  title="VOX Assistant"
  arrow
  placement="top"
  disableHoverListener={suppressAvatarTooltip}
  enterDelay={250}
  leaveDelay={100}
>
  {/* avatar box ... */}
</Tooltip>
```

3. On the **minimize IconButton**, toggle the flag on hover:

```tsx
<Tooltip title="minimise" arrow placement="top">
  <IconButton
    aria-label="minimise"
    size="small"
    onMouseEnter={() => setSuppressAvatarTooltip(true)}
    onMouseLeave={() => setSuppressAvatarTooltip(false)}
    onClick={(e) => {
      e.stopPropagation();
      setOpen(false);
      setMinimized(true);
    }}
    sx={{
      position: "absolute",
      top: 4,
      right: 4,
      width: 28,
      height: 28,
      bgcolor: "background.paper",
      color: "text.primary",
      border: "1px solid",
      borderColor: "divider",
      boxShadow: 2,
      zIndex: 2,
      pointerEvents: "auto",
      "&:hover": { bgcolor: "grey.50" },
    }}
  >
    <MinimizeIcon fontSize="inherit" />
  </IconButton>
</Tooltip>
```

That’s it—when you hover the minimize button, only “minimise” shows; the “VOX Assistant” tooltip stays suppressed.
