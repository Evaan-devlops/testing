Got it — your `OutageBannar` already has a local `handleClose()` that sets `open(false)`.
You can use it in two ways. Easiest is to add a close “X” **inside** the banner and call `handleClose` on click. If you truly want to call it from the **parent JSX**, expose it via a ref. I’m giving you both; pick one.

# Option A (simple): add an “X” inside `OutageBannar`

**Diff-only snippet** (new/changed lines marked with `// NEW`):

```diff
- import CloseIcon from '@mui/icons-material/Close';
+ import CloseIcon from '@mui/icons-material/Close';           // NEW
+ import { IconButton } from '@mui/material';                   // NEW

 function OutageBannar(props: any) {
   const [open, setOpen] = useState(props.open || false);

   useEffect(() => {
     setOpen(props.open);
   }, [props.open, props.id]);

   function handleClose() {
     setOpen(false);
   }

   return (
     <div>
       <Backdrop
         sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
         open={open || false}
       />
-      <Card sx={{ minWidth: 275, padding: '3em' }}>
+      <Card sx={{ minWidth: 275, padding: '3em', position: 'relative' }}>  // NEW
+        {/* X button to close the banner */}                                  // NEW
+        <IconButton                                                          // NEW
+          aria-label="close outage banner"                                   // NEW
+          onClick={handleClose}                                              // NEW
+          sx={{ position: 'absolute', top: 8, right: 8 }}                   // NEW
+        >                                                                    // NEW
+          <CloseIcon fontSize="small" />                                     // NEW
+        </IconButton>                                                        // NEW
```

> That’s it. Clicking the “X” calls `handleClose()` and hides the banner.

# Option B (call `handleClose` from the parent JSX)

If you need to trigger close from the parent (your first screenshot), expose the method via a ref.

**Inside `OutageBannar`:**

```diff
-import React, { useEffect, useState } from 'react';
+import React, { useEffect, useState, forwardRef, useImperativeHandle } from 'react';

-function OutageBannar(props: any) {
+const OutageBannar = forwardRef(function OutageBannar(props: any, ref) {  // NEW
  const [open, setOpen] = useState(props.open || false);

  useEffect(() => { setOpen(props.open); }, [props.open, props.id]);

  function handleClose() { setOpen(false); }

+ // Expose handleClose to parent via ref                                    // NEW
+ useImperativeHandle(ref, () => ({ close: handleClose }));                  // NEW
   ...
-}
+});
+export default OutageBannar;                                                // ensure default export
```

**In the parent JSX (your first screenshot area):**

```diff
+ const outageRef = React.useRef<{ close: () => void } | null>(null);   // NEW

- <OutageBannar
+ <OutageBannar
+   ref={outageRef}                                                    // NEW
    open={outageNotice?.msg?.length > 0}
    isAdmin={ ... }
    content={outageNotice?.msg}
    id={outageNotice?.note_id}
/>

+ {/* Example button somewhere in parent to close the banner */}        // NEW
+ <button onClick={() => outageRef.current?.close()}>Hide banner</button>  // NEW
```

* **Option A** is what you asked for (“use the handleClose method in the JSX part” of the banner itself).
* **Option B** is there if you want to close it from the parent.
