// FeedbackPopup.tsx

// ============================== L1–18: Imports ==============================
import React, { useState, useRef } from 'react';
import {
  Dialog,            // Modal container
  DialogTitle,       // Modal header
  DialogContent,     // Modal body
  DialogActions,     // Modal footer
  TextField,         // Text inputs
  Checkbox,          // (Kept from original; not used below)
  Button,            // Buttons
  IconButton,        // Icon-only button (close)
  Box,               // Layout utility (flex)
  Typography,        // Text display
  Menu,              // Header menu
  MenuItem,          // Menu item
  FormControl,       // Wrapper for labels + controls
  InputLabel,        // Floating labels
  Select,            // Dropdown
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
// import DropdownComponent from './DropdownComponent'; // (Kept from original; still rendered under Subject)
import { fetchData, saveData } from '../services/apiService'; // saveData used

// ============================== L20–23: Props ==============================
interface PopUpProps {
  linkTracking: any; // Tracking callback for analytics
  navButton: any;    // Style overrides for header button
}

// ============================== L25–42: Shared button styles ==============================
const buttonStyles = {
  width: 164,
  height: 30,
  borderRadius: '27px',
  backgroundColor: '#EBF2FF',
  border: 'none',
  boxShadow: '0px 2px 6px rgba(0,0,0,0.15)',
  textTransform: 'none',
  '&:hover': {
    backgroundColor: '#D0E0FF',
    boxShadow: '0px 4px 10px rgba(0,0,0,0.2)',
  },
  '&:active': {
    backgroundColor: '#A5C3FF',
    boxShadow: '0px 1px 4px rgba(0,0,0,0.3)',
  },
} as const;

// Consistent field label/text colors to avoid theme conflicts
const inputLabelSx = { color: '#000', '&.Mui-focused': { color: '#000' } };
const inputTextSx = { color: '#000' };

// Flex row for the two top dropdowns (no Grid). It wraps on small screens.
const topRowSx = {
  display: 'flex',
  gap: 2,
  mb: 1,
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'space-between',
};

// Widths for left/right dropdowns; responsive and balanced
const leftControlSx = { flex: '1 1 240px', minWidth: 220, maxWidth: 360 };
const rightControlSx = { flex: '1 1 240px', minWidth: 220, maxWidth: 360 };

// ============================== L43: Component start ==============================
const PopUp: React.FC<PopUpProps> = ({ linkTracking, navButton }) => {
  // ============================== L44–52: State ==============================
  const [subject, setSubject] = useState('');                      // Subject input
  const [submitting, setSubmitting] = useState(false);             // Submit in-flight flag
  const [description, setDescription] = useState('');              // Description input
  const [files, setFiles] = useState<File[]>([]);                  // Uploaded file (single)
  const [errorMessage, setErrorMessage] = useState('');            // Validation/network error
  const [submitted, setSubmitted] = useState(false);               // Success state
  const contentRef = useRef<HTMLDivElement | null>(null);          // Body ref (optional)
  const [open, setOpen] = useState(false);                         // Dialog open/close

  // New: dropdown states
  const [selectedModule, setSelectedModule] = useState<string>('Chat'); // "Module:" dropdown state
  const [requestType, setRequestType] = useState<string>('Info');       // "Type:" dropdown state

  // ============================== L54–61: Close dialog & reset ==============================
  function onClose() {
    setOpen(false);             // Close modal
    setSubmitted(false);        // Reset success
    setDescription('');         // Clear description
    setSubject('');             // Clear subject
    setFiles([]);               // Clear file
    setRequestType('Info');     // Reset type to Info
    setSelectedModule('Chat');  // Reset module to Chat
    setErrorMessage('');        // Clear errors
  }

  // ============================== L63–69: File choose (single file) ==============================
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFiles([event.target.files[0]]); // Only one file allowed
    }
  };

  // ============================== L71–73: Remove file ==============================
  const handleRemoveFile = (fileName: string) => {
    setFiles(files.filter((file) => file.name !== fileName)); // Remove by name
  };

  // ============================== L75–108: Submit ==============================
  const handleSubmit = async () => {
    // Basic required fields validation
    if (!subject.trim() || !description.trim()) {
      setErrorMessage('Please fill Subject and Description fields before submitting the feedback.');
      return;
    }

    setSubmitting(true); // Disable actions while posting

    // Creating formData object for file uploads and fields
    const formData = new FormData();
    formData.append('subject', subject);
    formData.append('desc', description);
    formData.append('module', selectedModule); // Include module in payload
    formData.append('requestType', requestType); // Include request type in payload

    // Append file (optional)
    files.forEach((file) => {
      formData.append('file', file);
    });

    try {
      const response = await saveData('/auth/feedbacks/post', formData); // Post to API
      // If your saveData returns Response, you can enforce ok check:
      // if (!response.ok) throw new Error('Failed to submit feedback!');
      setSubmitted(true); // Show success state
    } catch (error) {
      setErrorMessage('Submission failed. Please try again.'); // Network/other failure
    } finally {
      setSubmitting(false); // Allow retry if failed
    }
  };

  // ============================== L110–116: Menu anchor ==============================
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null); // Menu anchor
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget); // Open menu anchored to button
  };
  const handleClose = () => {
    setAnchorEl(null); // Close menu
  };

  // New: support redirect for "Request/report a bug"
  const handleSupport = () => {
    const url = 'https://support.example.com'; // Dummy support URL
    window.open(url, '_blank', 'noopener,noreferrer'); // Open in new tab
  };

  // ============================== L118–315: Render ==============================
  return (
    <>
      {/* Header button that opens the menu */}
      <Button
        sx={{ ...navButton, color: '#525252' }}
        id="feedback"
        onClick={(event) => {
          handleClick(event); // Open menu
          linkTracking('global.header/navigation/feedback', 'external'); // Analytics
        }}
      >
        Feedback
      </Button>

      {/* Menu with two options: external "Rate us" and in-app "Share feedback" */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem
          onClick={() => {
            const url =
              'https://resources.digital-cloud-west.medallia.com/direct/form.html?region=digital-cloud-west&...';
            window.open(url, '_blank', 'noopener,noreferrer'); // External form
            handleClose();
          }}
        >
          Rate us
        </MenuItem>

        <MenuItem
          onClick={() => {
            setOpen(true);  // Open dialog
            handleClose();  // Close menu
          }}
        >
          Share feedback
        </MenuItem>
      </Menu>

      {/* Main dialog container */}
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        sx={{ borderRadius: '16px', overflow: 'hidden' }} // Curved edges
      >
        {submitted ? (
          // ============================== L150–168: Success message after submission ==============================
          <>
            <DialogContent ref={contentRef} sx={{ borderRadius: '16px', overflow: 'hidden' }}>
              <Typography variant="h6" textAlign="center">Thank you for Sharing Feedback</Typography>
            </DialogContent>

            <DialogActions
              sx={{
                borderRadius: '16px',
                paddingBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                alignItems: 'center',
              }}
            >
              <Button sx={buttonStyles} onClick={onClose}>Exit</Button>
            </DialogActions>
          </>
        ) : (
          // ============================== L170–310: Form content ==============================
          <>
            {/* Title with close button */}
            <DialogTitle
              sx={{
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              Submit Feedback
              <IconButton onClick={onClose} style={{ position: 'absolute', right: 8, top: 8 }}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            {/* Error Message */}
            {errorMessage && (
              <Typography color="red" textAlign="center">{errorMessage}</Typography>
            )}

            <DialogContent ref={contentRef}>
              {/* ============================== Top row: two dropdowns (Module left, Type right) ============================== */}
              <Box sx={topRowSx}>
                {/* Module dropdown */}
                <FormControl variant="outlined" size="small" sx={leftControlSx}>
                  <InputLabel id="module-label" sx={inputLabelSx} shrink>
                    Module:
                  </InputLabel>
                  <Select
                    labelId="module-label"
                    id="module-select"
                    value={selectedModule}
                    label="Module:"
                    onChange={(e) => setSelectedModule(String(e.target.value))}
                    sx={inputTextSx}
                  >
                    <MenuItem value="Chat">Chat</MenuItem>
                    <MenuItem value="X">X</MenuItem>
                    <MenuItem value="Y">Y</MenuItem>
                    <MenuItem value="GenAI">GenAI</MenuItem>
                    <MenuItem value="Flow">Flow</MenuItem>
                    <MenuItem value="Author">Author</MenuItem>
                  </Select>
                </FormControl>

                {/* Type dropdown */}
                <FormControl variant="outlined" size="small" sx={rightControlSx}>
                  <InputLabel id="type-label" sx={inputLabelSx} shrink>
                    Type:
                  </InputLabel>
                  <Select
                    labelId="type-label"
                    id="type-select"
                    value={requestType}
                    label="Type:"
                    onChange={(e) => setRequestType(String(e.target.value))}
                    sx={inputTextSx}
                  >
                    <MenuItem value="Info">Info</MenuItem>
                    <MenuItem value="Request/report a bug">Request/report a bug</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* ============================== Main form fields (hidden in bug flow) ============================== */}
              {requestType !== 'Request/report a bug' && (
                <>
                  {/* Subject Input */}
                  <TextField
                    label="Subject"
                    fullWidth
                    variant="outlined"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    margin="dense"
                    sx={{ '& fieldset': { borderRadius: '14px' } }}
                    InputProps={{ sx: inputTextSx }}
                    InputLabelProps={{ shrink: true, sx: inputLabelSx }}
                  />

                  {/* Keep your existing custom DropdownComponent below Subject */}
                  <DropdownComponent />

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
                    sx={{ '& fieldset': { borderRadius: '14px' } }}
                    InputProps={{ sx: inputTextSx }}
                    InputLabelProps={{ shrink: true, sx: inputLabelSx }}
                  />

                  {/* File Upload Section */}
                  <Typography variant="body1" mt={2}>Upload:</Typography>

                  {/* Box enclosing Choose File button and file list */}
                  <Box mt={1} p={2} border="1px solid #ccc" borderRadius="16px">
                    <Button sx={buttonStyles} component="label" disabled={files.length >= 1}>
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
                            <Button color="error" size="small" onClick={() => handleRemoveFile(file.name)}>
                              Remove
                            </Button>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </>
              )}
            </DialogContent>

            {/* ============================== Footer actions ============================== */}
            <DialogActions
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                alignItems: 'center',
              }}
            >
              {/* In bug flow: only show Get Support */}
              {requestType === 'Request/report a bug' ? (
                <Button
                  sx={{ ...buttonStyles, color: '#007BFF' }}
                  onClick={handleSupport}
                  variant="contained"
                >
                  Get Support
                </Button>
              ) : (
                // Otherwise: normal Submit
                <Button
                  sx={{ ...buttonStyles, color: '#007BFF' }}
                  onClick={handleSubmit}
                  variant="contained"
                  disabled={submitting || !subject.trim() || !description.trim()}
                >
                  Submit
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default PopUp;
