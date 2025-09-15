@@
+  // NEW: local flag so the user can manually close the outage banner
+  const [isOutageOpen, setIsOutageOpen] = React.useState(true); // NEW

   return (
     <OutageBannar
-      open={outageNotice?.msg?.length > 0}
+      open={isOutageOpen && (outageNotice?.msg?.length > 0)} // NEW: gate with local flag
       isAdmin={
         userMeta?.role === 'super_admin' ||
         userMeta?.license_information?.applications
           ?.map((ele: { entry_point: any }) => ele.entry_point)
           ?.includes('/notifications')
       }
       content={outageNotice?.msg}
       id={outageNotice?.note_id}
+      onClose={() => {                     // NEW: handler for the "X" button
+        if (outageNotice?.note_id) {
+          hideNotice(outageNotice.note_id); // NEW: call your existing hide API (safe even if it’s a no-op)
+        }
+        setIsOutageOpen(false);             // NEW: immediately hide in UI
+      }}
     />


  @@
- import { Alert } from '@mui/material';
+ import { Alert, IconButton } from '@mui/material';       // NEW
+ import CloseIcon from '@mui/icons-material/Close';        // NEW

- type Props = {
+ type Props = {
     open: boolean;
     isAdmin: boolean;
     content: string;
     id?: string | number;
+    onClose?: () => void; // NEW: optional close callback
   }
@@
- if (!open) return null;
+ if (!open) return null;

- return (
-   <Alert severity="info" sx={{ /* your styles */ }}>
-     {content}
-   </Alert>
- );
+ return (
+   <Alert
+     severity="info"
+     sx={{ position: 'relative' /* NEW: so we can place the X button */ }}
+   >
+     {/* NEW: small "X" button to close the banner */}
+     {!!onClose && (
+       <IconButton
+         aria-label="close outage banner"
+         size="small"
+         onClick={onClose}                    // NEW: triggers the close logic above
+         sx={{ position: 'absolute', top: 8, right: 8 }}
+       >
+         <CloseIcon fontSize="small" />
+       </IconButton>
+     )}
+
+     {content}
+   </Alert>
+ );
