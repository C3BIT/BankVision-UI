import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Box, Modal, Typography, Button } from "@mui/material";
import { PhoneOff, Phone, X as CloseIcon, Rocket } from "lucide-react";

const CallingScreen = ({ open, callTarget, onAccept, onReject, onClose }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const pulseAnimation = true;

  useEffect(() => {
    const audioElement = audioRef.current;

    if (open && audioElement && !isPlaying) {
      const playAudio = async () => {
        try {
          await audioElement.play();
          setIsPlaying(true);
        } catch (err) {
          console.error("Audio play failed:", err);
        }
      };

      playAudio();
    }

    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setIsPlaying(false);
      }
    };
  }, [open, isPlaying]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleAccept = () => {
    stopAudio();
    onAccept();
    onClose();
  };

  const handleReject = () => {
    stopAudio();
    onReject();
    onClose();
  };

  return (
    <Modal
      open={open}
      disableEscapeKeyDown
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Box
        sx={{
          width: { xs: "90%", sm: "360px" },
          bgcolor: "#121212",
          color: "white",
          borderRadius: 4,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <audio
          ref={audioRef}
          src={import.meta.env.VITE_RINGTONE_URL || "https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3"}
          loop
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 3,
            pb: 2,
            pt: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Rocket size={18} color="#4caf50" />
            <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
              Customer support
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                bgcolor: "rgba(255,255,255,0.05)",
                px: 1.5,
                py: 0.5,
                borderRadius: 3,
                fontSize: "0.65rem",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.7)" }}
              >
                Incoming call
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 0.5,
                borderRadius: "50%",
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
              onClick={handleReject}
            >
              <CloseIcon size={16} color="rgba(255,255,255,0.7)" />
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 4,
            pb: 3,
          }}
        >
          <Box
            sx={{
              position: "relative",
              mb: 3,
              "&::after": pulseAnimation
                ? {
                  content: '""',
                  position: "absolute",
                  top: -8,
                  left: -8,
                  right: -8,
                  bottom: -8,
                  borderRadius: "50%",
                  border: "2px solid #4caf50",
                  animation: "pulse 1.5s infinite",
                  opacity: 0.7,
                  zIndex: 0,
                }
                : {},
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: "50%",
                overflow: "hidden",
                border: "3px solid rgba(255,255,255,0.1)",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                zIndex: 1,
              }}
            >
              {callTarget?.image ? (
                <img
                  src={callTarget.image}
                  alt={callTarget.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Box
                  sx={{
                    width: "100%",
                    height: "100%",
                    bgcolor: "#333",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: "bold",
                    color: "white",
                  }}
                >
                  {callTarget?.name?.[0] || "?"}
                </Box>
              )}
            </Box>
          </Box>

          <Typography
            variant="h5"
            sx={{ fontWeight: 600, mb: 0.5, fontSize: "1.5rem" }}
          >
            {callTarget?.name || "Unknown Caller"}
          </Typography>

          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.7)", mb: 3, fontSize: "0.9rem" }}
          >
            is calling Customer support
          </Typography>

          <Box
            sx={{
              mb: 3,
              animation: "ringing 0.8s ease-in-out infinite",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              opacity: 0.7,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22 16.92V19.92C22 20.4704 21.7893 20.9978 21.4142 21.3728C21.0391 21.7479 20.5117 21.9586 19.96 21.96C18.5 22.05 17.05 21.94 15.66 21.65C14.3267 21.3737 13.0416 20.9053 11.85 20.26C10.6016 19.5771 9.45005 18.7418 8.42 17.77C7.44972 16.7421 6.61477 15.5918 5.93 14.35C5.28454 13.1561 4.81588 11.8684 4.54 10.53C4.25 9.15 4.14 7.7 4.23 6.24C4.23152 5.69154 4.4399 5.16718 4.81239 4.79268C5.18488 4.41819 5.70764 4.20702 6.256 4.2H9.256C10.2074 4.19196 11.0524 4.83481 11.26 5.76C11.3822 6.37366 11.5581 6.97469 11.786 7.55C12.0383 8.27507 11.9844 9.08468 11.638 9.76L10.756 11.53C11.5754 12.9045 12.6316 14.121 13.874 15.11C14.6106 14.5284 15.347 13.9469 16.0834 13.3653C16.7574 13.0198 17.5658 12.9654 18.2893 13.2144C18.8651 13.4397 19.4662 13.6129 20.0803 13.7326C21.0055 13.9355 21.662 14.7772 21.66 15.73V16.92H22Z"
                stroke="#adb5bd"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            px: 3,
            pb: 3,
            gap: 2,
          }}
        >
          <Button
            variant="contained"
            startIcon={<PhoneOff size={18} />}
            sx={{
              bgcolor: "#e63946",
              "&:hover": { bgcolor: "#d32f2f" },
              color: "white",
              py: 1.5,
              borderRadius: 6,
              flex: 1,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(230, 57, 70, 0.3)",
            }}
            onClick={handleReject}
          >
            Decline
          </Button>

          <Button
            variant="contained"
            startIcon={<Phone size={18} />}
            sx={{
              bgcolor: "#4caf50",
              "&:hover": { bgcolor: "#388e3c" },
              color: "white",
              py: 1.5,
              borderRadius: 6,
              flex: 1,
              textTransform: "none",
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(76, 175, 80, 0.3)",
            }}
            onClick={handleAccept}
          >
            Accept
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

CallingScreen.propTypes = {
  open: PropTypes.bool.isRequired,
  callTarget: PropTypes.shape({
    name: PropTypes.string,
    image: PropTypes.string,
  }),
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CallingScreen;
