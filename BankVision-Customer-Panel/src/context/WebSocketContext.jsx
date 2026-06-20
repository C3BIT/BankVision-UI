import { createContext, useContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import PropTypes from "prop-types";

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState("idle");
  const [callData, setCallData] = useState(null);
  const [availableManagers, setAvailableManagers] = useState([]);
  const [faceVerificationInitiated, setFaceVerificationInitiated] = useState(false); // New state
  const [verificationRequests, setVerificationRequests] = useState({
    phone: false,
    email: false,
    face: false,
    signature: false
  });
  const [changeRequests, setChangeRequests] = useState({
    phoneChangeRequested: false,
    emailChangeRequested: false,
    addressChangeRequested: false
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [isManagerTyping, setIsManagerTyping] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [holdInfo, setHoldInfo] = useState(null);
  const [currentScreen, setCurrentScreen] = useState(null); // Manager's current screen
  const [currentAccountData, setCurrentAccountData] = useState(null); // Account data from manager
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(null);
  const [queueMessage, setQueueMessage] = useState(null);
  const [peerReconnecting, setPeerReconnecting] = useState(false); // true while waiting for manager to reconnect
  const reconnectInterval = useRef(null);
  const callStatusRef = useRef(callStatus);
  const callEndedRef = useRef(false); // guards against race where a reconnect socket fires call:initiate after call:ended

  // Keep ref in sync so disconnect handler always sees latest callStatus
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  const URL = import.meta.env.VITE_WS_URL || 'https://vb-api.feedquix.com';

  const initiateCall = (phoneNumber, verificationInfo = null) => {
    setConnectionError(null);

    if (!phoneNumber) {
      setConnectionError("Please enter a valid phone number");
      return false;
    }

    const formattedPhone = phoneNumber.replace(/\s+/g, "");

    try {
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        clearInterval(reconnectInterval.current);
      }

      callEndedRef.current = false; // reset so new call can initiate
      setCallStatus("connecting");
      setCallData(null);
      setVerificationRequests({ phone: false, email: false, face: false, signature: false });
      setChangeRequests({
        phoneChangeRequested: false,
        emailChangeRequested: false,
        addressChangeRequested: false
      });

      const newSocket = io(URL, {
        transports: ["websocket"],
        query: { phone: formattedPhone },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });

      // Only emit call:initiate on the very first connect, not on auto-reconnects.
      // Reconnects after call:ended would otherwise re-add the customer to the queue.
      let hasInitiated = false;

      newSocket.on("connect", () => {
        console.log("✅ Socket.io Connected:", newSocket.id);
        setIsConnected(true);

        if (!hasInitiated && !callEndedRef.current) {
          hasInitiated = true;
          // Include verification info so manager can see verification phone/email
          newSocket.emit("call:initiate", {
            phoneNumber: formattedPhone,
            timestamp: new Date().toISOString(),
            verificationInfo: verificationInfo, // { method: 'phone'|'email', phoneOrEmail: '...' }
          });
        }
      });

      newSocket.on("connect_error", (error) => {
        console.error("🔴 Connection Error:", error.message);
        setConnectionError(`Connection error: ${error.message}`);
        setIsConnected(false);
        setCallStatus("idle");
      });

      newSocket.on("disconnect", (reason) => {
        const currentStatus = callStatusRef.current;
        console.log("❌ Socket.io Disconnected:", reason);
        console.log(`   Current callStatus (from ref): ${currentStatus}`);
        setIsConnected(false);

        if (currentStatus === "connected" || currentStatus === "connecting") {
          console.log("   Call was active - attempting reconnect");
          attemptReconnect(formattedPhone);
        } else if (currentStatus === "ended") {
          // Call ended normally - feedback screen should be showing
          // If disconnect was intentional (reason: "io client disconnect"), reset to idle
          // Otherwise keep status as "ended" to show feedback
          if (reason === "io client disconnect") {
            console.log("   Intentional disconnect after feedback - resetting to idle");
            setCallStatus("idle");
          } else {
            console.log("   Call ended - keeping status 'ended' for feedback screen");
          }
        } else {
          console.log("   Resetting status to idle");
          setCallStatus("idle");
        }
      });

      newSocket.on("call:initiated", (data) => {
        console.log("🔄 Call initiated:", data);
        setCallData({
          managerId: data.managerId,
          managerName: data.managerName,
          managerImage: data.managerImage,
          callRoom: data.callRoom
        });
      });

      newSocket.on("call:accepted", (data) => {
        console.log("✅ Call accepted:", data);
        setCallData(prevData => ({
          ...prevData,
          managerId: data.managerId,
          managerName: data.managerName,
          managerImage: data.managerImage,
          callRoom: data.callRoom, // CRITICAL: Set callRoom for video join
          referenceNumber: data.referenceNumber,
          routingTime: data.routingTime
        }));
        setCallStatus("connected");
      });

      newSocket.on("call:rejected", (data) => {
        console.log("❌ Call rejected:", data);

        // Clean up socket and reset state completely
        if (newSocket && newSocket.connected) {
          newSocket.disconnect();
        }
        setSocket(null);

        setCallStatus("idle");
        setIncomingCall(null);
        setCallData(null);
        setIsConnected(false);
        setChatMessages([]);
        setIsManagerTyping(false);
        setIsOnHold(false);
        setHoldInfo(null);
        setInQueue(false);
        setQueuePosition(null);
        setQueueMessage(null);
        setVerificationRequests({ phone: false, email: false, face: false, signature: false });
        setChangeRequests({
          phoneChangeRequested: false,
          emailChangeRequested: false,
          addressChangeRequested: false
        });
        setConnectionError(data.message || "Call was not answered");
        clearInterval(reconnectInterval.current);
      });

      newSocket.on("call:failed", (data) => {
        console.log("❌ Call failed:", data);

        // Reset state but keep socket connected so customer can try again immediately
        setCallStatus("failed");
        setIncomingCall(null);
        setCallData(null);
        setChatMessages([]);
        setIsManagerTyping(false);
        setIsOnHold(false);
        setHoldInfo(null);
        setInQueue(false);
        setQueuePosition(null);
        setQueueMessage(null);
        setVerificationRequests({ phone: false, email: false, face: false, signature: false });
        setChangeRequests({
          phoneChangeRequested: false,
          emailChangeRequested: false,
          addressChangeRequested: false
        });
        setConnectionError(data.message || "No managers available at this moment");
        clearInterval(reconnectInterval.current);

        // Automatically reset to idle after showing error so user can retry
        setTimeout(() => {
          if (newSocket && newSocket.connected) {
            newSocket.disconnect();
          }
          setSocket(null);
          setCallStatus("idle");
          setIsConnected(false);
        }, 2000);
      });

      // Queue events
      newSocket.on("queue:added", (data) => {
        console.log("📋 Added to queue:", data);
        setInQueue(true);
        setQueuePosition(data.position);
        setQueueMessage(data.message || "You are in the queue");
        setCallStatus("queued");
      });

      newSocket.on("queue:already", (data) => {
        console.log("📋 Already in queue:", data);
        setInQueue(true);
        setQueuePosition(data.position);
        setQueueMessage(data.message || "You are already in the queue");
        setCallStatus("queued");
      });

      newSocket.on("queue:call-connecting", (data) => {
        console.log("📞 Queue call connecting:", data);
        setInQueue(false);
        setQueuePosition(null);
        setQueueMessage(null);
        setCallData({
          managerId: data.managerId,
          managerName: data.managerName,
          callRoom: data.callRoom
        });
        setCallStatus("connecting");
      });

      newSocket.on("call:ended", (data) => {
        console.log("📞 [WebSocketContext] call:ended event received!");
        console.log("   Ended by:", data.endedBy || "unknown");

        // Set status to ended (only needed when manager ends the call;
        // endCall() already sets it when customer ends)
        if (data?.endedBy !== "customer") {
          setCallStatus("ended");
        }

        // Stop any pending reconnect loop so it cannot re-queue the customer
        clearInterval(reconnectInterval.current);
        // Prevent any socket created by attemptReconnect from emitting call:initiate
        callEndedRef.current = true;
        // Disable socket.io's built-in auto-reconnect — the socket is kept alive
        // only to show the feedback screen; a reconnect would fire call:initiate again
        newSocket.io.reconnection(false);

        // Always clean up all call-specific state regardless of who ended
        setPeerReconnecting(false);
        setIncomingCall(null);
        setChatMessages([]);
        setIsManagerTyping(false);
        setIsOnHold(false);
        setHoldInfo(null);
        setInQueue(false);
        setQueuePosition(null);
        setQueueMessage(null);
        setVerificationRequests({ phone: false, email: false, face: false, signature: false });
        setChangeRequests({
          phoneChangeRequested: false,
          emailChangeRequested: false,
          addressChangeRequested: false,
          accountActivationRequested: false,
        });

        // NOTE: Socket will be disconnected after feedback is submitted/skipped
        console.log("✅ Call ended - state cleaned, reconnection disabled, feedback screen will show");
      });

      newSocket.on("call:cancelled_confirmation", (data) => {
        console.log("🚫 Call cancelled confirmation:", data);
        setCallStatus("idle");
        setCallData(null);
      });

      newSocket.on("call:incoming", (data) => {
        console.log("📲 Incoming call:", data);
        setIncomingCall({
          caller: data.caller || "Unknown",
          phoneNumber: data.phoneNumber,
          timestamp: data.timestamp
        });
        setCallStatus("ringing");
      });

      newSocket.on("manager:list", (managers) => {
        console.log("📋 Available managers list:", managers);
        setAvailableManagers(managers);

        // Update queue message if customer is in queue and managers become available
        if (inQueue && managers.length > 0) {
          console.log("✅ Managers now available while in queue - updating message");
          setQueueMessage("A manager is now available. You will be connected shortly.");
        }
      });

      // Manager connection interrupted — show reconnecting banner, wait for call:ended
      newSocket.on("manager:reconnecting", () => {
        console.log("⚠️ Manager connection interrupted — grace period started");
        setPeerReconnecting(true);
      });

      // Manager came back within the grace period — clear the banner
      newSocket.on("manager:reconnected", () => {
        console.log("✅ Manager reconnected — call continues");
        setPeerReconnecting(false);
      });

      // Legacy event (kept for backwards-compat with old backend deployments)
      newSocket.on("manager:disconnected", (data) => {
        console.log("❌ Manager disconnected (legacy):", data);
        setPeerReconnecting(false);
        // call:ended will arrive shortly from the backend; nothing else to do here
      });


      // Listen for cancel all requests event - clears all pending verification/change screens
      newSocket.on("cancel:all-requests", (data) => {
        console.log("🚫 All requests cancelled:", data);
        setVerificationRequests({ phone: false, email: false, face: false, signature: false });
        setChangeRequests({
          phoneChangeRequested: false,
          emailChangeRequested: false,
          addressChangeRequested: false
        });
        setFaceVerificationInitiated(false); // Also reset face initiation
      });

      newSocket.on("manager:initiate-face-verification", (data) => {
        console.log("✅ CUSTOMER RECEIVED manager:initiate-face-verification. Data:", data);
        setFaceVerificationInitiated(true);
        // Optionally clear other verification requests if face verification is exclusive
        setVerificationRequests(prev => ({ ...prev, phone: false, email: false, signature: false }));
        setChangeRequests(prev => ({ ...prev, phoneChangeRequested: false, emailChangeRequested: false, addressChangeRequested: false, accountActivationRequested: false }));

        if (newSocket && newSocket.connected) {
          newSocket.emit("customer:face-verification-notification-acknowledged", {
            timestamp: Date.now()
          });
        }
      });

      newSocket.on("customer:face-verified", (data) => {
        console.log("✅ Face verified by manager (Passive/Manual):", data);
        setFaceVerificationInitiated(false);
        // We could add a success toast here if needed
      });

      newSocket.on("customer:phone-verified", (data) => {
        console.log("✅ Phone verified by manager:", data);
        setVerificationRequests(prev => ({ ...prev, phone: false }));
      });

      newSocket.on("customer:email-verified", (data) => {
        console.log("✅ Email verified by manager:", data);
        setVerificationRequests(prev => ({ ...prev, email: false }));
      });

      newSocket.on("otp:resent", (data) => {
        console.log("🔄 OTP resent to customer:", data);
        // We can use a local state or toast to show this
        // For now, let's just log it and maybe add a message to failedMessage in Home.jsx if possible
        // But better is to just let the modal handle its own "Resend" state if it triggered it.
      });

      newSocket.on("requested:phone-verification", (data) => {
        console.log("📱 Manager requested phone verification:", data);
        setFaceVerificationInitiated(false);
        setVerificationRequests({ phone: Date.now(), email: false, face: false, signature: false });
        setChangeRequests({ phoneChangeRequested: false, emailChangeRequested: false, addressChangeRequested: false, accountActivationRequested: false });
      });

      newSocket.on("requested:email-verification", (data) => {
        console.log("📧 Manager requested email verification:", data);
        setFaceVerificationInitiated(false);
        setVerificationRequests({ phone: false, email: Date.now(), face: false, signature: false });
        setChangeRequests({ phoneChangeRequested: false, emailChangeRequested: false, addressChangeRequested: false, accountActivationRequested: false });
        // Store the email so the verify call can include it
        const receivedEmail = data.email || data.customerEmail;
        if (receivedEmail) {
          setCurrentAccountData(prev => ({ ...(prev || {}), email: receivedEmail }));
        }
      });



      newSocket.on("ice_candidate", (data) => {
        console.log("🧊 Received ICE candidate:", data);
      });

      newSocket.on("offer", (data) => {
        console.log("📤 Received offer:", data);
      });

      newSocket.on("answer", (data) => {
        console.log("📥 Received answer:", data);
      });

      newSocket.on("error", (error) => {
        console.error("⚠️ Socket error:", error);
        setConnectionError(error.message || "An error occurred");
      });

      newSocket.on("manager:request-signature-upload", (data) => {
        console.log("✍️ Signature upload requested by manager:", data);
        setVerificationRequests({ phone: false, email: false, face: false, signature: true });
        setChangeRequests({
          phoneChangeRequested: false,
          emailChangeRequested: false,
          addressChangeRequested: false
        });
      });

      newSocket.on("customer:signature-verification-decision", (data) => {
        console.log("✍️ Signature verification decision:", data);
        if (data.decision === 'approve' || data.decision === 'approved') {
          setVerificationRequests(prev => ({ ...prev, signature: false }));
        }
      });

      newSocket.on("requested:phone-change", () => {
        console.log("📱 Phone change requested by manager");
        setVerificationRequests({ phone: false, email: false, face: false, signature: false });
        setChangeRequests({
          phoneChangeRequested: true,
          emailChangeRequested: false,
          addressChangeRequested: false,
          accountActivationRequested: false,
        });
      });

      newSocket.on("requested:email-change", () => {
        console.log("📧 Email change requested by manager");
        setVerificationRequests({ phone: false, email: false, face: false, signature: false });
        setChangeRequests({
          phoneChangeRequested: false,
          emailChangeRequested: true,
          addressChangeRequested: false,
          accountActivationRequested: false,
        });
      });

      newSocket.on("requested:address-change", (data = {}) => {
        console.log("🏠 Address change requested by manager");
        // Store account data so ChangeAddressModal can display and submit the previous address
        if (data.accountData) {
          setCurrentAccountData(prev => ({ ...(prev || {}), ...data.accountData }));
        }
        setVerificationRequests({ phone: false, email: false, face: false, signature: false });
        setChangeRequests({
          phoneChangeRequested: false,
          emailChangeRequested: false,
          addressChangeRequested: true,
          accountActivationRequested: false,
        });
      });

      // Screen sync from manager - customer follows manager's screen
      newSocket.on("customer:screen-sync", (data) => {
        console.log("🖥️ Screen sync from manager:", data);
        setCurrentScreen(data.screen);

        // Store account data from manager
        if (data.accountData) {
          console.log("📋 Received account data:", data.accountData);
          setCurrentAccountData(data.accountData);
        }

        // Map manager screens to customer verification/change states
        const screenMap = {
          'face': { verifications: { phone: false, email: false, face: false, signature: false }, changes: { phoneChangeRequested: false, emailChangeRequested: false, addressChangeRequested: false, accountActivationRequested: false } }, // 'face' screen will now be handled by faceVerificationInitiated
          'signature': { verifications: { phone: false, email: false, face: false, signature: true }, changes: { phoneChangeRequested: false, emailChangeRequested: false, addressChangeRequested: false, accountActivationRequested: false } },
          'phoneChange': { verifications: { phone: false, email: false, face: false, signature: false }, changes: { phoneChangeRequested: true, emailChangeRequested: false, addressChangeRequested: false, accountActivationRequested: false } },
          'emailChange': { verifications: { phone: false, email: false, face: false, signature: false }, changes: { phoneChangeRequested: false, emailChangeRequested: true, addressChangeRequested: false, accountActivationRequested: false } },
          'addressChange': { verifications: { phone: false, email: false, face: false, signature: false }, changes: { phoneChangeRequested: false, emailChangeRequested: false, addressChangeRequested: true, accountActivationRequested: false } },
          'accountActivation': { verifications: { phone: false, email: false, face: false, signature: false }, changes: { phoneChangeRequested: false, emailChangeRequested: false, addressChangeRequested: false, accountActivationRequested: true } },
        };

        const mapping = screenMap[data.screen];
        if (mapping) {
          setVerificationRequests(mapping.verifications);
          setChangeRequests(mapping.changes);
        } else {
          // For unmapped screens (account list, account details, phone, email, etc.)
          // Preserve active phone/email OTP verification — these are triggered by dedicated
          // socket events (requested:phone-verification / requested:email-verification)
          // and should NOT be cleared by screen navigation.
          setVerificationRequests(prev => ({
            ...prev,
            face: false,
            signature: false,
          }));
          setChangeRequests({ phoneChangeRequested: false, emailChangeRequested: false, addressChangeRequested: false, accountActivationRequested: false });
        }
      });

      // Email change OTP sent
      newSocket.on("customer:email-change-otp-sent", (data) => {
        console.log("📧 Email change OTP sent:", data);
      });

      // Address change OTP sent
      newSocket.on("customer:address-change-otp-sent", (data) => {
        console.log("🏠 Address change OTP sent:", data);
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
        if (data.senderRole === 'manager') {
          setIsManagerTyping(data.isTyping);
        }
      });

      // Hold events
      newSocket.on("call:on-hold", (data) => {
        console.log("⏸️ Call put on hold:", data);
        setIsOnHold(true);
        setHoldInfo({
          managerName: data.managerName,
          reason: data.reason,
          timestamp: data.timestamp
        });
      });

      newSocket.on("call:resumed", (data) => {
        console.log("▶️ Call resumed:", data);
        setIsOnHold(false);
        setHoldInfo(null);
      });

      setSocket(newSocket);
      return true;
    } catch (error) {
      console.error("Failed to setup Socket.io:", error);
      setConnectionError("Failed to establish connection.");
      setIsConnected(false);
      setCallStatus("idle");
      return false;
    }
  };

  const sendMessage = (eventName, data) => {
    if (socket && socket.connected) {
      socket.emit(eventName, data);
    } else {
      console.error("Socket.io is not connected");
    }
  };

  const attemptReconnect = (phoneNumber) => {
    if (!isConnected && phoneNumber) {
      reconnectInterval.current = setInterval(() => {
        console.log("♻️ Attempting Socket.io reconnect...");
        initiateCall(phoneNumber);
      }, 5000);
    }
  };

  const acceptCall = () => {
    if (socket && socket.connected && incomingCall) {
      sendMessage("call:accept", {
        timestamp: new Date().toISOString()
      });
      setCallStatus("connected");
    }
  };

  const rejectCall = () => {
    if (socket && socket.connected && incomingCall) {
      sendMessage("call:reject", {
        timestamp: new Date().toISOString()
      });
      setIncomingCall(null);
      setCallStatus("idle");
    }
  };

  const cancelCall = () => {
    if (socket && socket.connected && callStatus === "connecting") {
      console.log("🚫 Cancelling outgoing call...");
      sendMessage("call:cancel", {
        timestamp: new Date().toISOString()
      });
    }
  };

  const endCall = () => {
    if (socket && socket.connected) {
      if (callStatus === "connecting") {
        cancelCall();
      } else {
        sendMessage("call:end", {
          timestamp: new Date().toISOString()
        });

        // Set status to "ended" immediately for UI feedback
        // DO NOT disconnect socket here - wait for backend to send "call:ended" event
        // The "call:ended" handler will clean up and show feedback screen
        setCallStatus("ended");
        return; // Exit early - cleanup will happen in call:ended handler
      }
    }

    // Only disconnect if we're canceling or socket is already disconnected
    if (socket) {
      socket.disconnect();
    }
    setSocket(null);

    setCallStatus("idle");
    setIncomingCall(null);
    setCallData(null);
    setIsConnected(false);
    setChatMessages([]);
    setIsManagerTyping(false);
    setIsOnHold(false);
    setHoldInfo(null);
    setInQueue(false);
    setQueuePosition(null);
    setQueueMessage(null);
    clearInterval(reconnectInterval.current);
  };

  const leaveQueue = () => {
    console.log("🚫 Customer leaving queue");

    if (socket && socket.connected) {
      socket.emit("queue:leave", {
        timestamp: new Date().toISOString()
      });
      socket.disconnect();
    }
    setSocket(null);

    setCallStatus("idle");
    setIncomingCall(null);
    setCallData(null);
    setIsConnected(false);
    setInQueue(false);
    setQueuePosition(null);
    setQueueMessage(null);
    setChatMessages([]);
    setIsManagerTyping(false);
    setIsOnHold(false);
    setHoldInfo(null);
    setVerificationRequests({ phone: false, email: false, face: false, signature: false });
    setChangeRequests({
      phoneChangeRequested: false,
      emailChangeRequested: false,
      addressChangeRequested: false
    });
    clearInterval(reconnectInterval.current);
  };

  const sendChatMessage = (message) => {
    if (socket && socket.connected) {
      socket.emit("chat:send", {
        message,
        timestamp: Date.now()
      });
    }
  };

  const customerStartCapture = () => {
    if (socket && socket.connected) {
      socket.emit("customer:start-capture", {
        timestamp: Date.now()
      });
    }
  };

  const customerCancelFaceVerification = () => {
    if (socket && socket.connected) {
      socket.emit("customer:cancel-face-verification-acknowledgement", {
        timestamp: Date.now()
      });
      setFaceVerificationInitiated(false); // Reset this state
    }
  };

  const sendTypingIndicator = (isTyping) => {
    if (socket && socket.connected) {
      socket.emit("chat:typing", { isTyping });
    }
  };

  const confirmPhoneVerification = () => {
    if (socket && socket.connected && verificationRequests.phone) {
      sendMessage("customer:phone-verified", {
        timestamp: new Date().toISOString()
      });
      setVerificationRequests(prev => ({ ...prev, phone: false }));
      return true;
    }
    return false;
  };

  const confirmEmailVerification = () => {
    if (socket && socket.connected && verificationRequests.email) {
      sendMessage("customer:email-verified", {
        timestamp: new Date().toISOString()
      });
      setVerificationRequests(prev => ({ ...prev, email: false }));
      return true;
    }
    return false;
  };

  const acknowledgePhoneChangeRequest = () => {
    setChangeRequests(prev => ({
      ...prev,
      phoneChangeRequested: false
    }));
  };

  const acknowledgeEmailChangeRequest = () => {
    setChangeRequests(prev => ({
      ...prev,
      emailChangeRequested: false
    }));
  };

  const acknowledgeAddressChangeRequest = () => {
    setChangeRequests(prev => ({
      ...prev,
      addressChangeRequested: false
    }));
  };

  const acknowledgeAccountActivationRequest = () => {
    setChangeRequests(prev => ({
      ...prev,
      accountActivationRequested: false
    }));
  };

  useEffect(() => {
    return () => {
      if (socket) {
        console.log("🔴 Cleaning up Socket.io...");
        socket.disconnect();
        clearInterval(reconnectInterval.current);
      }
    };
  }, []);

  const contextValue = {
    socket,
    isConnected,
    connectionError,
    incomingCall,
    callStatus,
    callData,
    availableManagers,
    faceVerificationInitiated, // Add new state to context
    setFaceVerificationInitiated, // Add setter
    verificationRequests,
    setVerificationRequests, // Add setter
    changeRequests,
    chatMessages,
    isManagerTyping,
    isOnHold,
    holdInfo,
    currentScreen,
    currentAccountData,
    inQueue,
    queuePosition,
    queueMessage,
    initiateCall,
    acceptCall,
    rejectCall,
    cancelCall,
    endCall,
    leaveQueue,
    confirmPhoneVerification,
    confirmEmailVerification,
    acknowledgePhoneChangeRequest,
    acknowledgeEmailChangeRequest,
    acknowledgeAddressChangeRequest,
    acknowledgeAccountActivationRequest,
    sendChatMessage,
    sendTypingIndicator,
    customerStartCapture, // Add new function to context
    customerCancelFaceVerification, // Add new function to context
    peerReconnecting,
    sendEvent: sendMessage
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

WebSocketProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};