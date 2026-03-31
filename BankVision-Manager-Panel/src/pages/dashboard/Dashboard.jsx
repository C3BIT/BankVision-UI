import { Container, Box, Grid, Paper, Typography, Snackbar, Alert, Badge, Chip } from "@mui/material";
import { Queue as QueueIcon, NotificationsActive, Phone } from "@mui/icons-material";
import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchCustomerDetailsByAccount, setSelectedAccountNumber, clearSelectedAccountNumber } from "../../redux/customer/customerAccountsSlice";
// REMOVED: CallingScreen import - queue-only design, no more popups
import { useWebSocket } from "../../providers/WebSocketProvider";
import OpenViduMeetComponent from "../../components/OpenViduMeetComponent/OpenViduMeetComponent";
import ChatBox from "../../components/ChatBox/ChatBox";
import CallTimer from "../../components/CallTimer/CallTimer";
import EmotionDisplay from "../../components/EmotionDisplay";
import WhisperChat from "../../components/WhisperChat";
import CallQueueTable from "../../components/CallQueueTable/CallQueueTable";
import ManagerCard from "../../components/ManagerCard/ManagerCard";
import PerformanceOverview from "../../components/PerformanceOverview/PerformanceOverview";
import ChangeRequestPanel from "../../components/ChangeRequestPanel/ChangeRequestPanel";
import VideoCallLayout from "../../components/VideoCallLayout/VideoCallLayout";
import VideoCallSidebarNew from "../../components/VideoCallSidebar/VideoCallSidebarNew";
import PIPVideo from "../../components/PIPVideo/PIPVideo";
import ChatButton from "../../components/ChatButton/ChatButton";
import VideoControls from "../../components/VideoControls/VideoControls";
import PostCallReportModal from "../../components/PostCallReportModal/PostCallReportModal";
import CollaborativeWhiteboard from "../../components/CollaborativeWhiteboard/CollaborativeWhiteboard";

const Dashboard = () => {
  const dispatch = useDispatch();
  const [isCallActive, setIsCallActive] = useState(false);
  // REMOVED: showCallingScreen state - queue-only design, no more popups
  const [callTarget, setCallTarget] = useState({
    name: "Customer",
    image: import.meta.env.VITE_DEFAULT_AVATAR || "https://cdn.pixabay.com/photo/2014/04/03/10/44/avatar-311292_1280.png",
  });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [callStartTime, setCallStartTime] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(true);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [customerVideoElement, setCustomerVideoElement] = useState(null);
  const [serviceResetKey, setServiceResetKey] = useState(0);

  // Ref to control OpenVidu video component
  const openViduRef = useRef(null);

  // Get customer video element for passive face verification
  useEffect(() => {
    if (!isCallActive) {
      setCustomerVideoElement(null);
      return;
    }

    // Try to find customer video element in DOM directly
    const findCustomerVideo = () => {
      const videoElements = document.querySelectorAll('video');
      for (const videoEl of videoElements) {
        // Look for video element that has actual video data and is playing
        if (videoEl.videoWidth > 0 &&
          videoEl.videoHeight > 0 &&
          !videoEl.paused &&
          !videoEl.ended &&
          videoEl.readyState >= 2) {
          // Check if it's not the local video (manager's own video)
          // Customer video is usually the remote participant
          const stream = videoEl.srcObject;
          if (stream && stream.getVideoTracks().length > 0) {
            console.log('✅ Found customer video element:', {
              videoWidth: videoEl.videoWidth,
              videoHeight: videoEl.videoHeight,
              readyState: videoEl.readyState
            });
            setCustomerVideoElement(videoEl);
            return;
          }
        }
      }
    };

    // Try immediately
    findCustomerVideo();

    // Also try via ref method
    const interval = setInterval(() => {
      findCustomerVideo();

      if (openViduRef.current?.getCustomerVideoElement) {
        const videoEl = openViduRef.current.getCustomerVideoElement();
        if (videoEl && videoEl.videoWidth > 0 && videoEl.videoHeight > 0) {
          console.log('✅ Got customer video via ref method');
          setCustomerVideoElement(videoEl);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallActive]);

  const { manager } = useSelector((state) => state.auth);
  const { accountDetails } = useSelector((state) => state.customerAccounts);

  const {
    // REMOVED: incomingCall, acceptCall, rejectCall - queue-only design
    socket,
    callStatus,
    currentCall,
    endCall: wsEndCall,
    requestPhoneVerification,
    requestEmailVerification,
    phoneVerified,
    emailVerified,
    verificationPending,
    requestPhoneChange,
    faceVerificationStatus,
    chatMessages,
    isCustomerTyping,
    sendChatMessage,
    sendTypingIndicator,
    agentStatus,
    callQueue,
    queueStats,
    setAgentStatusValue,
    pickCallFromQueue,
    refreshQueue,
    queueNotification,
    clearQueueNotification,
    pendingPostCallReport,
    clearPostCallReportAndGoIdle,
    // Face API (client-side)
    customerEmotions,
    faceApiReady,
    // Whisper/Supervisor
    whisperMessages,
    supervisorMonitoring,
    isWhisperActive,
    replyToWhisper,
  } = useWebSocket();

  // REMOVED: useEffect for incomingCall/showCallingScreen - queue-only design

  useEffect(() => {
    console.log('📊 callStatus changed to:', callStatus);
    if (callStatus === 'in-call') {
      console.log('✅ Setting isCallActive = true');
      setIsCallActive(true);
      setCallStartTime(Date.now()); // Start timer when call begins

      // Get customer video element after a short delay to ensure video is ready
      setTimeout(() => {
        if (openViduRef.current?.getCustomerVideoElement) {
          const videoElement = openViduRef.current.getCustomerVideoElement();
          setCustomerVideoElement(videoElement);
        }
      }, 2000);
    } else if (callStatus === 'ended' || callStatus === 'idle') {
      console.log(`⏹️ Call ${callStatus}, setting isCallActive = false`);
      setIsCallActive(false);
      setCustomerVideoElement(null);
      setSelectedAccount(null);
      dispatch(clearSelectedAccountNumber());
    }
  }, [callStatus, dispatch]);

  useEffect(() => {
    if (currentCall) {
      console.log('📞 Current call data:', currentCall);

      // Get customer name - prioritize customerName from call data, then from accountDetails, fallback to "Customer"
      let customerName = currentCall.customerName;
      if (!customerName && accountDetails?.name) {
        customerName = accountDetails.name;
      }

      setCallTarget({
        name: customerName || "Customer", // Never use phone number as name
        phone: currentCall.customerPhone || currentCall.customerId,
        email: currentCall.customerEmail || null,
        room: currentCall.callRoom,
        image:
          currentCall.customerImage ||
          import.meta.env.VITE_DEFAULT_AVATAR ||
          "https://cdn.pixabay.com/photo/2014/04/03/10/44/avatar-311292_1280.png",
      });
    }
  }, [currentCall, accountDetails]);

  // Fetch account details when manager selects an account in the sidebar
  useEffect(() => {
    if (selectedAccount && currentCall) {
      const phone = currentCall.customerId || currentCall.customerPhone;
      dispatch(fetchCustomerDetailsByAccount({ accountNumber: selectedAccount, phone }));
    }
  }, [selectedAccount, currentCall, dispatch]);

  // REMOVED: handleAccept, handleReject, handleClose - queue-only design

  const handleEnd = () => {
    wsEndCall();
    setIsCallActive(false);
    setCallStartTime(null);
    setAudioEnabled(true);
    setVideoEnabled(true);
    setWhiteboardOpen(false);
    console.log("Call ended");
  };

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadChatCount(0);
    }
  };

  // Track unread messages when chat is closed
  useEffect(() => {
    if (!isChatOpen && chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      if (lastMessage.senderRole === 'customer') {
        setUnreadChatCount(prev => prev + 1);
      }
    }
  }, [chatMessages, isChatOpen]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (isChatOpen) {
      setUnreadChatCount(0);
    }
  }, [isChatOpen]);

  // Reset chat state when call ends
  useEffect(() => {
    if (!isCallActive) {
      setIsChatOpen(false);
      setUnreadChatCount(0);
    }
  }, [isCallActive]);

  // Reset media states when call ends
  useEffect(() => {
    if (!isCallActive) {
      setAudioEnabled(true);
      setVideoEnabled(true);
      setSpeakerEnabled(true);
      setWhiteboardOpen(false);
    }
  }, [isCallActive]);

  // Listen for whiteboard:toggle from customer to auto-open/close
  useEffect(() => {
    if (!socket || !isCallActive) return;

    const handleWhiteboardToggle = (data) => {
      setWhiteboardOpen(data.open);
    };

    socket.on('whiteboard:toggle', handleWhiteboardToggle);
    return () => socket.off('whiteboard:toggle', handleWhiteboardToggle);
  }, [socket, isCallActive]);

  const handleStatusChange = (newStatus) => {
    setAgentStatusValue(newStatus);
  };

  const handlePickCall = (customerPhone) => {
    pickCallFromQueue(customerPhone);
  };

  return (
    <>
      {/* Post-call agent report: required after every call */}
      <PostCallReportModal
        open={Boolean(pendingPostCallReport)}
        callLogId={pendingPostCallReport?.callLogId}
        referenceNumber={pendingPostCallReport?.referenceNumber}
        onSubmitted={clearPostCallReportAndGoIdle}
        onClose={clearPostCallReportAndGoIdle}
      />
      {!isCallActive ? (
        <Container maxWidth="xl">
          {/* New Dashboard Layout */}
          <Box sx={{ display: 'flex', gap: 3, mt: 3 }}>
            {/* Left Side - Call Queue (70%) */}
            <Box sx={{ flex: '0 0 70%' }}>
              <CallQueueTable
                queue={callQueue}
                onAcceptCall={handlePickCall}
                onRefresh={refreshQueue}
                loading={false}
                disabled={agentStatus !== 'online' && agentStatus !== 'busy'}
              />
            </Box>

            {/* Right Side - Manager Card & Performance (30%) */}
            <Box sx={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Manager Card */}
              <ManagerCard
                currentStatus={agentStatus}
                onStatusChange={handleStatusChange}
              />

              {/* Performance Overview */}
              <PerformanceOverview managerEmail={manager?.email} />
            </Box>
          </Box>
        </Container>
      ) : (
        <Box sx={{ mt: -4, mb: -4 }}>{/* negative margin cancels AppLayout pt/pb */}
        <VideoCallLayout
          leftContent={
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              {/* Call Timer Overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  zIndex: 10,
                }}
              >
                <CallTimer
                  startTime={callStartTime}
                  isActive={isCallActive}
                  variant="compact"
                />
              </Box>

              {/* Customer Emotion Display */}
              {customerEmotions && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 80,
                    left: 16,
                    zIndex: 10,
                    maxWidth: 280,
                  }}
                >
                  <EmotionDisplay
                    emotions={customerEmotions}
                    title="Customer Mood"
                    showBreakdown={true}
                  />
                </Box>
              )}

              {/* Main Customer Video */}
              <OpenViduMeetComponent
                ref={openViduRef}
                roomName={callTarget.room || "default-room"}
                displayName="Manager"
                onLeave={handleEnd}
                isIncoming={false}
                showInHalfScreen={true}
                showControls={false}
                onAudioStateChange={setAudioEnabled}
                onVideoStateChange={setVideoEnabled}
                onSpeakerStateChange={setSpeakerEnabled}
              />

              {/* Collaborative Whiteboard Overlay */}
              <CollaborativeWhiteboard
                open={whiteboardOpen}
                onClose={() => {
                  setWhiteboardOpen(false);
                  if (socket) socket.emit('whiteboard:toggle', { open: false });
                }}
                socket={socket}
                role="manager"
              />
            </Box>
          }
          rightContent={
            <VideoCallSidebarNew
              customerPhone={callTarget?.phone || currentCall?.customerId}
              customerName={callTarget?.name}
              customerEmail={callTarget?.email || currentCall?.customerEmail}
              verificationInfo={currentCall?.verificationInfo || null}
              onAccountSelect={(accountNumber) => {
                setSelectedAccount(accountNumber);
                dispatch(setSelectedAccountNumber(accountNumber));
              }}
              accountDetails={selectedAccount ? accountDetails : null}
              customerVideoElement={customerVideoElement}
              callStartTime={callStartTime}
              isCallActive={isCallActive}
              serviceResetKey={serviceResetKey}
            />
          }
          overlayContent={null}
          controls={
            <VideoControls
              audioEnabled={audioEnabled}
              videoEnabled={videoEnabled}
              speakerEnabled={speakerEnabled}
              whiteboardOpen={whiteboardOpen}
              onToggleAudio={() => openViduRef.current?.toggleAudio()}
              onToggleVideo={() => openViduRef.current?.toggleVideo()}
              onToggleSpeaker={() => openViduRef.current?.toggleSpeaker()}
              onToggleWhiteboard={() => {
                setWhiteboardOpen(prev => {
                  const next = !prev;
                  if (socket) socket.emit('whiteboard:toggle', { open: next });
                  return next;
                });
              }}
              onEndCall={() => openViduRef.current?.leaveCall()}
            />
          }
          chatButton={
            <ChatButton
              unreadCount={unreadChatCount}
              onClick={handleToggleChat}
              isChatOpen={isChatOpen}
            />
          }
        />
        </Box>
      )}

      {/* REMOVED: CallingScreen component - queue-only design, no more popups */}

      {isCallActive && (
        <ChatBox
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          onTyping={sendTypingIndicator}
          isTyping={isCustomerTyping}
          customerName={callTarget?.name || "Customer"}
          isOpen={isChatOpen}
          onToggle={handleToggleChat}
          unreadCount={unreadChatCount}
        />
      )}

      {/* Whisper Chat - Supervisor Private Communication */}
      <WhisperChat
        supervisorMonitoring={supervisorMonitoring}
        whisperMessages={whisperMessages}
        isWhisperActive={isWhisperActive}
        onReply={replyToWhisper}
        isCallActive={isCallActive}
      />

      {/* Queue Badge - Shows during active call */}
      {isCallActive && callQueue.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            right: 20,
            zIndex: 1000,
            backgroundColor: 'warning.main',
            color: 'white',
            borderRadius: 2,
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            boxShadow: 3,
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { transform: 'scale(1)' },
              '50%': { transform: 'scale(1.05)' },
              '100%': { transform: 'scale(1)' },
            }
          }}
        >
          <Badge badgeContent={callQueue.length} color="error">
            <QueueIcon />
          </Badge>
          <Typography variant="body2" fontWeight="bold">
            {callQueue.length} waiting
          </Typography>
        </Box>
      )}

      {/* Queue Notification Snackbar - Enhanced with sound icon and customer details */}
      <Snackbar
        open={Boolean(queueNotification)}
        autoHideDuration={8000}
        onClose={clearQueueNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{ mt: isCallActive ? 12 : 0 }}
      >
        <Alert
          onClose={clearQueueNotification}
          severity="warning"
          variant="filled"
          icon={<NotificationsActive sx={{ animation: 'ring 0.5s ease-in-out 3', '@keyframes ring': { '0%': { transform: 'rotate(0)' }, '25%': { transform: 'rotate(15deg)' }, '50%': { transform: 'rotate(-15deg)' }, '75%': { transform: 'rotate(10deg)' }, '100%': { transform: 'rotate(0)' } } }} />}
          sx={{ width: '100%', minWidth: 320 }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Phone sx={{ fontSize: 16 }} />
              <Typography variant="body2" fontWeight="bold">
                New Call in Queue
              </Typography>
              {queueNotification?.isGuest && (
                <Chip size="small" label="Guest" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: 'rgba(255,255,255,0.3)', color: 'white' }} />
              )}
            </Box>
            <Typography variant="caption">
              {queueNotification?.customerName || queueNotification?.customerPhone} — Position #{queueNotification?.position}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Change Request Panel - Manager Approval */}
      {isCallActive && currentCall && (
        <ChangeRequestPanel
          customerPhone={currentCall.customerId || callTarget?.name}
          customerName={callTarget?.name}
          onApprovalComplete={() => setServiceResetKey(prev => prev + 1)}
        />
      )}
    </>
  );
};

export default Dashboard;
