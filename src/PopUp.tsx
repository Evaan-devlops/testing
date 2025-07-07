import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

interface PopUpProps {
  open: boolean;
  onClose: () => void;
}

const buttonStyles = {
  width: 164,
  height: 30,
  borderRadius: "27px",
  backgroundColor: "#EBF2FF",
  border: "none",
  boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.15)",
  textTransform: "none",
  "&:hover": {
    backgroundColor: "#D0E0FF",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)",
  },
  "&:active": {
    backgroundColor: "#A5C3FF",
    boxShadow: "0px 1px 4px rgba(0, 0, 0, 0.3)",
  },
};

const PopUp: React.FC<PopUpProps> = ({ open, onClose }) => {
    const userNtid = "john.doe"; // Replace with dynamic variable
  const [subject, setSubject] = useState(`Token Top-Up Request for : ${userNtid}`);
const [description, setDescription] = useState(
  `Hi team,\nmy allocated token quota is nearing to end, please topup the tokens.\n\nThanks and Regards\n${userNtid}`
);
  const [alreadySent, setAlreadySent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const contentRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem("topUpRequestSent") === "true") {
      setAlreadySent(true);
    }
  }, [open]);

  const handleSend = async () => {
    try {
      const payload = {
        subject,
        description,
        userNtid,
      };

      await fetch("/topup/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      localStorage.setItem("topUpRequestSent", "true");
      setSubmitted(true);
    } catch (err) {
      setErrorMessage("Submission failed. Please try again.");
    }
  };

  const renderAlreadySent = () => (
    <DialogContent>
      <Typography variant="h6" textAlign="center">
        Top-Up Request already sent.
      </Typography>
      <DialogActions
        sx={{
          borderRadius: "16px",
          paddingBottom: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          alignItems: "center",
        }}
      >
        <Button sx={buttonStyles} onClick={onClose}>
          OK
        </Button>
      </DialogActions>
    </DialogContent>
  );

  const renderSubmitted = () => (
    <DialogContent ref={contentRef}>
      <Typography variant="h6" textAlign="center">
        Thank you. Your top-up request has been sent.
      </Typography>
      <DialogActions
        sx={{
          borderRadius: "16px",
          paddingBottom: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 1,
          alignItems: "center",
        }}
      >
        <Button sx={buttonStyles} onClick={onClose}>
          Exit
        </Button>
      </DialogActions>
    </DialogContent>
  );

  const renderForm = () => (
    <>
      <DialogTitle
        sx={{ borderRadius: "16px", padding: "16px", color: "white" }}
      >
        Submit Top-Up Request
        <IconButton
          onClick={onClose}
          style={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {errorMessage && (
        <Typography color="red" textAlign="center">
          {errorMessage}
        </Typography>
      )}

      <DialogContent ref={contentRef}>
 <TextField
  label="Subject"
  fullWidth
  variant="outlined"
  value={subject}
  onChange={(e) => setSubject(e.target.value)}
  margin="dense"
  InputProps={{
    style: { color: "#000000" }, // Black text
  }}
/>

<TextField
  label="Mail Content"
  fullWidth
  variant="outlined"
  multiline
  minRows={5}
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  margin="dense"
  InputProps={{
    style: { color: "#000000" }, // Black text
  }}
/>


      </DialogContent>

      <DialogActions
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          alignItems: "center",
        }}
      >
        <Button
          sx={{ ...buttonStyles, color: "#007BFF" }}
          onClick={handleSend}
          variant="contained"
        >
          Send
        </Button>
      </DialogActions>
    </>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{ borderRadius: "16px", overflow: "hidden" }}
    >
      {alreadySent ? renderAlreadySent() : submitted ? renderSubmitted() : renderForm()}
    </Dialog>
  );
};


export default PopUp;
