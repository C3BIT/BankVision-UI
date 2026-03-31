/* eslint-disable react-hooks/exhaustive-deps */
import PropTypes from "prop-types";
import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
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
import { useWebSocket } from "../../providers/WebSocketProvider";
import { publicPost } from "../../services/apiCaller";

// Component for each remote participant's video
const ParticipantVideo = ({ participant, isLarge, onVideoElementReady, speakerMuted }) => {
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

        console.log('📹 Video track attached to element:', {
          participant: participant.identity,
          videoWidth: videoRef.current.videoWidth,
          videoHeight: videoRef.current.videoHeight
        });

        // Wait for video to be ready before notifying
        const handleLoadedMetadata = () => {
          console.log('📹 Video metadata loaded:', {
            participant: participant.identity,
            videoWidth: videoRef.current.videoWidth,
            videoHeight: videoRef.current.videoHeight
          });
          
          // Notify parent if this is customer video
          if (onVideoElementReady && participant.identity.startsWith('customer')) {
            console.log('✅ Notifying parent of customer video element');
            onVideoElementReady(videoRef.current);
          }
          
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        };

        if (videoRef.current.readyState >= 2) {
          // Video already has metadata
          handleLoadedMetadata();
        } else {
          videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        }

        // Force objectFit after attachment with multiple methods
        const videoElement = videoRef.current;

        // Remove ALL existing styles first to ensure clean slate
        videoElement.removeAttribute('style');

        // Apply styles to maintain aspect ratio with full height visible
        videoElement.style.setProperty('position', 'absolute', 'important');
        videoElement.style.setProperty('top', '50%', 'important');
        videoElement.style.setProperty('left', '50%', 'important');
        videoElement.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
        videoElement.style.setProperty('max-width', '100%', 'important');
        videoElement.style.setProperty('max-height', '100%', 'important');
        videoElement.style.setProperty('width', 'auto', 'important');
        videoElement.style.setProperty('height', '100%', 'important'); // Always use full height
        videoElement.style.setProperty('object-fit', 'contain', 'important');
        videoElement.style.setProperty('object-position', 'center', 'important');
        videoElement.style.setProperty('background-color', '#1a1a1a', 'important');
        videoElement.style.setProperty('display', 'block', 'important');

        // Log video dimensions when loaded
        videoElement.addEventListener('loadedmetadata', () => {
          const computed = window.getComputedStyle(videoElement);
          console.log(`📐 Video source dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);
          console.log(`📐 Video aspect ratio: ${(videoElement.videoWidth / videoElement.videoHeight).toFixed(2)}`);
          console.log(`📺 Video element display size: ${videoElement.clientWidth}x${videoElement.clientHeight}`);
          console.log(`🎨 Computed objectFit: ${computed.objectFit}`);
          console.log(`📏 Computed objectPosition: ${computed.objectPosition}`);

          // Check if video is being cropped
          const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
          const containerAspect = videoElement.clientWidth / videoElement.clientHeight;
          if (videoAspect < containerAspect) {
            console.log(`✅ Portrait video in landscape container - should see FULL HEIGHT with side pillarboxing`);
          } else {
            console.log(`✅ Video wider than container - should see FULL WIDTH with top/bottom letterboxing`);
          }
        });

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
      participant.off("trackSubscribed", handleTrackSubscribed);
      participant.off("trackUnsubscribed", handleTrackUnsubscribed);

      // Cleanup audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.srcObject = null;
        audioRef.current = null;
      }
    };
  }, [participant]);

  // Sync speaker mute state with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = !!speakerMuted;
      // Also set volume as backup — some browsers ignore muted on MediaStream elements
      audioRef.current.volume = speakerMuted ? 0 : 1;
    }
  }, [speakerMuted]);

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
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "100%",
          maxHeight: "100%",
          width: "auto",
          height: "auto",
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
  displayName = "Manager",
  onLeave,
  showInHalfScreen = true,
  isIncoming = false,
  showControls = true,
  onAudioStateChange,
  onVideoStateChange,
  onSpeakerStateChange,
}, ref) => {
  const localVideoRef = useRef(null);
  const roomRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [error, setError] = useState(null);
  const [remoteParticipants, setRemoteParticipants] = useState([]);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const { socket } = useWebSocket();

  // Get token from backend
  const getToken = useCallback(async () => {
    try {
      const response = await publicPost("/openvidu/token", {
        roomName,
        participantName: displayName,
        participantIdentity: `manager-${Date.now()}`,
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

        room.on(RoomEvent.Disconnected, (reason) => {
          console.log("⚠️ Disconnected from room, reason:", reason);
          if (mounted) {
            setIsConnected(false);
            // Don't clear remote participants immediately - let UI show "reconnecting" state
            // Only clear if user intentionally left
            if (reason !== 'CLIENT_INITIATED') {
              console.log('🔄 Unexpected disconnect - connection may recover');
            } else {
              setRemoteParticipants([]);
            }
          }
        });

        room.on(RoomEvent.Reconnecting, () => {
          console.log("🔄 Reconnecting to room...");
        });

        room.on(RoomEvent.Reconnected, () => {
          console.log("✅ Reconnected to room successfully");
          if (mounted) {
            setIsConnected(true);
          }
        });

        room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
          console.log("📶 Connection quality:", quality, "for", participant?.identity || 'local');
        });

        // Connect to the room
        await room.connect(serverUrl, token);
        console.log("Connected to room:", room.name);

        if (!mounted) return;

        // Get existing participants
        const existingParticipants = Array.from(room.remoteParticipants.values());
        setRemoteParticipants(existingParticipants);

        // Create and publish local tracks with fallback
        let tracks = [];
        try {
          // Try to get both audio and video
          // Request higher resolution
          tracks = await createLocalTracks({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
          console.log('✅ Created both audio and video tracks');
        } catch (deviceError) {
          console.warn("Could not get video device, trying audio only:", deviceError.message);
          try {
            // Fallback to audio only
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

        for (const track of tracks) {
          try {
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

        setIsConnected(true);
        setIsConnecting(false);

        // Notify parent of initial media states after connection
        if (mounted) {
          const audioEnabled = room.localParticipant.isMicrophoneEnabled;
          const videoEnabled = room.localParticipant.isCameraEnabled;

          setIsAudioMuted(!audioEnabled);
          setIsVideoMuted(!videoEnabled);

          if (onAudioStateChange) {
            onAudioStateChange(audioEnabled);
          }
          if (onVideoStateChange) {
            onVideoStateChange(videoEnabled);
          }

          console.log('📡 Initial media states:', { audioEnabled, videoEnabled });
        }
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

  // Use refs to avoid re-creating callbacks
  const socketRef2 = useRef(socket);
  const onLeaveRef = useRef(onLeave);

  useEffect(() => {
    socketRef2.current = socket;
  }, [socket]);

  useEffect(() => {
    onLeaveRef.current = onLeave;
  }, [onLeave]);

  // Define leaveCall with stable reference
  const leaveCall = useCallback(() => {
    // Disconnect from LiveKit room
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }

    // Call parent's onLeave callback (which will handle socket emit via wsEndCall)
    // DO NOT emit call:end here - parent component (WebSocketProvider.endCall) will handle it
    if (onLeaveRef.current) onLeaveRef.current();
  }, []); // Empty deps - uses refs for latest values

  // Handle socket events - customer ending call (only set up once)
  useEffect(() => {
    if (!socket) {
      return;
    }

    console.log("✅ [OpenViduMeetComponent] Registered call:ended listener");

    const handleCustomerEndedCall = (data) => {
      console.log("📞 [OpenViduMeetComponent] Customer ended call event received:", data);
      console.log("   Room ref exists:", !!roomRef.current);
      console.log("   Calling leaveCall()...");
      leaveCall();
    };

    // Listen for the correct event that backend emits
    socket.on("call:ended", handleCustomerEndedCall);

    return () => {
      console.log("🔴 [OpenViduMeetComponent] Removing call:ended listener");
      socket.off("call:ended", handleCustomerEndedCall);
    };
  }, [socket, leaveCall]); // leaveCall now has stable reference

  const toggleAudio = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      const localParticipant = roomRef.current.localParticipant;
      const currentlyEnabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!currentlyEnabled);
      const newMutedState = currentlyEnabled; // If was enabled, now muted (true); if was disabled, now not muted (false)
      setIsAudioMuted(newMutedState);
      if (onAudioStateChange) {
        onAudioStateChange(!newMutedState); // Pass enabled state, not muted state
      }
      console.log(`🎤 Audio ${!currentlyEnabled ? 'enabled' : 'muted'}`);
    } catch (error) {
      console.error('Error toggling audio:', error);
    }
  }, [onAudioStateChange]);

  const toggleVideo = useCallback(async () => {
    if (!roomRef.current) return;
    try {
      const localParticipant = roomRef.current.localParticipant;
      const currentlyEnabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!currentlyEnabled);
      const newMutedState = currentlyEnabled; // If was enabled, now muted (true); if was disabled, now not muted (false)
      setIsVideoMuted(newMutedState);
      if (onVideoStateChange) {
        onVideoStateChange(!newMutedState); // Pass enabled state, not muted state
      }
      console.log(`📹 Video ${!currentlyEnabled ? 'enabled' : 'muted'}`);
    } catch (error) {
      console.error('Error toggling video:', error);
    }
  }, [onVideoStateChange]);

  const toggleSpeaker = useCallback(() => {
    const newMutedState = !isSpeakerMuted;
    setIsSpeakerMuted(newMutedState);
    console.log(`🔊 Speaker ${newMutedState ? 'muted' : 'unmuted'}`);

    // Directly mute/unmute all remote audio elements for immediate effect
    // (avoids waiting for React re-render → prop → effect pipeline)
    const room = roomRef.current;
    if (room) {
      room.remoteParticipants.forEach((participant) => {
        participant.audioTrackPublications.forEach((publication) => {
          if (publication.track) {
            const elements = publication.track.attachedElements;
            elements.forEach((el) => {
              el.muted = newMutedState;
              el.volume = newMutedState ? 0 : 1;
            });
          }
        });
      });
    }

    if (onSpeakerStateChange) {
      onSpeakerStateChange(!newMutedState); // Pass enabled state (not muted state)
    }
  }, [isSpeakerMuted, onSpeakerStateChange]);

  // Store customer video element ref
  const customerVideoRef = useRef(null);

  // Update customer video ref when participants change
  useEffect(() => {
    if (remoteParticipants.length === 0) {
      customerVideoRef.current = null;
      console.log('📹 No remote participants, clearing customer video ref');
      return;
    }

    const customerParticipant = remoteParticipants.find(p => 
      p.identity.startsWith('customer')
    ) || remoteParticipants[0];
    
    console.log('📹 Looking for customer video, participant:', customerParticipant?.identity);
    
    // Find video track and get the actual video element
    const videoPublication = Array.from(customerParticipant.trackPublications.values())
      .find(pub => pub.track?.kind === Track.Kind.Video && pub.isSubscribed);
    
    if (videoPublication?.track) {
      console.log('📹 Found video track, looking for video element in DOM...');
      
      // Get the video element that the track is attached to
      // Check all video elements in DOM
      const videoElements = document.querySelectorAll('video');
      console.log('📹 Found', videoElements.length, 'video elements in DOM');
      
      for (const videoEl of videoElements) {
        // Check if this video element has the track attached
        if (videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          // Check if it's playing
          if (!videoEl.paused && !videoEl.ended) {
            // Try to match by checking if track is attached
            const stream = videoEl.srcObject;
            if (stream && stream.getVideoTracks().length > 0) {
              console.log('✅ Found valid customer video element:', {
                videoWidth: videoEl.videoWidth,
                videoHeight: videoEl.videoHeight,
                paused: videoEl.paused,
                ended: videoEl.ended
              });
              customerVideoRef.current = videoEl;
              break;
            }
          }
        }
      }
      
      // If not found in DOM, try to get from ParticipantVideo component's ref
      // This is a fallback - the onVideoElementReady callback should handle it
      if (!customerVideoRef.current) {
        console.log('⚠️ Customer video element not found in DOM, will be set via callback');
      }
    } else {
      console.log('⚠️ No video track found for customer participant');
      customerVideoRef.current = null;
    }
  }, [remoteParticipants]);

  // Expose methods to parent component
  // Get customer video element (first remote participant)
  const getCustomerVideoElement = useCallback(() => {
    return customerVideoRef.current;
  }, []);

  useImperativeHandle(ref, () => ({
    toggleAudio,
    toggleVideo,
    toggleSpeaker,
    leaveCall,
    isAudioMuted,
    isVideoMuted,
    isSpeakerMuted,
    getCustomerVideoElement,
  }));

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "#1e3a5f",
      }}
    >
      {/* Participant count indicator */}
      {remoteParticipants.length > 1 && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 1003,
            bgcolor: "rgba(0,0,0,0.6)",
            color: "white",
            px: 2,
            py: 0.5,
            borderRadius: 2,
            fontSize: 12,
          }}
        >
          {remoteParticipants.length + 1} participants
        </Box>
      )}

      {/* Video container */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          p: 1,
        }}
      >
        {/* Remote participants */}
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
              <Typography variant="h6">Waiting for customer to join...</Typography>
            </Box>
          ) : remoteParticipants.length === 1 ? (
            <ParticipantVideo
              participant={remoteParticipants[0]}
              isLarge={true}
              speakerMuted={isSpeakerMuted}
              onVideoElementReady={(videoEl) => {
                if (remoteParticipants[0].identity.startsWith('customer')) {
                  customerVideoRef.current = videoEl;
                }
              }}
            />
          ) : (
            remoteParticipants.map((participant) => (
              <ParticipantVideo
                key={participant.identity}
                participant={participant}
                isLarge={false}
                speakerMuted={isSpeakerMuted}
                onVideoElementReady={(videoEl) => {
                  if (participant.identity.startsWith('customer')) {
                    customerVideoRef.current = videoEl;
                  }
                }}
              />
            ))
          )}
        </Box>

        {/* Local video (picture-in-picture) */}
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
      </Box>

      {/* Controls */}
      {showControls && (
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
          <IconButton
            onClick={toggleAudio}
            sx={{
              bgcolor: isAudioMuted ? "error.main" : "success.main",
              color: "white",
              "&:hover": {
                bgcolor: isAudioMuted ? "error.dark" : "success.dark",
              },
              width: 48,
              height: 48,
            }}
          >
            {isAudioMuted ? <MicOffIcon /> : <MicIcon />}
          </IconButton>

          <IconButton
            onClick={toggleVideo}
            sx={{
              bgcolor: isVideoMuted ? "error.main" : "success.main",
              color: "white",
              "&:hover": {
                bgcolor: isVideoMuted ? "error.dark" : "success.dark",
              },
              width: 48,
              height: 48,
            }}
          >
            {isVideoMuted ? <VideocamOffIcon /> : <VideocamIcon />}
          </IconButton>

          <IconButton
            onClick={leaveCall}
            sx={{
              bgcolor: "error.main",
              color: "white",
              "&:hover": { bgcolor: "error.dark" },
              width: 48,
              height: 48,
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Box>
      )}

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
  showInHalfScreen: PropTypes.bool,
  isIncoming: PropTypes.bool,
  showControls: PropTypes.bool,
  onAudioStateChange: PropTypes.func,
  onVideoStateChange: PropTypes.func,
  onSpeakerStateChange: PropTypes.func,
};

export default OpenViduMeetComponent;
