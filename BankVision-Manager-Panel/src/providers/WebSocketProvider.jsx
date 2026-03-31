import { createContext, useContext, useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { io } from "socket.io-client";
import { useSelector, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { persistor } from "../redux/store";
import { logout } from "../redux/auth/authSlice";
import * as faceApiService from "../services/faceApiService";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const { token } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    // REMOVED: incomingCall state - queue-only design, no more broadcast popups
    const [availableManagers, setAvailableManagers] = useState([]);
    const [callStatus, setCallStatus] = useState('idle');
    const [currentCall, setCurrentCall] = useState(null);
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [verificationPending, setVerificationPending] = useState({ phone: false, email: false, face: false });
    const [customerTypingPhone, setCustomerTypingPhone] = useState('');
    const [phoneChangeRequested, setPhoneChangeRequested] = useState(false);
    const [newPhoneSubmitted, setNewPhoneSubmitted] = useState(null);
    const [capturedImages, setCapturedImages] = useState([]);
    const [faceVerificationStatus, setFaceVerificationStatus] = useState(null);
    const [customerStartedCapture, setCustomerStartedCapture] = useState(false); // New state
    const [customerAcknowledgedNotification, setCustomerAcknowledgedNotification] = useState(false); // New state
    const [chatMessages, setChatMessages] = useState([]);
    const [isCustomerTyping, setIsCustomerTyping] = useState(false);
    const [agentStatus, setAgentStatus] = useState('online');
    const [callQueue, setCallQueue] = useState([]);
    const [queueStats, setQueueStats] = useState({});
    const [allManagers, setAllManagers] = useState([]);
    const [assistanceStatus, setAssistanceStatus] = useState(null);
    const [assistanceResponse, setAssistanceResponse] = useState(null);
    const [isCallOnHold, setIsCallOnHold] = useState(false);

    // Whisper/Supervisor state
    const [whisperMessages, setWhisperMessages] = useState([]);
    const [supervisorMonitoring, setSupervisorMonitoring] = useState(null);
    const [isWhisperActive, setIsWhisperActive] = useState(false);

    // Queue notification state
    const [queueNotification, setQueueNotification] = useState(null);
    const prevQueueLength = useRef(0);

    // Sound notification refs (refs so socket handlers always see current values)
    const agentStatusRef = useRef(agentStatus);
    const callStatusRef = useRef(callStatus);
    const notificationAudioRef = useRef(null);

    // Post-call agent report: show modal after every call until manager submits report
    const [pendingPostCallReport, setPendingPostCallReport] = useState(null);

    // Face API (client-side) state
    const [faceApiReady, setFaceApiReady] = useState(false);
    const [customerEmotions, setCustomerEmotions] = useState(null);
    const [clientFaceResult, setClientFaceResult] = useState(null);
    const [faceProvider, setFaceProvider] = useState('server'); // 'client' or 'server'

    // Stats version counter - incremented on stats:update events so components re-fetch
    const [statsVersion, setStatsVersion] = useState(0);

    // Signature global state
    const [signatureUploadedPath, setSignatureUploadedPath] = useState(null);

    // Keep refs in sync with state for use inside socket event closures
    useEffect(() => { agentStatusRef.current = agentStatus; }, [agentStatus]);
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

    // Initialize notification audio on mount and unlock on first user interaction
    // Browsers require a user gesture before Audio.play() can work (autoplay policy).
    useEffect(() => {
        notificationAudioRef.current = new Audio('/sounds/calling-ringtone.mp3');
        notificationAudioRef.current.volume = 0.7;

        // Unlock audio on first user interaction (click/touch/keydown)
        const unlockAudio = () => {
            if (notificationAudioRef.current) {
                const audio = notificationAudioRef.current;
                // Play silently for a brief moment to satisfy autoplay policy
                audio.volume = 0;
                audio.play().then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    audio.volume = 0.7;
                    console.log("🔊 Notification audio unlocked by user interaction");
                }).catch(() => {
                    // Still blocked, will retry on next interaction
                });
            }
            // Remove listeners after first successful unlock
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('touchstart', unlockAudio);
        document.addEventListener('keydown', unlockAudio);

        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('touchstart', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
            if (notificationAudioRef.current) {
                notificationAudioRef.current.pause();
                notificationAudioRef.current = null;
            }
        };
    }, []);

    const reconnectInterval = useRef(null);
    const socketRef = useRef(null);
    const URL = import.meta.env.VITE_WS_URL;
    const attemptingReconnect = useRef(false);

    const handleTokenExpiration = async () => {
        console.log("⏳ Token expired, logging out and purging persisted data...");
        cleanupSocket();
        dispatch(logout());
        await persistor.purge();
        // Clear all auth storage to prevent stale tokens
        localStorage.removeItem('token');
        localStorage.removeItem('persist:authentication');
        sessionStorage.clear();
        window.location.reload();
    };

    const cleanupSocket = () => {
        if (socketRef.current) {
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setSocket(null);
        setIsConnected(false);
        clearInterval(reconnectInterval.current);
        reconnectInterval.current = null;
        attemptingReconnect.current = false;
    };

    const connectWebSocket = () => {
        if (!token) {
            console.log("⚠️ No token available, skipping WebSocket connection.");
            return;
        }

        if (socketRef.current) {
            console.log("⚠️ Socket connection already exists, skipping new connection.");
            return;
        }

        console.log("🔄 Initiating WebSocket connection...");

        const newSocket = io(URL, {
            transports: ["websocket"],
            query: {
                token
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 10000,
        });

        socketRef.current = newSocket;

        newSocket.on("connect", () => {
            console.log("✅ WebSocket Connected:", newSocket.id);
            setIsConnected(true);
            setSocket(newSocket);
            clearInterval(reconnectInterval.current);
            reconnectInterval.current = null;
            attemptingReconnect.current = false;

            // Request current status from backend (restores saved status from Redis)
            // Don't automatically set to "online" - let backend restore the manager's previous status
            newSocket.emit("manager:get-status");
        });

        newSocket.on("disconnect", (reason) => {
            console.log("❌ WebSocket Disconnected:", reason);
            setIsConnected(false);
            setCallStatus('ended');
            setCurrentCall(null);
            resetVerificationState();
            resetPhoneChangeState();

            if (
                reason === 'io server disconnect' ||
                reason === 'transport close' ||
                reason === 'ping timeout'
            ) {
                attemptReconnect();
            }
        });

        newSocket.on("connect_error", (error) => {
            console.error("❌ WebSocket Connection Error:", error.message);
            if (error.message?.toLowerCase().includes("auth") ||
                error.message?.toLowerCase().includes("token") ||
                error.message?.toLowerCase().includes("jwt") ||
                error.message?.toLowerCase().includes("expired")) {
                handleTokenExpiration();
            }
        });

        // ── CBS API call mirroring ─────────────────────────────────────────────
        // Backend emits these whenever a CBS (bank) API call is made so the
        // manager can see exactly what is sent/received in the browser console.
        newSocket.on("debug:cbs-call", ({ endpoint, args, timestamp }) => {
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(`📤 [CBS API CALL] ${endpoint}`);
            console.log("   Timestamp :", timestamp);
            console.log("   Payload   :", args);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        });
        newSocket.on("debug:cbs-response", ({ endpoint, result, timestamp }) => {
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.log(`✅ [CBS API RESP] ${endpoint}`);
            console.log("   Timestamp :", timestamp);
            console.log("   Response  :", result);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        });
        newSocket.on("debug:cbs-error", ({ endpoint, error, timestamp }) => {
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            console.error(`❌ [CBS API ERR ] ${endpoint}`);
            console.error("   Timestamp :", timestamp);
            console.error("   Error     :", error);
            console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        });

        newSocket.on("error", (error) => {
            console.error("WebSocket Error:", error);
            if (error.toString().toLowerCase().includes("auth") ||
                error.toString().toLowerCase().includes("token")) {
                handleTokenExpiration();
            }
        });

        newSocket.on("token_expired", () => {
            handleTokenExpiration();
        });

        // Force logout when logged in from another device
        newSocket.on("force-logout", async (data) => {
            console.log("🔐 Force logout - logged in from another device:", data);
            cleanupSocket();
            dispatch(logout());
            await persistor.purge();
            // Clear all auth storage to prevent stale tokens
            localStorage.removeItem('token');
            localStorage.removeItem('persist:authentication');
            sessionStorage.clear();
            alert("You have been logged out because your account was accessed from another device.");
            window.location.href = '/login';
        });

        // REMOVED: call:request event handler - queue-only design, no more broadcast popups
        // Managers pick calls manually from queue using queue:pick-call

        newSocket.on("call:accepted", (data) => {
            console.log("✅ Call started (picked from queue):", data);
            setCallStatus('in-call');
            setCurrentCall(data);
            resetVerificationState();
            resetPhoneChangeState();
        });

        // REMOVED: call:rejected event handler - no longer needed

        newSocket.on("call:ended", (data) => {
            console.log("📞 [Manager Panel] Call ended event received:", data);
            console.log("   Ended by:", data?.endedBy || "unknown");
            console.log("   Customer ID:", data?.customerId || "unknown");
            console.log("   CallLogId for report:", data?.callLogId);

            // Set pending post-call report so modal is shown (manager must submit report)
            if (data?.callLogId) {
                setPendingPostCallReport({
                    callLogId: data.callLogId,
                    referenceNumber: data.referenceNumber || null,
                });
            } else {
                // No callLogId (edge case): go idle after short delay so we don't get stuck
                setTimeout(() => setCallStatus('idle'), 1000);
            }

            // If manager ended the call, endCall() already cleared currentCall and set status - just return
            if (data?.endedBy === "manager") {
                console.log("   Manager ended call - post-call report modal will show");
                setCallStatus('ended');
                return;
            }

            // Customer ended the call - update state; do NOT auto-idle (wait for report submit)
            setCallStatus('ended');
            setCurrentCall(null);
            resetVerificationState();
            resetPhoneChangeState();

            console.log("   Status set to 'ended', emitting manager:free");
            newSocket.emit("manager:free");
        });

        newSocket.on("call:cancelled", (data) => {
            console.log("🚫 Call cancelled by customer:", data);
            setCallStatus('idle');
            setCurrentCall(null);
            resetVerificationState();
            resetPhoneChangeState();
        });

        newSocket.on("manager:list", (managers) => {
            console.log("👥 Available managers list updated:", managers);
            setAvailableManagers(managers);
        });

        newSocket.on("customer:phone-verified", (data) => {
            console.log("✅ Customer phone verified:", data);
            setPhoneVerified(true);
            setVerificationPending(prev => ({ ...prev, phone: false }));
        });

        newSocket.on("customer:email-verified", (data) => {
            console.log("✅ Customer email verified:", data);
            setEmailVerified(true);
            setVerificationPending(prev => ({ ...prev, email: false }));
        });

        newSocket.on("verification:initiated", (data) => {
            console.log("🔄 Verification initiated:", data);
            setVerificationPending(prev => ({
                ...prev,
                [data.type]: true
            }));
        });

        newSocket.on("otp:resent", (data) => {
            console.log("🔄 OTP resent:", data);
            toast.info(`${data.type.toUpperCase()} OTP has been resent to ${data.target}`);
            setVerificationPending(prev => ({
                ...prev,
                [data.type]: false // Reset loading state
            }));
        });

        newSocket.on("customer:verification-cancelled", (data) => {
            console.log("🚫 Customer cancelled verification:", data);
            const { verificationType } = data;

            // Reset verification pending state for the cancelled verification type
            if (verificationType === 'phone') {
                setVerificationPending(prev => ({ ...prev, phone: false }));
                console.log("📱 Phone verification cancelled - manager can re-request");
            } else if (verificationType === 'email') {
                setVerificationPending(prev => ({ ...prev, email: false }));
                console.log("📧 Email verification cancelled - manager can re-request");
            } else if (verificationType === 'face') {
                setVerificationPending(prev => ({ ...prev, face: false }));
                setFaceVerificationStatus(null);
                console.log("🤳 Face verification cancelled - manager can re-request");
            }
        });

        // Listen for face verification success (manual or passive)
        newSocket.on("customer:face-verified", (data) => {
            console.log("✅ Face verified event received:", data);
            setFaceVerificationStatus('verified');
            setVerificationPending(prev => ({ ...prev, face: false }));
        });

        newSocket.on("customer:typing-phone", (data) => {
            console.log("📱 Customer typing phone number:", data.newPhoneNumber);
            setCustomerTypingPhone(data.newPhoneNumber);
        });

        newSocket.on("customer:new-phone", (data) => {
            console.log("📱 Customer submitted new phone number:", data.newPhoneNumber);
            setNewPhoneSubmitted({
                oldNumber: data.oldPhoneNumber,
                newNumber: data.newPhoneNumber,
                timestamp: data.submittedAt
            });
        });

        newSocket.on("manager:received-image-link", (data) => {
            console.log("🖼️ Received image link from customer:", data);
            setCapturedImages(prev => [...prev, {
                imagePath: data.imagePath
            }]);
            setCustomerStartedCapture(false); // Reset this flag when image is received
        });

        newSocket.on("customer:start-capture", () => {
            console.log("✅ Customer started face capture countdown.");
            setCustomerStartedCapture(true);
        });

        newSocket.on("customer:cancel-face-verification-acknowledgement", () => {
            console.log("🚫 Customer acknowledged and cancelled face verification.");
            setCustomerStartedCapture(false);
            setCustomerAcknowledgedNotification(false); // Reset this
            // Optionally, update FaceVerification component state via context or another event
        });

        newSocket.on("customer:face-verification-notification-acknowledged", () => {
            console.log("✅ Customer acknowledged face verification notification.");
            setCustomerAcknowledgedNotification(true);
        });

        // Signature upload event (global listener)
        newSocket.on("customer:signature-uploaded", (data) => {
            console.log("✍️ [Global] RECEIVED customer:signature-uploaded:", data);
            if (data && data.signaturePath) {
                setSignatureUploadedPath(data.signaturePath);
            } else {
                console.error("❌ Received signature-uploaded event but data.signaturePath is missing:", data);
            }
        });

        // Chat events
        newSocket.on("chat:receive", (data) => {
            console.log("💬 Chat message received:", data);
            setChatMessages(prev => [...prev, data]);
        });

        newSocket.on("chat:sent", (data) => {
            console.log("💬 Chat message sent confirmation:", data);
            setChatMessages(prev => [...prev, data]);
        });

        newSocket.on("chat:typing", (data) => {
            if (data.senderRole === 'customer') {
                setIsCustomerTyping(data.isTyping);
            }
        });

        // Agent status and queue events
        newSocket.on("manager:status-updated", (data) => {
            console.log("🔄 Agent status updated:", data.status);
            setAgentStatus(data.status);
        });

        newSocket.on("manager:current-status", (data) => {
            console.log("📊 Current status received:", data.status);
            setAgentStatus(data.status);
        });

        newSocket.on("queue:list", (data) => {
            console.log("📋 Queue list received:", data);
            setCallQueue(data.queue || []);
            setQueueStats(data.stats || {});
        });

        newSocket.on("queue:updated", (data) => {
            console.log("📋 Queue updated:", data);
            const newQueue = data.queue || [];

            // Check if a new customer was added to the queue
            if (newQueue.length > prevQueueLength.current && prevQueueLength.current >= 0) {
                const newCustomer = newQueue[newQueue.length - 1];
                if (newCustomer) {
                    const customerLabel = newCustomer.customerName || newCustomer.customerPhone;
                    setQueueNotification({
                        message: `New customer ${customerLabel} is waiting in queue (Position: ${newQueue.length})`,
                        customerPhone: newCustomer.customerPhone,
                        customerName: newCustomer.customerName,
                        isGuest: newCustomer.isGuest,
                        position: newQueue.length,
                        timestamp: Date.now()
                    });

                    // Play notification sound if manager is idle (online and not in a call)
                    const isIdle = agentStatusRef.current === 'online' && callStatusRef.current !== 'in-call';
                    if (isIdle && notificationAudioRef.current) {
                        console.log("🔔 Playing queue notification sound (manager is idle)");
                        notificationAudioRef.current.currentTime = 0;
                        notificationAudioRef.current.play().catch(err => {
                            console.warn("🔇 Could not play notification sound:", err.message);
                        });

                        // Stop the sound after 3 seconds (it's a ringtone, not a short chime)
                        setTimeout(() => {
                            if (notificationAudioRef.current) {
                                notificationAudioRef.current.pause();
                                notificationAudioRef.current.currentTime = 0;
                            }
                        }, 3000);
                    }
                }
            }

            prevQueueLength.current = newQueue.length;
            setCallQueue(newQueue);
            setQueueStats(data.stats || {});
        });

        newSocket.on("managers:status", (managers) => {
            console.log("👥 All managers status received:", managers);
            setAllManagers(managers);
        });

        newSocket.on("admin:managers-list", (managers) => {
            console.log("👥 Admin managers list received:", managers);
            setAllManagers(managers);
        });

        // Assistance events
        newSocket.on("manager:assistance-requested", (data) => {
            console.log("🆘 Assistance request sent:", data);
            setAssistanceStatus('pending');
        });

        newSocket.on("manager:assistance-cancelled", (data) => {
            console.log("🆘 Assistance request cancelled:", data);
            setAssistanceStatus(null);
            setAssistanceResponse(null);
        });

        newSocket.on("manager:assistance-response", (data) => {
            console.log("🆘 Supervisor responded to assistance:", data);
            setAssistanceStatus('responded');
            setAssistanceResponse(data);
        });

        // Call hold events
        newSocket.on("manager:call-on-hold", (data) => {
            console.log("⏸️ Call put on hold:", data);
            setIsCallOnHold(true);
        });

        newSocket.on("manager:call-resumed", (data) => {
            console.log("▶️ Call resumed:", data);
            setIsCallOnHold(false);
        });

        // Supervisor/Whisper events
        newSocket.on("supervisor:joined", (data) => {
            console.log("👁️ Supervisor joined call:", data);
            setSupervisorMonitoring({
                id: data.supervisorId,
                name: data.supervisorName,
                mode: data.mode || 'listen',
                joinedAt: data.timestamp
            });
        });

        newSocket.on("supervisor:left", (data) => {
            console.log("👁️ Supervisor left call:", data);
            setSupervisorMonitoring(null);
            setIsWhisperActive(false);
        });

        newSocket.on("supervisor:whisper-started", (data) => {
            console.log("🔊 Supervisor started whisper:", data);
            setIsWhisperActive(true);
            setSupervisorMonitoring(prev => prev ? { ...prev, mode: 'whisper' } : {
                id: data.supervisorId,
                name: data.supervisorName,
                mode: 'whisper'
            });
        });

        newSocket.on("supervisor:whisper-stopped", (data) => {
            console.log("🔇 Supervisor stopped whisper:", data);
            setIsWhisperActive(false);
            setSupervisorMonitoring(prev => prev ? { ...prev, mode: 'listen' } : null);
        });

        newSocket.on("supervisor:text-whisper", (data) => {
            console.log("💬 Received text whisper from supervisor:", data);
            setWhisperMessages(prev => [...prev, {
                id: data.id,
                senderId: data.senderId,
                senderName: data.senderName,
                message: data.message,
                timestamp: data.timestamp,
                type: 'received'
            }]);
        });

        newSocket.on("manager:text-whisper-reply-sent", (data) => {
            console.log("💬 Whisper reply sent:", data);
            setWhisperMessages(prev => [...prev, {
                id: data.id,
                message: data.message,
                timestamp: data.timestamp,
                type: 'sent'
            }]);
        });

        newSocket.on("supervisor:barged-in", (data) => {
            console.log("📢 Supervisor barged into call:", data);
            setSupervisorMonitoring(prev => prev ? { ...prev, mode: 'barge' } : {
                id: data.supervisorId,
                name: data.supervisorName,
                mode: 'barge'
            });
        });

        newSocket.on("supervisor:call-takeover", (data) => {
            console.log("🔄 Supervisor taking over call:", data);
            setSupervisorMonitoring(prev => prev ? { ...prev, mode: 'takeover' } : {
                id: data.supervisorId,
                name: data.supervisorName,
                mode: 'takeover'
            });
            // End the call for manager when supervisor takes over
            setCallStatus('ended');
            setCurrentCall(null);
            resetVerificationState();
            resetPhoneChangeState();
            resetWhisperState();
            // Show alert that supervisor took over
            alert(`Supervisor ${data.supervisorName || 'Admin'} has taken over this call.`);
        });

        // Track stats:update events so PerformanceOverview re-fetches even after remount
        newSocket.on("stats:update", (data) => {
            console.log("📊 stats:update received:", data?.event);
            setStatsVersion(prev => prev + 1);
        });

        // Request initial queue and status on connect
        newSocket.emit("queue:get");
        newSocket.emit("manager:get-status");

    };

    // REMOVED: acceptCall and rejectCall functions
    // Queue-only design: Managers pick calls manually from queue using pickCallFromQueue

    const endCall = () => {
        if (!socketRef.current || !currentCall) return;

        console.log("📞 Ending current call with customer:", currentCall.customerId);
        socketRef.current.emit("call:end");
        setCallStatus('ended');
        setCurrentCall(null);
        resetVerificationState();
        resetPhoneChangeState();
        socketRef.current.emit("manager:free");
        // Do NOT set idle here - wait for post-call report submit (call:ended will set pendingPostCallReport with callLogId)
    };

    const clearPostCallReportAndGoIdle = () => {
        setPendingPostCallReport(null);
        setCallStatus('idle');
        console.log('🔄 Post-call report submitted, transitioning to idle');
    };

    const requestPhoneVerification = () => {
        // if (!socketRef.current || !currentCall || callStatus !== 'in-call') return;

        console.log("📱 Requesting phone verification for customer");
        socketRef.current.emit("request:phone-verification");
        setVerificationPending(prev => ({ ...prev, phone: true }));
    };

    const requestEmailVerification = (customerEmail) => {
        // if (!socketRef.current || !currentCall || callStatus !== 'in-call') return;

        console.log("📧 Requesting email verification for customer:", customerEmail);
        socketRef.current.emit("request:email-verification", { customerEmail });
        setVerificationPending(prev => ({ ...prev, email: true }));
    };



    const requestRetakeImage = () => {
        // if (!socketRef.current || !currentCall || callStatus !== 'in-call') return;

        console.log("🔄 Requesting customer to retake image");
        socketRef.current.emit("manager:request-retake-image", {
            timestamp: Date.now()
        });
    };

    const requestCaptureImage = () => {
        // if (!socketRef.current || !currentCall || callStatus !== 'in-call') return;

        console.log("📸 Requesting customer to capture image");
        socketRef.current.emit("manager:request-capture-image", {
            timestamp: Date.now()
        });
    };
    const initiateFaceVerification = () => {
        if (!socketRef.current) {
            console.error("❌ Cannot initiate face verification: Socket not connected");
            return false;
        }

        if (!currentCall) {
            console.error("❌ Cannot initiate face verification: No active call");
            return false;
        }

        // Allow if call is active (in-call or connecting states)
        if (callStatus !== 'in-call' && callStatus !== 'connecting') {
            console.warn(`⚠️ Call status is '${callStatus}', but proceeding anyway`);
        }

        console.log("🤳 Manager initiating face verification flow with customer");
        console.log("DEBUG: Manager's socketRef.current:", socketRef.current);
        console.log("DEBUG: currentCall:", currentCall);
        console.log("DEBUG: callStatus:", callStatus);

        try {
            socketRef.current.emit("manager:initiate-face-verification", {
                timestamp: Date.now()
            });

            // Listen for confirmation or error
            const handleInitiated = () => {
                console.log("✅ Face verification initiated successfully");
                socketRef.current?.off("manager:face-verification-initiated", handleInitiated);
                socketRef.current?.off("manager:face-verification-error", handleError);
            };

            const handleError = (error) => {
                console.error("❌ Face verification error:", error);
                socketRef.current?.off("manager:face-verification-initiated", handleInitiated);
                socketRef.current?.off("manager:face-verification-error", handleError);
            };

            socketRef.current.once("manager:face-verification-initiated", handleInitiated);
            socketRef.current.once("manager:face-verification-error", handleError);

            return true;
        } catch (error) {
            console.error("❌ Error emitting face verification event:", error);
            return false;
        }
    };

    const requestSubmitImage = () => {
        // if (!socketRef.current || !currentCall || callStatus !== 'in-call') return;

        console.log("📸 Requesting customer to submit image");
        socketRef.current.emit("manager:request-submit-image", {
            timestamp: Date.now()
        });
    };

    const verifyImage = (verificationStatus = "verified") => {
        // if (!socketRef.current || !currentCall || callStatus !== 'in-call') return;

        console.log(`🔍 Verifying customer image with status: ${verificationStatus}`);
        // Backend expects "manager:verify-image" event
        socketRef.current.emit("manager:verify-image", {
            verificationStatus,
            timestamp: Date.now()
        });
        setFaceVerificationStatus(verificationStatus);
        setVerificationPending(prev => ({ ...prev, face: false }));
    };

    const markFaceVerified = (matchPercentage = 100) => {
        if (!socketRef.current) return;

        console.log(`✅ Marking face as verified (passive/auto) with match: ${matchPercentage}%`);
        setFaceVerificationStatus('verified');

        // Notify backend to sync state
        // Use the customer phone/id from currentCall
        const customerId = currentCall?.customerPhone || currentCall?.customerId;

        if (customerId) {
            socketRef.current.emit("manager:face-verified", {
                matchPercentage,
                customerId,
                timestamp: Date.now()
            });
        } else {
            console.warn("⚠️ Cannot emit manager:face-verified - No customer ID found in currentCall");
        }
    };


    const requestPhoneChange = () => {
        if (!socketRef.current) return;
        console.log("📱 Requesting phone number change for customer");
        socketRef.current.emit("change:phone-permission");
        setPhoneChangeRequested(true);
        setCustomerTypingPhone('');
        setNewPhoneSubmitted(null);
    };

    const confirmPhoneChange = (newPhoneNumber, approved = true) => {
        if (!socketRef.current || !currentCall || callStatus !== 'in-call' || !newPhoneNumber) return;

        console.log(`${approved ? '✅ Approving' : '❌ Rejecting'} phone change to ${newPhoneNumber}`);
        socketRef.current.emit("confirm:phone-change", {
            newPhoneNumber,
            approved
        });

        if (approved) {
            // Update the call data with new phone number if needed
            setCurrentCall(prev => ({
                ...prev,
                customerPhone: newPhoneNumber
            }));
        }

        resetPhoneChangeState();
    };

    const resetVerificationState = () => {
        setPhoneVerified(false);
        setEmailVerified(false);
        setVerificationPending({ phone: false, email: false, face: false });
        setFaceVerificationStatus(null);
        setCapturedImages([]);
        setChatMessages([]);
        setIsCustomerTyping(false);
        setSignatureUploadedPath(null);
        resetAssistanceState();
        resetHoldState();
        resetEmotionState();
        resetWhisperState();
    };

    // Reset whisper state
    const resetWhisperState = () => {
        setWhisperMessages([]);
        setSupervisorMonitoring(null);
        setIsWhisperActive(false);
    };

    // Reply to supervisor whisper
    const replyToWhisper = (message) => {
        if (!socketRef.current || !supervisorMonitoring) return;

        socketRef.current.emit("manager:text-whisper-reply", {
            supervisorId: supervisorMonitoring.id,
            message
        });
    };

    const sendChatMessage = (message) => {
        if (!socketRef.current) return;

        socketRef.current.emit("chat:send", {
            message,
            timestamp: Date.now()
        });
    };

    const sendTypingIndicator = (isTyping) => {
        if (!socketRef.current) return;

        socketRef.current.emit("chat:typing", { isTyping });
    };

    const resetPhoneChangeState = () => {
        setPhoneChangeRequested(false);
        setCustomerTypingPhone('');
        setNewPhoneSubmitted(null);
    };

    const setBusyStatus = () => {
        if (!socketRef.current) return;
        socketRef.current.emit("manager:busy");
    };

    const setAvailableStatus = () => {
        if (!socketRef.current) return;
        socketRef.current.emit("manager:free");
    };

    const setAgentStatusValue = (status) => {
        if (!socketRef.current) return;
        socketRef.current.emit("manager:set-status", { status });
    };

    const resendOTP = (type, target) => {
        if (!socketRef.current) return;
        console.log(`🔄 Requesting resend ${type} OTP to ${target}`);
        setVerificationPending(prev => ({ ...prev, [type]: true }));
        socketRef.current.emit("resend:otp", { type, target });
    };

    const pickCallFromQueue = (customerPhone) => {
        if (!socketRef.current) return;
        console.log("📞 Picking call from queue:", customerPhone);
        socketRef.current.emit("queue:pick-call", { customerPhone });
    };

    const refreshQueue = () => {
        if (!socketRef.current) return;
        socketRef.current.emit("queue:get");
    };

    const clearQueueNotification = () => {
        setQueueNotification(null);
    };

    const requestAssistance = (data = {}) => {
        if (!socketRef.current) return;
        console.log("🆘 Requesting assistance from supervisor");
        socketRef.current.emit("manager:request-assistance", {
            urgency: data.urgency || 'normal',
            reason: data.reason || ''
        });
    };

    const cancelAssistance = () => {
        if (!socketRef.current) return;
        console.log("🆘 Cancelling assistance request");
        socketRef.current.emit("manager:cancel-assistance");
        setAssistanceStatus(null);
        setAssistanceResponse(null);
    };

    const resetAssistanceState = () => {
        setAssistanceStatus(null);
        setAssistanceResponse(null);
    };

    const holdCall = (reason = '') => {
        if (!socketRef.current) return;
        console.log("⏸️ Putting call on hold");
        socketRef.current.emit("manager:hold-call", { reason });
    };

    const resumeCall = () => {
        if (!socketRef.current) return;
        console.log("▶️ Resuming call");
        socketRef.current.emit("manager:resume-call");
    };

    const resetHoldState = () => {
        setIsCallOnHold(false);
    };

    const clearSignaturePath = () => {
        setSignatureUploadedPath(null);
    };


    // Load face-api.js models
    const loadFaceApiModels = async () => {
        try {
            console.log("🔄 Loading face-api.js models...");
            await faceApiService.loadModels();
            setFaceApiReady(true);
            console.log("✅ Face-api.js models loaded successfully");
            return true;
        } catch (error) {
            console.error("❌ Failed to load face-api.js models:", error);
            return false;
        }
    };

    // Client-side face verification with emotion detection
    const verifyFaceClientSide = async (capturedImage, referenceImage) => {
        if (!faceApiReady) {
            console.log("⏳ Face-api.js not ready, loading models...");
            await loadFaceApiModels();
        }

        try {
            console.log("🔍 Running client-side face verification...");
            const result = await faceApiService.verifyFace(capturedImage, referenceImage);

            // Store emotions
            if (result.emotions) {
                setCustomerEmotions(result.emotions);
            }

            // Store result
            setClientFaceResult(result);

            console.log(`📊 Client-side result: matched=${result.matched}, similarity=${result.similarity}%`);

            return result;
        } catch (error) {
            console.error("❌ Client-side face verification failed:", error);
            return {
                verified: false,
                matched: false,
                error: error.message
            };
        }
    };

    // Detect emotion only (for real-time tracking)
    const detectCustomerEmotion = async (imageSource) => {
        if (!faceApiReady) {
            await loadFaceApiModels();
        }

        try {
            const result = await faceApiService.detectEmotion(imageSource);
            if (result.detected) {
                setCustomerEmotions(result.emotions);
            }
            return result;
        } catch (error) {
            console.error("❌ Emotion detection failed:", error);
            return { detected: false, error: error.message };
        }
    };

    // Toggle face verification provider
    const toggleFaceProvider = (provider) => {
        if (provider === 'client' || provider === 'server') {
            setFaceProvider(provider);
            console.log(`🔄 Face verification provider set to: ${provider}`);
        }
    };

    // Reset emotion state
    const resetEmotionState = () => {
        setCustomerEmotions(null);
        setClientFaceResult(null);
    };

    const attemptReconnect = () => {
        if (attemptingReconnect.current) {
            console.log("⚠️ Reconnection already in progress, skipping new attempt");
            return;
        }

        if (!isConnected && token) {
            attemptingReconnect.current = true;
            console.log("♻️ Setting up reconnection interval...");

            clearInterval(reconnectInterval.current);

            reconnectInterval.current = setInterval(() => {
                console.log("♻️ Attempting WebSocket Reconnect...");
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
                connectWebSocket();
            }, 5000);
        }
    };

    useEffect(() => {
        if (token && !socketRef.current) {
            connectWebSocket();
        } else if (!token && socketRef.current) {
            cleanupSocket();
        }

        return () => {
            cleanupSocket();
        };
    }, [token]);

    // Load face-api.js models on mount
    // DISABLED: Using OpenCV server-side verification instead of face-api.js client-side
    // useEffect(() => {
    //     loadFaceApiModels();
    // }, []);

    return (
        <WebSocketContext.Provider value={{
            socket,
            isConnected,
            // REMOVED: incomingCall - queue-only design
            availableManagers,
            callStatus,
            currentCall,
            phoneVerified,
            emailVerified,
            verificationPending,
            customerTypingPhone,
            phoneChangeRequested,
            newPhoneSubmitted,
            faceVerificationStatus,
            capturedImages,
            chatMessages,
            isCustomerTyping,
            agentStatus,
            callQueue,
            queueStats,
            allManagers,
            requestPhoneVerification,
            requestEmailVerification,
            resendOTP,
            requestPhoneChange,
            confirmPhoneChange,
            // REMOVED: acceptCall, rejectCall - queue-only design
            endCall,
            setBusyStatus,
            setAvailableStatus,
            setAgentStatusValue,
            pickCallFromQueue,
            refreshQueue,
            queueNotification,
            clearQueueNotification,
            pendingPostCallReport,
            clearPostCallReportAndGoIdle,
            initiateFaceVerification, // New emit function
            requestRetakeImage,
            requestCaptureImage,
            requestSubmitImage,
            customerStartedCapture, // Add new state to context
            customerAcknowledgedNotification, // Add new state to context
            verifyImage,
            markFaceVerified, // Add to context
            sendChatMessage,
            sendTypingIndicator,
            assistanceStatus,
            assistanceResponse,
            requestAssistance,
            cancelAssistance,
            isCallOnHold,
            holdCall,
            resumeCall,
            // Face API (client-side)
            faceApiReady,
            customerEmotions,
            clientFaceResult,
            faceProvider,
            verifyFaceClientSide,
            detectCustomerEmotion,
            toggleFaceProvider,
            loadFaceApiModels,
            // Whisper/Supervisor
            whisperMessages,
            supervisorMonitoring,
            isWhisperActive,
            replyToWhisper,
            signatureUploadedPath,
            clearSignaturePath,
            statsVersion,
        }}>
            {children}
        </WebSocketContext.Provider>
    );
};

WebSocketProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

export const useWebSocket = () => {
    return useContext(WebSocketContext);
};