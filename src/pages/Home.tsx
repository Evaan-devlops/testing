import React, { useState } from "react";
import { Box, Button, Container } from "@mui/material";
import UploadMenu from "../components/UploadMenu";
import DrawerDocument from "../components/DrawerDocument";
import PopUp from "./PopUp"; // Import Popup Component
import FeedbackActivity from "../components/FeedbackActivity";

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
const Home: React.FC = () => {
  const [isopen, setIsOpen] = useState(false); // Controls drawer visibility
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    
    <Container style={{ textAlign: "center", marginTop: "20vh" }}>
      {/* UploadMenu Component with renamed prop */}
      <UploadMenu handleAdvClick={() => setIsOpen(true)} />

      {/* Drawer Component */}
      <DrawerDocument isopen={isopen} onClose={() => setIsOpen(false)} />

        {/* Button to trigger Popup */}
      <Button sx={buttonStyles} onClick={() => setOpen(true)}>
        Pop
      </Button>
      
      {/* Render Popup when open */}
      {open && <PopUp open={open} onClose={() => setOpen(false)} />}
        
        <Box>
       <div style={{ border: "1px solid #ccc", padding: "10px", width: "400px" }}>
      <h2 
        style={{ cursor: "pointer", userSelect: "none" }} 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        Feedbacks {isExpanded ? "▲" : "▼"}
      </h2>
      {isExpanded && <FeedbackActivity />}
    </div>
    </Box>
    </Container>
    
  );
};

export default Home;
