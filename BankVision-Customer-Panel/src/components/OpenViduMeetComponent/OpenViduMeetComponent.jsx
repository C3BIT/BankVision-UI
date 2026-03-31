/* eslint-disable react-hooks/exhaustive-deps */
import PropTypes from "prop-types";
import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Box, Typography, CircularProgress, Chip, IconButton } from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import {
  Room,
  RoomEvent,
  VideoPresets,
  Track,
  createLocalTracks,
} from "livekit-client";
import { useWebSocket } from "../../context/WebSocketContext";
import { publicPost } from "../../services/apiCaller";

// Component for each remote participant's video
const ParticipantVideo = ({ participant, isLarge }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (!participant) return;

    const handleTrackSubscribed = (track) => {
      console.log(`🔊 Track subscribed:`, track.kind, 'from', participant.identity);

      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHasVideo(true);

        // Force objectFit after attachment with !important
        const videoElement = videoRef.current;
        videoElement.style.setProperty('object-fit', 'contain', 'important');
        videoElement.style.setProperty('object-position', 'center', 'important');
        videoElement.style.setProperty('width', '100%', 'important');
        videoElement.style.setProperty('height', '100%', 'important');
        videoElement.style.setProperty('max-width', '100%', 'important');
        videoElement.style.setProperty('max-height', '100%', 'important');

        console.log('✅ Video track attached to element with objectFit: contain !important');
      }

      if (track.kind === Track.Kind.Audio) {
        // Create audio element if not exists
        if (!audioRef.current) {
          audioRef.current = document.createElement('audio');
          audioRef.current.autoplay = true;
          audioRef.current.playsInline = true;
        }
        track.attach(audioRef.current);
        console.log('✅ Audio track attached to element');
      }
    };

    const handleTrackUnsubscribed = (track) => {
      console.log(`🔇 Track unsubscribed:`, track.kind, 'from', participant.identity);

      if (track.kind === Track.Kind.Video) {
        track.detach();
        setHasVideo(false);
      }

      if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.detach();
      }
    };

    // Handle existing tracks
    participant.trackPublications.forEach((publication) => {
      if (publication.track && publication.isSubscribed) {
        console.log('📦 Processing existing track:', publication.track.kind);
        handleTrackSubscribed(publication.track);
      }
    });

    // Listen for new tracks
    participant.on("trackSubscribed", handleTrackSubscribed);
    participant.on("trackUnsubscribed", handleTrackUnsubscribed);

    return () => {
      participant.off("trackSubscribed", handleTrackUnsubscribed);
      participant.off("trackUnsubscribed", handleTrackUnsubscribed);

      // Cleanup audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
        audioRef.current = null;
      }
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
        height: isLarge ? "100%" : "45%",
        minHeight: isLarge ? "auto" : "200px",
        borderRadius: 2,
        overflow: "hidden",
        backgroundColor: "#1a1a1a",
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
          objectFit: "contain",
          objectPosition: "center",
          display: hasVideo ? "block" : "none",
          backgroundColor: "#1a1a1a",
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
          <Typography variant="body1" color="white">
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

const OpenViduMeetComponent = forwardRef(({
  roomName,
  displayName = "Customer",
  onLeave,
  onAudioToggle,
  onVideoToggle,
  showInHalfScreen = true,
  isIncoming = false,
}, ref) => {
  const localVideoRef = useRef(null);
  const roomRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [error, setError] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const { socket } = useWebSocket();

  // Get token from backend
  const getToken = useCallback(async () => {
    try {
      const response = await publicPost("/openvidu/token", {
        roomName,
        participantName: displayName,
        participantIdentity: `customer-${Date.now()}`,
      });

      if (response?.success && response?.data?.token) {
        return response.data;
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
        console.log(`📋 Found ${existingParticipants.length} existing remote participants:`, existingParticipants.map(p => p.identity));
        console.log(`👤 Local participant identity: ${room.localParticipant.identity}`);
        setRemoteParticipants(existingParticipants);

        // Create and publish local tracks - START WITH NO CONSTRAINTS
        let tracks = [];
        try {
          // FIRST: Try with NO constraints to get camera's native resolution
          console.log('🎥 Attempting to get video with NO constraints (native camera resolution)...');
          tracks = await createLocalTracks({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: true, // NO constraints - use camera native resolution
          });
          console.log('✅ Created video with native camera resolution (no constraints)');
        } catch (nativeError) {
          console.warn("⚠️ Could not get video with no constraints, trying with explicit constraints:", nativeError.message);
          try {
            // Fallback: try with explicit high-res constraints
            tracks = await createLocalTracks({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: {
                facingMode: 'user',
                width: { min: 640, ideal: 1280, max: 4096 },
                height: { min: 480, ideal: 1920, max: 4096 },
              },
            });
            console.log('✅ Created video with explicit constraints');
          } catch (fallbackError) {
            console.warn("⚠️ Could not get video device, trying audio only:", fallbackError.message);
            try {
              // Final fallback to audio only
              tracks = await createLocalTracks({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
                video: false,
              });
              console.log('✅ Created audio-only track');
            } catch (audioError) {
              console.error("❌ Could not get any media devices:", audioError.message);
              setError("Could not access microphone or camera. Please check permissions.");
              // Continue without local media - can still receive remote streams
            }
          }
        }

        for (const track of tracks) {
          try {
            // Log actual video track settings BEFORE publishing
            if (track.kind === Track.Kind.Video) {
              const settings = track.mediaStreamTrack.getSettings();
              console.log('📹 ACTUAL video track settings from camera:', {
                width: settings.width,
                height: settings.height,
                aspectRatio: settings.aspectRatio,
                facingMode: settings.facingMode,
                deviceId: settings.deviceId
              });
            }

            await room.localParticipant.publishTrack(track, {
              name: track.kind === Track.Kind.Audio ? 'microphone' : 'camera',
              simulcast: track.kind === Track.Kind.Video,
            });
            console.log(`✅ Published ${track.kind} track`);

            if (track.kind === Track.Kind.Video && localVideoRef.current) {
              track.attach(localVideoRef.current);
            }
          } catch (publishError) {
            console.error(`❌ Failed to publish ${track.kind} track:`, publishError);
          }
        }

        // Sync UI state with actual track state after publishing
        const audioEnabled = room.localParticipant.isMicrophoneEnabled;
        const videoEnabled = room.localParticipant.isCameraEnabled;

        setIsAudioMuted(!audioEnabled);
        setIsVideoMuted(!videoEnabled);

        // Notify parent component of initial media states
        if (onAudioToggle) {
          onAudioToggle(audioEnabled);
        }
        if (onVideoToggle) {
          onVideoToggle(videoEnabled);
        }

        console.log(`🎬 Initial track state - Audio: ${audioEnabled ? 'ON' : 'OFF'}, Video: ${videoEnabled ? 'ON' : 'OFF'}`);

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
  }, [roomName, getToken]);

  // Handle socket events (manager ended call)
  useEffect(() => {
    if (!socket) return;

    const handleManagerEndedCall = () => {
      leaveCall();
    };

    socket.on("doctor:ended_call", handleManagerEndedCall);
    socket.on("manager:ended_call", handleManagerEndedCall);

    return () => {
      socket.off("doctor:ended_call", handleManagerEndedCall);
      socket.off("manager:ended_call", handleManagerEndedCall);
    };
  }, [socket]);

  const toggleAudio = async () => {
    if (!roomRef.current) return;
    try {
      const localParticipant = roomRef.current.localParticipant;
      const wasEnabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!wasEnabled);
      // Previous enabled state = new muted state
      setIsAudioMuted(wasEnabled);
      if (onAudioToggle) onAudioToggle(!wasEnabled);
      console.log(`🎤 Audio ${wasEnabled ? 'muted' : 'unmuted'}`);
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  };

  const toggleVideo = async () => {
    if (!roomRef.current) return;
    try {
      const localParticipant = roomRef.current.localParticipant;
      const wasEnabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!wasEnabled);
      // Previous enabled state = new muted state
      setIsVideoMuted(wasEnabled);
      if (onVideoToggle) onVideoToggle(!wasEnabled);
      console.log(`📹 Video ${wasEnabled ? 'off' : 'on'}`);
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  };

  const leaveCall = () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (onLeave) onLeave();
  };

  // Expose control methods and remote participants to parent via ref
  useImperativeHandle(ref, () => ({
    toggleAudio,
    toggleVideo,
    leaveCall,
    isAudioMuted,
    isVideoMuted,
    remoteParticipants,
  }));

  // Debug logging
  console.log(`🎥 Rendering video layout - Remote participants: ${remoteParticipants.length}`, remoteParticipants.map(p => p.identity));

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#000000",
      }}
    >
      {/* Main video area - Remote participants (Manager) fills the screen */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
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
            <Typography variant="h6">Waiting for manager to join...</Typography>
          </Box>
        ) : remoteParticipants.length === 1 ? (
          <ParticipantVideo
            participant={remoteParticipants[0]}
            isLarge={true}
          />
        ) : (
          remoteParticipants.map((participant) => (
            <ParticipantVideo
              key={participant.identity}
              participant={participant}
              isLarge={false}
            />
          ))
        )}
      </Box>

      {/* Local video (customer's own camera) - Picture-in-Picture */}
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 16,
          width: 150,
          height: 120,
          borderRadius: 2,
          overflow: "hidden",
          border: "3px solid #4caf50",
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
          label="You"
          size="small"
          sx={{
            position: "absolute",
            bottom: 4,
            left: 4,
            bgcolor: "rgba(76, 175, 80, 0.8)",
            color: "white",
            fontSize: 10,
          }}
        />
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
            {isIncoming ? "Connecting to call..." : "Joining video call..."}
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
});

OpenViduMeetComponent.displayName = 'OpenViduMeetComponent';

OpenViduMeetComponent.propTypes = {
  roomName: PropTypes.string.isRequired,
  displayName: PropTypes.string,
  onLeave: PropTypes.func,
  onAudioToggle: PropTypes.func,
  onVideoToggle: PropTypes.func,
  showInHalfScreen: PropTypes.bool,
  isIncoming: PropTypes.bool,
};

export default OpenViduMeetComponent;
