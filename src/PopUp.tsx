import React, { useState, useRef } from "react";
import html2canvas from "html2canvas";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  Button,
  IconButton,
  Box,
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
  const [subject, setSubject] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [emailFollowUp, setEmailFollowUp] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const contentRef = useRef(null);

  // Handle File Upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFiles([event.target.files[0]]); // Only allow one file
    }
  };

  // Remove a selected file
  const handleRemoveFile = (fileName: string) => {
    setFiles(files.filter((file) => file.name !== fileName));
  };

  // Screenshot Capture
  const captureScreenshot = async () => {
    if (contentRef.current) {
      html2canvas(contentRef.current).then((canvas) => {
        canvas.toBlob((blob) => {
          if (blob) {
            const screenshotFile = new File([blob], "screenshot.png", {
              type: "image/png",
            });
            setFiles([...files, screenshotFile]);
          }
        });
      });
    }
  };

  // Submit Feedback to FastAPI
  const handleSubmit = async () => {
    if (!subject || !description) {
      setErrorMessage(
        "Please fill Subject and Description fields before submitting the feedback."
      );
      return;
    }
    setSubmitting(true);

    // Creating FormData object for file uploads
    const formData = new FormData();
    formData.append("type_of_feedback", "General"); // Modify if needed
    formData.append("subject", subject);
    formData.append("description", description);
    formData.append("email_followup", emailFollowUp ? "true" : "false"); // Properly pass checkbox value

    // Append files (uploaded images & screenshots)
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await fetch("http://localhost:3000/feedbacks/post", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to submit feedback!");

      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      setErrorMessage("Submission failed. Please try again.");
    } finally {
      setSubmitting(false); // <-- Add this (so user can retry if failed)
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      sx={{ borderRadius: "16px", overflow: "hidden" }} // Curved edges applied
    >
      {submitted ? (
        // **Success Message After Submission**
        <DialogContent
          ref={contentRef}
          sx={{ borderRadius: "16px", overflow: "hidden" }}
        >
          <Typography variant="h6" textAlign="center">
            Thank you for Sharing Feedback
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
      ) : (
        <>
          <DialogTitle
            sx={{ borderRadius: "16px", padding: "16px", color: "white" }}
          >
            Submit Feedback
            <IconButton
              onClick={onClose}
              style={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>

          {/* Error Message */}
          {errorMessage && (
            <Typography color="red" textAlign="center">
              {errorMessage}
            </Typography>
          )}

          <DialogContent ref={contentRef}>
            {/* Subject Input */}

            <TextField
              label="Subject"
              fullWidth
              variant="outlined"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              margin="dense"
            />

            {/* Description Input (Expandable) */}
            <TextField
              label="Description"
              fullWidth
              variant="outlined"
              multiline
              minRows={3}
              maxRows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              margin="dense"
            />

            {/* File Upload Section */}
            {/* File Upload Section */}
            <Typography variant="body1" mt={2}>
              Upload:
            </Typography>

            {/* Box enclosing Choose File button */}
            <Box mt={1} p={2} border="1px solid #ccc" borderRadius="16px">
              <Button
                sx={buttonStyles}
                component="label"
                disabled={files.length >= 1}
              >
                Choose File
                <input type="file" hidden onChange={handleFileChange} />
              </Button>

              {/* Show uploaded file names with Remove button */}
              {files.length > 0 && (
                <Box mt={2}>
                  {files.map((file, index) => (
                    <Box
                      key={index}
                      display="flex"
                      justifyContent="space-between"
                      alignItems="center"
                      mt={1}
                      p={1}
                      border="1px solid #ddd"
                      borderRadius="8px"
                    >
                      <Typography>{file.name}</Typography>
                      <Button
                        color="error"
                        size="small"
                        onClick={() => handleRemoveFile(file.name)}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* Email Follow-up Checkbox */}
            <Box mt={2} display="flex" alignItems="center">
              <Checkbox
                checked={emailFollowUp}
                onChange={(e) => setEmailFollowUp(e.target.checked)}
              />
              <Typography>The follow-ups can be done over my email.</Typography>
            </Box>
          </DialogContent>

          {/* Submit  Buttons */}
          <DialogActions
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              alignItems: "center",
            }}
          >
            {/* Submit button moved up with blue text styling */}
            <Button
              sx={{ ...buttonStyles, color: "#007BFF" }}
              onClick={handleSubmit}
              variant="contained"
              disabled={
                submitting || // Disable while submitting
                !subject.trim() || // Disable if subject is empty
                !description.trim() // Disable if description is empty
              }
            >
              Submit
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default PopUp;
