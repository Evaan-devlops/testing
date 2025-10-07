Easy win—wrap the minimize `IconButton` in a MUI `Tooltip`.

### On the avatar (overlay mini button)

Replace your current overlay button with:

```tsx
<Tooltip title="minimise" arrow placement="top">
  <IconButton
    aria-label="minimise"
    size="small"
    onClick={(e) => {
      e.stopPropagation(); // don’t open chat
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

### (Optional) Chat header minimise button too

If you want the same hover text there:

```tsx
<Tooltip title="minimise" arrow>
  <IconButton
    aria-label="minimise"
    size="small"
    onClick={() => {
      setOpen(false);
      setMinimized(true);
    }}
  >
    <MinimizeIcon fontSize="small" />
  </IconButton>
</Tooltip>
```

That’s it—hovering either button will show “minimise”.
