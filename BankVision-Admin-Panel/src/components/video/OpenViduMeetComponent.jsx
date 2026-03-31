import PropTypes from "prop-types";
import { useEffect, useRef, useState, useCallback } from "react";
import { Box, IconButton, Typography, CircularProgress, Chip } from "@mui/material";
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    PhoneOff
} from 'lucide-react';
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
                border: "1px solid rgba(255,255,255,0.1)",
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
                        bgcolor: "#1e1e1e",
                    }}
                >
                    <Typography variant="body2" color="white">
                        {getDisplayName()} (No Video)
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
                    height: 20
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
    mode = "listen", // listen, whisper, barge
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
            // Use the new endpoint for supervisor tokens
            // If mode is 'listen' or 'whisper', we use the specific whisper-token endpoint which handles permissions
            let endpoint = "/openvidu/token";

            if (mode === "listen" || mode === "whisper") {
                endpoint = "/admin/supervisor/whisper-token";
            }

            const response = await api.post(endpoint, {
                roomName,
                participantName: displayName,
                // participantIdentity is generated by backend usually, or we pass one
                // For whisper-token endpoint, see `admin.controller.js` logic
            });

            if (response.data?.success && response.data?.data?.token) {
                return response.data.data;
            }
            throw new Error("Failed to get token from server");
        } catch (err) {
            console.error("Error getting token:", err);
            throw err;
        }
    }, [roomName, displayName, mode]);

    // Connect to room
    useEffect(() => {
        let mounted = true;

        const connectToRoom = async () => {
            try {
                setIsConnecting(true);
                setError(null);

                const tokenData = await getToken();
                const { token, serverUrl } = tokenData;

                // If serverUrl is not returned by whisper-token, use env var or default
                // The `generateWhisperToken` in backend returns { token, serverUrl: process.env.LIVEKIT_URL }
                const wsUrl = serverUrl || import.meta.env.VITE_WS_URL?.replace('http', 'ws') || 'ws://localhost:7880';

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
                await room.connect(wsUrl, token);
                console.log("Connected to room:", room.name);

                if (!mounted) return;

                // Get existing participants
                const existingParticipants = Array.from(room.remoteParticipants.values());
                setRemoteParticipants(existingParticipants);

                // Create and publish local tracks based on mode
                // Listen and Whisper modes: publish nothing (client-side enforcement)
                // In a real whisper implementation, supervisor audio would only be sent to the selected manager,
                // but currently the token generator grants `canPublish: false` for whisper mode.
                const shouldPublishAudio = mode === "barge";
                const shouldPublishVideo = mode === "barge";

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
            default: return "Monitoring";
        }
    };

    const getModeColor = () => {
        switch (mode) {
            case "listen": return "#2196f3";
            case "whisper": return "#ff9800";
            case "barge": return "#f44336";
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
                borderRadius: showInHalfScreen ? 3 : 0,
                boxShadow: showInHalfScreen ? 3 : "none",
                backgroundColor: "#1e1e1e", // Dark background for video
            }}
        >
            {/* Mode indicator */}
            <Box
                sx={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    zIndex: 1003,
                    bgcolor: getModeColor(),
                    color: "white",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    fontSize: 12,
                    fontWeight: 600,
                }}
            >
                {getModeLabel()} ({remoteParticipants.length + 1})
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
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", color: "white" }}>
                            <Typography variant="h6">Waiting for participants...</Typography>
                        </Box>
                    ) : (
                        remoteParticipants.map((participant) => (
                            <ParticipantVideo
                                key={participant.identity}
                                participant={participant}
                                isLarge={remoteParticipants.length === 1}
                            />
                        ))
                    )}
                </Box>
            </Box>

            {/* Controls */}
            <Box
                sx={{
                    position: "absolute",
                    bottom: 24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    display: "flex",
                    justifyContent: "center",
                    gap: 2,
                    zIndex: 1001,
                    backgroundColor: "rgba(0,0,0,0.6)",
                    borderRadius: 8,
                    padding: "8px 16px",
                    backdropFilter: "blur(4px)"
                }}
            >
                {mode !== "listen" && (
                    <IconButton
                        onClick={toggleAudio}
                        sx={{
                            bgcolor: isAudioMuted ? "error.main" : "rgba(255,255,255,0.1)",
                            color: "white",
                            "&:hover": { bgcolor: isAudioMuted ? "error.dark" : "rgba(255,255,255,0.2)" },
                        }}
                    >
                        {isAudioMuted ? <MicOff /> : <Mic />}
                    </IconButton>
                )}

                {(mode === "barge") && (
                    <IconButton
                        onClick={toggleVideo}
                        sx={{
                            bgcolor: isVideoMuted ? "error.main" : "rgba(255,255,255,0.1)",
                            color: "white",
                            "&:hover": { bgcolor: isVideoMuted ? "error.dark" : "rgba(255,255,255,0.2)" },
                        }}
                    >
                        {isVideoMuted ? <VideoOff /> : <Video />}
                    </IconButton>
                )}

                <IconButton
                    onClick={leaveCall}
                    sx={{
                        bgcolor: "error.main",
                        color: "white",
                        "&:hover": { bgcolor: "error.dark" },
                        width: 48,
                        height: 48
                    }}
                >
                    <PhoneOff />
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
                        bgcolor: "rgba(0,0,0,0.8)",
                        color: "white",
                        zIndex: 1002,
                    }}
                >
                    <CircularProgress color="inherit" sx={{ mb: 2 }} />
                    <Typography variant="h6">Connecting to Room...</Typography>
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
                        bgcolor: "rgba(0,0,0,0.9)",
                        color: "white",
                        zIndex: 1002,
                        p: 3
                    }}
                >
                    <Typography variant="h6" color="error" gutterBottom>
                        Connection Failed
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, textAlign: "center" }}>
                        {error}
                    </Typography>
                    <IconButton
                        onClick={leaveCall}
                        sx={{ bgcolor: "white", color: "error.main", "&:hover": { bgcolor: "#eee" } }}
                    >
                        <PhoneOff />
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
    mode: PropTypes.oneOf(["listen", "whisper", "barge"]),
};

export default OpenViduMeetComponent;
