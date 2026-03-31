import PropTypes from "prop-types";
import { useEffect, useRef, useState, useCallback } from "react";
import { Box, IconButton, Typography, CircularProgress, Chip } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import {
  Room,
  RoomEvent,
  VideoPresets,
  Track,
  createLocalTracks,
} from "livekit-client";
import api from "../../services/api";

// Component for each remote participant's video
const ParticipantVideo = ({ participant, isLarge }) => {
  const videoRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (!participant) return;

    const handleTrackSubscribed = (track) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHasVideo(true);
      }
      if (track.kind === Track.Kind.Audio) {
        track.attach();
      }
    };

    const handleTrackUnsubscribed = (track) => {
      if (track.kind === Track.Kind.Video) {
        track.detach();
        setHasVideo(false);
      }
    };

    // Handle existing tracks
    participant.trackPublications.forEach((publication) => {
      if (publication.track) {
        handleTrackSubscribed(publication.track);
      }
    });

    // Listen for new tracks
    participant.on("trackSubscribed", handleTrackSubscribed);
    participant.on("trackUnsubscribed", handleTrackUnsubscribed);

    return () => {
      participant.off("trackSubscribed", handleTrackSubscribed);
      participant.off("trackUnsubscribed", handleTrackUnsubscribed);
    };
  }, [participant]);

  // Get display name from identity
  const getDisplayName = () => {
    const identity = participant?.identity || "";
    if (identity.startsWith("customer")) return "Customer";
    if (identity.startsWith("manager")) return "Manager";
    if (identity.startsWith("supervisor")) return "Supervisor";
    return identity.split("-")[0] || "Participant";
  };

  return (
    <Box
      sx={{
        position: "relative",
        width: isLarge ? "100%" : "48%",
        height: isLarge ? "100%" : "180px",
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "#000",
        border: "2px solid #444",
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: hasVideo ? "block" : "none",
        }}
      />
      {!hasVideo && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#333",
          }}
        >
          <Typography variant="body2" color="white">
            {getDisplayName()}
          </Typography>
        </Box>
      )}
      <Chip
        label={getDisplayName()}
        size="small"
        sx={{
          position: "absolute",
          bottom: 8,
          left: 8,
          bgcolor: "rgba(0,0,0,0.6)",
          color: "white",
          fontSize: 11,
        }}
      />
    </Box>
  );
};

const OpenViduMeetComponent = ({
  roomName,
  displayName = "Supervisor",
  onLeave,
  showInHalfScreen = true,
  mode = "listen", // listen, whisper, barge, takeover
}) => {
  const localVideoRef = useRef(null);
  const roomRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(mode === "listen");
  const [isVideoMuted, setIsVideoMuted] = useState(mode === "listen" || mode === "whisper");
  const [error, setError] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);

  // Get token from backend
  const getToken = useCallback(async () => {
    try {
      const response = await api.post("/openvidu/token", {
        roomName,
        participantName: displayName,
        participantIdentity: `supervisor-${Date.now()}`,
      });

      if (response.data?.success && response.data?.data?.token) {
        return response.data.data;
      }
      throw new Error("Failed to get token from server");
    } catch (err) {
      console.error("Error getting token:", err);
      throw err;
    }
  }, [roomName, displayName]);

  // Connect to room
  useEffect(() => {
    let mounted = true;

    const connectToRoom = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        const tokenData = await getToken();
        const { token, serverUrl } = tokenData;

        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h720.resolution,
          },
        });

        roomRef.current = room;

        // Handle participant events
        room.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log("Participant connected:", participant.identity);
          if (mounted) {
            setRemoteParticipants((prev) => [...prev, participant]);
          }
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          console.log("Participant disconnected:", participant.identity);
          if (mounted) {
            setRemoteParticipants((prev) =>
              prev.filter((p) => p.identity !== participant.identity)
            );
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          console.log("Disconnected from room");
          if (mounted) {
            setIsConnected(false);
            setRemoteParticipants([]);
          }
        });

        // Connect to the room
        await room.connect(serverUrl, token);
        console.log("Connected to room:", room.name);

        if (!mounted) return;

        // Get existing participants
        const existingParticipants = Array.from(room.remoteParticipants.values());
        setRemoteParticipants(existingParticipants);

        // Create and publish local tracks based on mode
        const shouldPublishAudio = mode !== "listen";
        const shouldPublishVideo = mode === "barge" || mode === "takeover";

        if (shouldPublishAudio || shouldPublishVideo) {
          const tracks = await createLocalTracks({
            audio: shouldPublishAudio,
            video: shouldPublishVideo,
          });

          for (const track of tracks) {
            await room.localParticipant.publishTrack(track);
            if (track.kind === Track.Kind.Video && localVideoRef.current) {
              track.attach(localVideoRef.current);
            }
          }
        }

        setIsConnected(true);
        setIsConnecting(false);
      } catch (err) {
        console.error("Error connecting to room:", err);
        if (mounted) {
          setError(err.message || "Failed to connect to video call");
          setIsConnecting(false);
        }
      }
    };

    if (roomName) {
      connectToRoom();
    }

    return () => {
      mounted = false;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, [roomName, mode, getToken]);

  const toggleAudio = async () => {
    if (!roomRef.current) return;
    const localParticipant = roomRef.current.localParticipant;
    const enabled = localParticipant.isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(!enabled);
    setIsAudioMuted(enabled);
  };

  const toggleVideo = async () => {
    if (!roomRef.current) return;
    const localParticipant = roomRef.current.localParticipant;
    const enabled = localParticipant.isCameraEnabled;
    await localParticipant.setCameraEnabled(!enabled);
    setIsVideoMuted(enabled);
  };

  const leaveCall = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (onLeave) onLeave();
  };

  const getModeLabel = () => {
    switch (mode) {
      case "listen": return "Listening Mode";
      case "whisper": return "Whisper Mode";
      case "barge": return "Barge-In Mode";
      case "takeover": return "Takeover Mode";
      default: return "Monitoring";
    }
  };

  const getModeColor = () => {
    switch (mode) {
      case "listen": return "#2196f3";
      case "whisper": return "#ff9800";
      case "barge": return "#f44336";
      case "takeover": return "#9c27b0";
      default: return "#2196f3";
    }
  };

  return (
    <Box
      sx={{
        position: showInHalfScreen ? "relative" : "fixed",
        top: showInHalfScreen ? "auto" : 0,
        left: showInHalfScreen ? "auto" : 0,
        width: showInHalfScreen ? "100%" : "100vw",
        height: showInHalfScreen ? "450px" : "100vh",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: showInHalfScreen ? 2 : 0,
        boxShadow: showInHalfScreen ? 3 : "none",
        backgroundColor: "#1e3a5f",
      }}
    >
      {/* Mode indicator */}
      <Box
        sx={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 1003,
          bgcolor: getModeColor(),
          color: "white",
          px: 2,
          py: 0.5,
          borderRadius: 2,
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {getModeLabel()} ({remoteParticipants.length + 1} participants)
      </Box>

      {/* Video container */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          p: 1,
          pt: 5,
        }}
      >
        {/* Remote participants grid */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {remoteParticipants.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
              }}
            >
              <Typography variant="h6">Waiting for participants...</Typography>
            </Box>
          ) : remoteParticipants.length === 1 ? (
            // Single participant - show large
            <ParticipantVideo
              participant={remoteParticipants[0]}
              isLarge={true}
            />
          ) : (
            // Multiple participants - show in grid
            remoteParticipants.map((participant) => (
              <ParticipantVideo
                key={participant.identity}
                participant={participant}
                isLarge={false}
              />
            ))
          )}
        </Box>

        {/* Local video (supervisor) - show in barge/takeover mode */}
        {(mode === "barge" || mode === "takeover") && (
          <Box
            sx={{
              position: "absolute",
              bottom: 70,
              right: 16,
              width: 140,
              height: 105,
              borderRadius: 2,
              overflow: "hidden",
              border: "3px solid #9c27b0",
              backgroundColor: "#000",
              zIndex: 1002,
            }}
          >
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
            <Chip
              label="You (Supervisor)"
              size="small"
              sx={{
                position: "absolute",
                bottom: 4,
                left: 4,
                bgcolor: "rgba(156, 39, 176, 0.8)",
                color: "white",
                fontSize: 10,
              }}
            />
          </Box>
        )}
      </Box>

      {/* Controls */}
      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          justifyContent: "center",
          gap: 2,
          zIndex: 1001,
          backgroundColor: "rgba(0,0,0,0.5)",
          borderRadius: 8,
          padding: "8px 16px",
        }}
      >
        {mode !== "listen" && (
          <IconButton
            onClick={toggleAudio}
            sx={{
              bgcolor: isAudioMuted ? "error.main" : "success.main",
              color: "white",
              "&:hover": {
                bgcolor: isAudioMuted ? "error.dark" : "success.dark",
              },
              width: 44,
              height: 44,
            }}
          >
            {isAudioMuted ? <MicOffIcon /> : <MicIcon />}
          </IconButton>
        )}

        {(mode === "barge" || mode === "takeover") && (
          <IconButton
            onClick={toggleVideo}
            sx={{
              bgcolor: isVideoMuted ? "error.main" : "success.main",
              color: "white",
              "&:hover": {
                bgcolor: isVideoMuted ? "error.dark" : "success.dark",
              },
              width: 44,
              height: 44,
            }}
          >
            {isVideoMuted ? <VideocamOffIcon /> : <VideocamIcon />}
          </IconButton>
        )}

        <IconButton
          onClick={leaveCall}
          sx={{
            bgcolor: "error.main",
            color: "white",
            "&:hover": { bgcolor: "error.dark" },
            width: 44,
            height: 44,
          }}
        >
          <CallEndIcon />
        </IconButton>
      </Box>

      {/* Loading overlay */}
      {isConnecting && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.7)",
            color: "white",
            zIndex: 1002,
          }}
        >
          <CircularProgress color="inherit" sx={{ mb: 2 }} />
          <Typography variant="h6">
            Joining call in {getModeLabel()}...
          </Typography>
        </Box>
      )}

      {/* Error overlay */}
      {error && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(0,0,0,0.8)",
            color: "white",
            zIndex: 1002,
          }}
        >
          <Typography variant="h6" color="error" sx={{ mb: 2 }}>
            Connection Error
          </Typography>
          <Typography variant="body1" sx={{ mb: 2, textAlign: "center", px: 2 }}>
            {error}
          </Typography>
          <IconButton
            onClick={leaveCall}
            sx={{
              bgcolor: "error.main",
              color: "white",
              "&:hover": { bgcolor: "error.dark" },
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

OpenViduMeetComponent.propTypes = {
  roomName: PropTypes.string.isRequired,
  displayName: PropTypes.string,
  onLeave: PropTypes.func,
  showInHalfScreen: PropTypes.bool,
  mode: PropTypes.oneOf(["listen", "whisper", "barge", "takeover"]),
};

export default OpenViduMeetComponent;
