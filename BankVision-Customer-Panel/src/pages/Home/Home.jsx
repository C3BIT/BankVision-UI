import { API_URL } from '../../config.js';
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useDispatch } from "react-redux";
import { resetVerification } from "../../redux/auth/customerSlice";
import { Box, Paper, Typography, CircularProgress, Alert, Grid, Container, IconButton, Fab, Badge, Dialog, DialogContent } from "@mui/material";
import { Chat as ChatIcon, Close as CloseIcon } from "@mui/icons-material";
import { apiClient } from "../../services/apiCaller";
import StartVerification from "../../components/StartVerification/StartVerification";
import BrandLogo from "../../components/BrandLogo/BrandLogo";
import VideoCallControls from "../../components/VideoCallControls/VideoCallControls";
import DocumentPanel from "../../components/DocumentPanel/DocumentPanel";
import VerificationModal from "../../components/VerificationModal/VerificationModal";
import ChangeContactModal from "../../components/ChangeContactModal/ChangeContactModal";
import ChangeAddressModal from "../../components/ChangeAddressModal/ChangeAddressModal";
import DormantAccountActivationRequest from "../../components/DormantAccountActivationRequest/DormantAccountActivationRequest";
import FeedbackScreen from "../../components/FeedbackScreen/FeedbackScreen";
import { useWebSocket } from "../../context/WebSocketContext";
import CallModal from './../CallModal/CallModal';
import OpenViduMeetComponent from "../../components/OpenViduMeetComponent/OpenViduMeetComponent";
import ChatBox from "../../components/ChatBox/ChatBox";
import CallTimer from "../../components/CallTimer/CallTimer";
import CaptureCustomerImage from "../../components/CaptureCustomerImage/CaptureCustomerImage";
import SignatureUpload from "../../components/SignatureUpload/SignatureUpload";
import CollaborativeWhiteboard from "../../components/CollaborativeWhiteboard/CollaborativeWhiteboard";
import { colors } from "../../theme/tokens";

const Home = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  // MTB Neo SSO handoff: 'idle' (no handoff params) | 'authenticating' | 'failed'
  const [ssoStatus, setSsoStatus] = useState('idle');
  const [phone, setPhone] = useState(""); // Will be set from verification
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [failedMessage, setFailedMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastCountedMessageId, setLastCountedMessageId] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);
  const [showDocPanel, setShowDocPanel] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [callLogId, setCallLogId] = useState(null);
  const [managerEmail, setManagerEmail] = useState(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [verificationInfo, setVerificationInfo] = useState(null); // Store verification info

  // Change modals state
  const [showChangeContactModal, setShowChangeContactModal] = useState(false);
  const [changeContactType, setChangeContactType] = useState('phone'); // 'phone' or 'email'
  const [showChangeAddressModal, setShowChangeAddressModal] = useState(false);
  const [showDormantActivationModal, setShowDormantActivationModal] = useState(false);
  // Once the customer submits a change request, ignore further re-syncs of the
  // *same* pending request (e.g. a manager reconnect re-broadcasting its current
  // screen via customer:screen-sync) so an already-submitted modal doesn't
  // silently reopen with stale local form state while awaiting the manager's
  // decision. Cleared when the request flag itself clears (approved/rejected/cancelled).
  const addressChangeSubmittedRef = useRef(false);
  const phoneChangeSubmittedRef = useRef(false);
  const emailChangeSubmittedRef = useRef(false);
  // const [showFaceCapture, setShowFaceCapture] = useState(false); // No longer needed as faceVerificationInitiated handles visibility
  const [faceCaptureKey, setFaceCaptureKey] = useState(0); // Force remount on retake
  const [showSignatureUpload, setShowSignatureUpload] = useState(false);

  // Approval feedback
  const [showApprovalFeedback, setShowApprovalFeedback] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');

  // Ref for OpenViduMeetComponent to control video/audio
  const videoComponentRef = useRef(null);
  const approvalFeedbackTimerRef = useRef(null);

  const {
    socket,
    initiateCall,
    endCall,
    cancelCall,
    connectionError,
    callStatus,
    callData,
    availableManagers,
    faceVerificationInitiated, // New state
    setFaceVerificationInitiated, // New setter
    verificationRequests,
    setVerificationRequests, // New setter
    verificationChallengeId, // Challenge id relayed with the manager verification request
    confirmPhoneVerification,
    confirmEmailVerification,
    changeRequests,
    acknowledgePhoneChangeRequest,
    acknowledgeEmailChangeRequest,
    acknowledgeAddressChangeRequest,
    acknowledgeAccountActivationRequest,
    chatMessages,
    isManagerTyping,
    sendChatMessage,
    sendTypingIndicator,
    customerCancelFaceVerification, // New function
    currentAccountData,
    inQueue,
    queuePosition,
    queueMessage,
    leaveQueue
  } = useWebSocket();

  const handleVerificationComplete = async (verificationData) => {
    console.log('✅ Verification completed callback received:', verificationData);

    if (!verificationData) {
      console.error('❌ No verification data provided');
      setFailedMessage('Verification data missing. Please try again.');
      return;
    }

    setVerificationInfo(verificationData);

    // Determine phone number for call initiation
    let customerPhone = null;

    if (verificationData.method === 'phone') {
      customerPhone = verificationData.phoneOrEmail;
      console.log('📞 Using phone number from verification:', customerPhone);
    } else {
      // For email verification, use email as identifier
      // If phone is not found in database, that's fine - proceed anyway
      console.log('📧 Email verification - using email as identifier');
      customerPhone = verificationData.phoneOrEmail; // Use email as phone identifier for call initiation
      console.log('📧 Using email as customer identifier:', customerPhone);
    }

    if (!customerPhone) {
      console.error('❌ No customer identifier determined');
      setFailedMessage('Unable to determine customer identifier. Please try again.');
      return;
    }

    setPhone(customerPhone);
    console.log('📞 Setting customer identifier and initiating call...');

    // Now initiate the call with verification info
    // Customer lookup is optional - if not found, manager will see "no data found"
    await handleStartCall(customerPhone, verificationData);
  };

  const handleStartCall = async (customerPhone, verificationData) => {
    try {
      console.log('🚀 Starting call initiation process...');
      console.log('📞 Customer identifier:', customerPhone);
      console.log('📋 Verification data:', verificationData);

      // Try to look up customer in database (optional - not blocking)
      
      let customerFound = false;
      let accountCount = 0;

      try {
        console.log('🔍 Checking customer in database (optional):', customerPhone);
        const response = await apiClient.post(`${API_URL}/customer/find-phone`, {
          phone: customerPhone
        });

        if (response.data && response.data.data && response.data.data.length > 0) {
          customerFound = true;
          accountCount = response.data.data.length;
          console.log('✅ Customer found in database, accounts:', accountCount);
        } else {
          console.log('ℹ️ Customer not found in database - proceeding anyway');
        }
      } catch (error) {
        // Customer lookup failed - that's fine, proceed anyway
        console.log('ℹ️ Customer lookup failed (non-blocking):', error.message);
        console.log('ℹ️ Proceeding with call - manager will see "no data found"');
      }

      // Always proceed with call initiation regardless of database lookup result
      // Manager panel will show "no data found" if customer is not in database
      console.log('📞 Calling initiateCall with:', { customerPhone, verificationData });
      const success = initiateCall(customerPhone, verificationData);
      console.log('📞 initiateCall returned:', success);

      if (success) {
        // Do NOT open the call UI here. initiateCall only *starts* the socket
        // handshake; the customer is not really in a call until the socket
        // AUTHENTICATES (valid OTP-minted customer_auth_token) and the server
        // enqueues them, which flips callStatus to "queued" and opens the modal
        // in the effect above. Opening it on this synchronous return let a
        // manipulated /otp/verify-phone response (faked 200) advance the UI
        // without a verified session. The socket's connect_error handler shows
        // the error if auth fails.
        console.log('✅ Call handshake started; waiting for server-confirmed enqueue');
        setFailedMessage("");
      } else {
        console.error('❌ Call initiation failed');
        setFailedMessage("Failed to initiate call. Please try again.");
      }
    } catch (error) {
      console.error('❌ Error in handleStartCall:', error);
      // Retry starting the handshake, but still gate the UI on the
      // server-confirmed "queued" state (do not open the modal here).
      console.log('⚠️ Retrying call handshake after error');
      const success = initiateCall(customerPhone, verificationData);
      if (success) {
        setFailedMessage("");
      } else {
        setFailedMessage("Unable to initiate call. Please try again or contact support.");
      }
    }
  };

  // MTB Neo SSO handoff: Neo redirects the customer's browser here with
  // RSA-encrypted params. Exchange them for a customer_auth_token session
  // and skip straight into the call queue, bypassing StartVerification.
  useEffect(() => {
    const authKey = searchParams.get('auth_key');
    if (!authKey) return;

    const sessionId = searchParams.get('session_id');
    const custMob = searchParams.get('cust_mob');
    const custName = searchParams.get('cust_name');
    const custEmail = searchParams.get('cust_email');

    // Strip the encrypted payload from the visible URL/history immediately,
    // before the exchange even completes, so it never lingers in browser
    // history or gets forwarded via a Referer header on later navigation.
    window.history.replaceState({}, document.title, window.location.pathname);

    setSsoStatus('authenticating');

    // Deliberately bypasses apiClient: /sso is excluded from the backend's
    // Base64 codec (it must speak plain JSON to match MTB Neo's contract),
    // so apiClient's request interceptor would wrap this body in a way the
    // backend won't decode.
    axios
      .post(
        `${API_URL}/sso/mtb-neo/authenticate`,
        {
          auth_key: authKey,
          session_id: sessionId,
          cust_mob: custMob,
          cust_name: custName,
          cust_email: custEmail || undefined,
        },
        { withCredentials: true, headers: { 'Content-Type': 'application/json' } }
      )
      .then((response) => {
        const customer = response.data?.data?.customer;
        if (!customer?.mobile) {
          throw new Error('Malformed SSO response');
        }
        setSsoStatus('idle');
        handleVerificationComplete({ method: 'phone', phoneOrEmail: customer.mobile });
      })
      .catch((error) => {
        console.error('❌ MTB Neo SSO authentication failed:', error);
        setSsoStatus('failed');
      });
    // Runs once on mount only — deliberately ignores exhaustive-deps since
    // handleVerificationComplete is stable for the lifetime of this effect
    // and re-running on every render would repeat a single-use exchange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhoneVerificationOtp = async (otp) => {
    try {
      setOtpVerifyLoading(true);

      if (!socket) {
        setOtpVerifyLoading(false);
        throw new Error('Connection lost. Please try again.');
      }
      
      const response = await apiClient.post(`${API_URL}/otp/verify-phone`, {
        phone: phone,
        otp: otp,
        challengeId: verificationChallengeId,
      });

      if (response.data.status === 'success') {
        setOtpSuccess(true);
        // Notify manager that phone is verified
        socket.emit('customer:phone-verified', {
          phone: phone,
          verified: true
        });
        // Clear the manager-initiated request flag so the modal closes
        setVerificationRequests(prev => ({ ...prev, phone: false }));

        // Wait a moment to show success state
        setTimeout(() => {
          setShowOtpModal(false);
          setOtpSuccess(false);
          setOtpVerifyLoading(false);
        }, 1000);
      } else {
        setOtpVerifyLoading(false);
        throw new Error('Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      const rawMsg = error.response?.data?.message;
      const msg = (typeof rawMsg === 'string' ? rawMsg : rawMsg?.title) || error.message || 'Invalid OTP. Please try again.';
      setFailedMessage(msg);
      setOtpVerifyLoading(false);
      throw new Error(msg);
    }
  };

  const handleEmailVerificationOtp = async (otp) => {
    try {
      setOtpVerifyLoading(true);

      if (!socket) {
        setOtpVerifyLoading(false);
        throw new Error('Connection lost. Please try again.');
      }

      // Verify email OTP and notify manager
      
      const response = await apiClient.post(`${API_URL}/otp/verify-email`, {
        email: currentAccountData?.email || '',
        otp: otp,
        challengeId: verificationChallengeId,
      });

      if (response.data.status === 'success') {
        setOtpSuccess(true);
        // Notify manager that email is verified
        socket.emit('customer:email-verified', {
          phone: phone,
          email: currentAccountData?.email || '',
          verified: true
        });
        // Clear the manager-initiated request flag so the modal closes
        setVerificationRequests(prev => ({ ...prev, email: false }));

        // Wait a moment to show success state
        setTimeout(() => {
          setShowOtpModal(false);
          setOtpSuccess(false);
          setOtpVerifyLoading(false);
          setChangeContactType('phone'); // Reset
        }, 1000);
      } else {
        setOtpVerifyLoading(false);
        throw new Error('Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      const rawMsg = error.response?.data?.message;
      const msg = (typeof rawMsg === 'string' ? rawMsg : rawMsg?.title) || error.message || 'Invalid OTP. Please try again.';
      setFailedMessage(msg);
      setOtpVerifyLoading(false);
      throw new Error(msg);
    }
  };

  const handleResendPhoneOtp = async () => {
    if (!socket) return;
    try {
      console.log('📤 Requesting phone OTP resend via socket...');
      socket.emit('resend:otp', { type: 'phone', target: phone });
      setFailedMessage(''); // Clear any previous errors
    } catch (error) {
      console.error('❌ Error resending phone OTP:', error);
      setFailedMessage('Failed to resend OTP. Please try again.');
      throw error;
    }
  };

  const handleResendEmailOtp = async () => {
    if (!socket) return;
    try {
      console.log('📤 Requesting email OTP resend via socket...');
      socket.emit('resend:otp', { type: 'email', target: currentAccountData?.email || '' });
      setFailedMessage(''); // Clear any previous errors
    } catch (error) {
      console.error('❌ Error resending email OTP:', error);
      setFailedMessage('Failed to resend OTP. Please try again.');
      throw error;
    }
  };

  const handleOtpClose = () => {
    // Notify manager that customer cancelled OTP verification
    if (socket) {
      const verificationType = changeContactType === 'email' ? 'email' : 'phone';
      socket.emit('customer:verification-cancelled', {
        phone: phone,
        verificationType: verificationType
      });
      console.log(`🚫 Customer cancelled ${verificationType} verification`);
    }

    setShowOtpModal(false);
    setOtpVerifyLoading(false);
    setOtpSuccess(false);
    setFailedMessage(''); // Clear error message

    // CRITICAL: Reset the global verification request state so it can be triggered again
    if (setVerificationRequests) {
      setVerificationRequests(prev => ({
        ...prev,
        phone: false,
        email: false
      }));
    }
  };

  // Change contact handlers
  const handleChangeContactSubmit = async (contactValue) => {
    try {
      // Customer has submitted to manager for approval
      // Just close modal and wait for manager to approve
      if (changeContactType === 'email') {
        emailChangeSubmittedRef.current = true;
      } else {
        phoneChangeSubmittedRef.current = true;
      }
      setShowChangeContactModal(false);

      // Note: Customer data is already sent via socket in ChangeContactModal
      // Manager will review and approve, then backend will update
    } catch (error) {
      console.error('Error submitting change request:', error);
    }
  };

  const handleChangeContactClose = () => {
    setShowChangeContactModal(false);
  };

  // Change address handlers
  const handleChangeAddressSubmit = async (addressData) => {
    try {
      // Customer has submitted to manager for approval
      // Just close modal and wait for manager to approve
      addressChangeSubmittedRef.current = true;
      setShowChangeAddressModal(false);

      // Note: Customer data is already sent via socket in ChangeAddressModal
      // Manager will review and approve, then backend will update
    } catch (error) {
      console.error('Error submitting address change request:', error);
    }
  };

  const handleChangeAddressClose = () => {
    setShowChangeAddressModal(false);
  };

  const handleEndCall = () => {
    endCall();
    setIsVideoCallActive(false);
    setShowCallModal(false);
    // Close any open service modals so they don't linger after the call
    setShowChangeContactModal(false);
    setShowChangeAddressModal(false);
    addressChangeSubmittedRef.current = false;
    phoneChangeSubmittedRef.current = false;
    emailChangeSubmittedRef.current = false;
    // Show feedback screen after call ends
    setShowFeedback(true);
  };

  const handleCancelCall = () => {
    if (callStatus === "connecting") {
      cancelCall();
    } else {
      endCall();
    }
    setShowCallModal(false);
  };

  const handleLeaveQueue = () => {
    console.log("🚫 Customer leaving queue via UI");
    leaveQueue();
    setShowCallModal(false);
  };

  useEffect(() => {
    console.log(`🔄 [Home useEffect] callStatus changed to: "${callStatus}"`);

    if (callStatus === "connected") {
      console.log("   Setting up connected state");
      setShowCallModal(false);
      setIsVideoCallActive(true);
      setFailedMessage("");
      setCallStartTime(Date.now());
      // Store manager email for feedback
      if (callData?.managerId) {
        setManagerEmail(callData.managerId);
      }
    } else if (callStatus === "ended") {
      setShowCallModal(false);
      setIsVideoCallActive(false);
      setCallStartTime(null);
      setShowChangeAddressModal(false);
      setShowChangeContactModal(false);
      setShowDormantActivationModal(false);
      dispatch(resetVerification());
      setShowFeedback(true);
    } else if (callStatus === "failed") {
      setShowCallModal(false);
      setIsVideoCallActive(false);
      setFailedMessage(connectionError || "No managers available at this moment");
      setCallStartTime(null);
      setShowChangeAddressModal(false);
      setShowChangeContactModal(false);
      setShowDormantActivationModal(false);
    } else if (callStatus === "idle") {
      setShowCallModal(false);
      setIsVideoCallActive(false);
      setCallStartTime(null);
      setShowChangeAddressModal(false);
      setShowChangeContactModal(false);
      setShowDormantActivationModal(false);
    } else if (callStatus === "queued") {
      console.log("   Setting up queued state");
      // Show queue status in the call modal
      setShowCallModal(true);
      setFailedMessage("");
    }
  }, [callStatus, connectionError, callData]);

  const handleToggleChat = () => {
    setIsChatOpen(!isChatOpen);
    if (!isChatOpen) {
      setUnreadChatCount(0);
    }
  };

  // Video control handlers
  const handleToggleMic = useCallback(() => {
    console.log('🎙️ [DEBUG] handleToggleMic clicked, ref present:', !!videoComponentRef.current);
    if (videoComponentRef.current) {
      videoComponentRef.current.toggleAudio();
    }
  }, []);

  const handleToggleVideo = useCallback(() => {
    if (videoComponentRef.current) {
      videoComponentRef.current.toggleVideo();
    }
  }, []);

  const handleToggleWhiteboard = useCallback(() => {
    setWhiteboardOpen(prev => {
      const next = !prev;
      if (socket) socket.emit('whiteboard:toggle', { open: next });
      return next;
    });
  }, [socket]);

  // Track audio/video state from OpenViduMeetComponent
  const handleAudioToggle = useCallback((enabled) => {
    console.log('🎙️ [DEBUG] handleAudioToggle received enabled =', enabled);
    setIsMuted(!enabled);
  }, []);

  const handleVideoToggle = useCallback((enabled) => {
    setIsVideoOff(!enabled);
  }, []);

  // Remote participants are now handled by OpenViduMeetComponent
  // No manual video attachment needed

  // Derive OTP modal open state directly from context (no useEffect middleman)
  // This mirrors the pattern used for faceVerificationInitiated which works reliably
  const managerRequestedOtp = !!verificationRequests.phone || !!verificationRequests.email;
  const otpModalOpen = showOtpModal || managerRequestedOtp;

  // Set changeContactType based on which verification is active
  const activeOtpType = verificationRequests.email ? 'email' : 'phone';

  useEffect(() => {
    if (verificationRequests.phone) {
      setChangeContactType('phone');
      setFailedMessage('');
    }
  }, [verificationRequests.phone]);

  useEffect(() => {
    if (verificationRequests.signature) {
      console.log("✍️ Showing Signature Upload modal");
      setShowSignatureUpload(true);
    } else {
      setShowSignatureUpload(false);
    }
  }, [verificationRequests.signature]);

  useEffect(() => {
    if (verificationRequests.email) {
      setChangeContactType('email');
      setFailedMessage('');
    }
  }, [verificationRequests.email]);



  // Listen for retake requests to reset face capture component
  useEffect(() => {
    if (!socket) return;

    const handleRetakeRequest = () => {
      console.log("Retake requested - resetting face capture component");
      // Increment key to force component remount with fresh state
      setFaceCaptureKey(prev => prev + 1);
    };

    socket.on('customer:retake-image-request', handleRetakeRequest);

    const handleSignatureDecision = (data) => {
      console.log('✍️ Signature decision received:', data);
      const isApproved = data.decision === 'approve' || data.decision === 'approved';
      setApprovalMessage(data.message || `Signature verification: ${data.decision.toUpperCase()}`);
      setShowApprovalFeedback(true);
      if (isApproved) {
        setShowSignatureUpload(false);
      }
      clearTimeout(approvalFeedbackTimerRef.current);
      approvalFeedbackTimerRef.current = setTimeout(() => {
        setShowApprovalFeedback(false);
      }, 4000);
    };

    const handleOtpResent = (data) => {
      setApprovalMessage(`Verification code resent to your ${data.type}!`);
      setShowApprovalFeedback(true);
      clearTimeout(approvalFeedbackTimerRef.current);
      approvalFeedbackTimerRef.current = setTimeout(() => {
        setShowApprovalFeedback(false);
      }, 3000);
    };

    const handleFaceVerificationResult = (data) => {
      console.log('🎯 Face verification result received:', data);
      setFaceVerificationInitiated(false);
      const isVerified = data.verified ?? data.status === 'verified';
      const message = isVerified
        ? 'Face verification successful. Your identity has been confirmed.'
        : 'Face verification was not successful. The manager could not confirm your identity.';
      setApprovalMessage(message);
      setShowApprovalFeedback(true);
      clearTimeout(approvalFeedbackTimerRef.current);
      approvalFeedbackTimerRef.current = setTimeout(() => {
        setShowApprovalFeedback(false);
      }, 5000);
    };

    socket.on('customer:signature-verification-decision', handleSignatureDecision);
    socket.on('otp:resent', handleOtpResent);
    // Two distinct manager-side flows both notify the customer of a face
    // verification decision, with different payload shapes but both
    // satisfying `data.verified ?? data.status === 'verified'`:
    // - manager:verify-image handler emits "customer:image-verified" with { status, ... }
    // - manager:face-verification-decision handler emits "customer:face-verification-result" with { verified, ... }
    socket.on('customer:image-verified', handleFaceVerificationResult);
    socket.on('customer:face-verification-result', handleFaceVerificationResult);

    return () => {
      socket.off('customer:retake-image-request', handleRetakeRequest);
      socket.off('customer:signature-verification-decision', handleSignatureDecision);
      socket.off('otp:resent', handleOtpResent);
      socket.off('customer:image-verified', handleFaceVerificationResult);
      socket.off('customer:face-verification-result', handleFaceVerificationResult);
      clearTimeout(approvalFeedbackTimerRef.current);
    };
  }, [socket]);

  // Listen for manager approval/rejection of change requests
  useEffect(() => {
    if (!socket) return;

    const handleChangeApproved = (data) => {
      setApprovalMessage(data.message || 'Your change has been approved and updated successfully');
      setShowApprovalFeedback(true);
      clearTimeout(approvalFeedbackTimerRef.current);
      approvalFeedbackTimerRef.current = setTimeout(() => setShowApprovalFeedback(false), 5000);
      // Close the relevant modal and clear the change request flag
      if (data.changeType === 'address') {
        setShowChangeAddressModal(false);
        acknowledgeAddressChangeRequest();
      } else {
        setShowChangeContactModal(false);
        if (data.changeType === 'email') acknowledgeEmailChangeRequest();
        else acknowledgePhoneChangeRequest();
      }
    };

    const handleChangeRejected = (data) => {
      setApprovalMessage(data.message || 'Your change request was not approved by the manager');
      setShowApprovalFeedback(true);
      clearTimeout(approvalFeedbackTimerRef.current);
      approvalFeedbackTimerRef.current = setTimeout(() => setShowApprovalFeedback(false), 5000);
      // Close the relevant modal and clear the change request flag
      if (data.changeType === 'address') {
        setShowChangeAddressModal(false);
        acknowledgeAddressChangeRequest();
      } else {
        setShowChangeContactModal(false);
        if (data.changeType === 'email') acknowledgeEmailChangeRequest();
        else acknowledgePhoneChangeRequest();
      }
    };

    const handleAccountActivated = () => {
      setApprovalMessage('Your dormant account has been successfully activated');
      setShowApprovalFeedback(true);
      clearTimeout(approvalFeedbackTimerRef.current);
      approvalFeedbackTimerRef.current = setTimeout(() => setShowApprovalFeedback(false), 5000);
      setShowDormantActivationModal(false);
      acknowledgeAccountActivationRequest();
    };

    socket.on('customer:change-approved', handleChangeApproved);
    socket.on('customer:change-rejected', handleChangeRejected);
    socket.on('customer:account-activated', handleAccountActivated);

    return () => {
      socket.off('customer:change-approved', handleChangeApproved);
      socket.off('customer:change-rejected', handleChangeRejected);
      socket.off('customer:account-activated', handleAccountActivated);
    };
  }, [socket]);

  // Handle change requests from manager
  useEffect(() => {
    if (changeRequests.phoneChangeRequested) {
      if (!phoneChangeSubmittedRef.current) {
        setChangeContactType('phone');
        setShowChangeContactModal(true);
      }
    } else {
      phoneChangeSubmittedRef.current = false;
      setShowChangeContactModal(false);
    }
  }, [changeRequests.phoneChangeRequested]);

  useEffect(() => {
    if (changeRequests.emailChangeRequested) {
      if (!emailChangeSubmittedRef.current) {
        setChangeContactType('email');
        setShowChangeContactModal(true);
      }
    } else {
      emailChangeSubmittedRef.current = false;
      setShowChangeContactModal(false);
    }
  }, [changeRequests.emailChangeRequested]);

  useEffect(() => {
    if (changeRequests.addressChangeRequested) {
      if (!addressChangeSubmittedRef.current) {
        setShowChangeAddressModal(true);
      }
    } else {
      addressChangeSubmittedRef.current = false;
      setShowChangeAddressModal(false);
    }
  }, [changeRequests.addressChangeRequested]);

  useEffect(() => {
    if (changeRequests.accountActivationRequested) {
      setShowDormantActivationModal(true);
    } else {
      setShowDormantActivationModal(false);
    }
  }, [changeRequests.accountActivationRequested]);

  const handleFaceVerificationClose = () => {
    setFaceVerificationInitiated(false);
    customerCancelFaceVerification(); // Notify manager that customer cancelled
    setFaceCaptureKey(prev => prev + 1); // Reset component state on close
  };


  const handleFeedbackSubmit = async ({ rating, feedback }) => {
    try {
      console.log('📊 Submitting customer feedback:', { rating, feedback, phone, managerEmail });
      
      const callDuration = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;

      const response = await apiClient.post(`${API_URL}/feedback`, {
        customerPhone: phone,
        managerEmail: managerEmail,
        rating: rating,
        feedbackText: feedback,
        callDuration: callDuration,
        callLogId: callLogId,
      });

      console.log('✅ Feedback submitted successfully:', response.data);

      // Clean up after feedback submission
      setShowFeedback(false);
      setPhone("");
      setManagerEmail(null);
      setCallLogId(null);

      // Disconnect socket after feedback is submitted
      // The disconnect handler will reset callStatus to idle
      if (socket && socket.connected) {
        console.log('🔌 Disconnecting socket after feedback submission');
        socket.disconnect();
      }
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      // Still close feedback even if submission fails
      setShowFeedback(false);
      setPhone("");
      setManagerEmail(null);
      setCallLogId(null);

      // Disconnect socket even if feedback submission failed
      if (socket && socket.connected) {
        console.log('🔌 Disconnecting socket after feedback error');
        socket.disconnect();
      }
    }
  };

  const handleFeedbackSkip = () => {
    console.log('⏭️ Customer skipped feedback');

    setShowFeedback(false);
    setPhone("");
    setManagerEmail(null);
    setCallLogId(null);

    // Disconnect socket after skipping feedback
    if (socket && socket.connected) {
      console.log('🔌 Disconnecting socket after skipping feedback');
      socket.disconnect();
    }
  };

  // Auto-open chat (and track unread count) when the manager sends a message
  // while the customer's chat panel is closed — customers otherwise had no
  // reliable way to notice an incoming manager message mid-call.
  useEffect(() => {
    if (!isChatOpen && chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      // Only act if it's a NEW manager message we haven't counted yet
      if (lastMessage.senderRole === 'manager' && lastMessage.id !== lastCountedMessageId) {
        setLastCountedMessageId(lastMessage.id);
        setIsChatOpen(true);
      }
    }
  }, [chatMessages, isChatOpen, lastCountedMessageId]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (isChatOpen) {
      setUnreadChatCount(0);
      // Mark the last message as counted so we don't re-count it when chat closes
      if (chatMessages.length > 0) {
        setLastCountedMessageId(chatMessages[chatMessages.length - 1].id);
      }
    }
  }, [isChatOpen, chatMessages]);

  // Reset chat state when call ends
  useEffect(() => {
    if (!isVideoCallActive) {
      setIsChatOpen(false);
      setUnreadChatCount(0);
      setLastCountedMessageId(null);
      setWhiteboardOpen(false);
    }
  }, [isVideoCallActive]);

  // Listen for whiteboard:toggle from manager to auto-open/close
  useEffect(() => {
    if (!socket || !isVideoCallActive) return;

    const handleWhiteboardToggle = (data) => {
      setWhiteboardOpen(data.open);
    };

    socket.on('whiteboard:toggle', handleWhiteboardToggle);
    return () => socket.off('whiteboard:toggle', handleWhiteboardToggle);
  }, [socket, isVideoCallActive]);

  // Clear approval feedback timer on unmount
  useEffect(() => {
    return () => clearTimeout(approvalFeedbackTimerRef.current);
  }, []);

  return (
    <Box sx={{ width: '100%', height: { xs: '100dvh', sm: '100vh' }, overflow: 'hidden' }}>
      {isVideoCallActive && callData ? (
        <Box
          sx={{
            width: '100%',
            // dvh accounts for mobile/tablet browser chrome (address bar) so
            // the bottom-anchored call controls stay within the visible
            // viewport instead of landing under the browser toolbar.
            height: { xs: '100dvh', sm: '100vh' },
            position: 'relative',
            backgroundColor: '#000000',
            overflow: 'hidden',
          }}
        >
          {/* Main Video Area */}
          <Box
            sx={{
              width: '100%',
              height: '100%',
              position: 'relative',
            }}
          >
            <OpenViduMeetComponent
              ref={videoComponentRef}
              roomName={callData.callRoom}
              displayName={phone}
              onLeave={handleEndCall}
              onAudioToggle={handleAudioToggle}
              onVideoToggle={handleVideoToggle}
              isIncoming={false}
            />

            {/* Collaborative Whiteboard Overlay */}
            <CollaborativeWhiteboard
              open={whiteboardOpen}
              onClose={() => {
                setWhiteboardOpen(false);
                if (socket) socket.emit('whiteboard:toggle', { open: false });
              }}
              socket={socket}
              role="customer"
            />

            {/* Call Timer - Top Left */}
            <Box
              sx={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 10,
              }}
            >
              <CallTimer
                startTime={callStartTime}
                isActive={isVideoCallActive}
                variant="compact"
              />
            </Box>

            {/* Video Call Controls - Bottom Center */}
            <VideoCallControls
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              whiteboardOpen={whiteboardOpen}
              onToggleMic={handleToggleMic}
              onToggleVideo={handleToggleVideo}
              onToggleWhiteboard={handleToggleWhiteboard}
              onToggleChat={handleToggleChat}
              onToggleParticipants={() => { }}
              onOpenSettings={() => { }}
              onEndCall={handleEndCall}
              unreadChatCount={unreadChatCount}
            />

            {/* Document Panel - Bottom Left */}
            {showDocPanel && (
              <DocumentPanel
                documents={[
                  { name: 'TIN Certificate', size: '500KB' },
                  { name: 'NID', size: '1.2MB' },
                ]}
                onNewUpload={() => { }}
              />
            )}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            // dvh accounts for mobile browser chrome (address bar) so the
            // available height is accurate instead of vh's fixed layout value.
            height: { xs: "100dvh", sm: "100vh" },
            overflowY: "auto",
            backgroundColor: colors.background,
            padding: { xs: 1.5, sm: 2 },
          }}
        >
          <Box
            sx={{
              width: "100%",
              maxWidth: 480,
              textAlign: "center",
            }}
          >
            {/* Bank Logo */}
            <Box sx={{ mb: { xs: 1.5, sm: 4 } }}>
              <BrandLogo size="medium" />
            </Box>

            {/* Video Banking Title */}
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: '1.4rem', sm: '2rem' },
                fontWeight: 600,
                color: colors.primary,
                mb: { xs: 0.5, sm: 1 },
              }}
            >
              Video Banking
            </Typography>

            {/* Subtitle */}
            <Typography
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.875rem' },
                color: colors.textSecondary,
                mb: { xs: 1.5, sm: 4 },
              }}
            >
              Verify your identity to start video banking
            </Typography>

            {/* Form Card */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 4 },
                borderRadius: 3,
                backgroundColor: colors.surface,
                boxShadow: "0 2px 12px rgba(0, 0, 0, 0.08)",
              }}
            >
              {ssoStatus === "authenticating" ? (
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 4 }}>
                  <CircularProgress size={32} color="primary" />
                  <Typography sx={{ mt: 2, color: colors.textSecondary }}>
                    Signing you in from MTB Neo...
                  </Typography>
                </Box>
              ) : (
                <>
                  {ssoStatus === "failed" && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                      This link is invalid or has expired. Please verify manually below.
                    </Alert>
                  )}
                  <StartVerification
                    onVerified={handleVerificationComplete}
                    disabled={callStatus !== "idle"}
                  />
                </>
              )}

              {callStatus === "connecting" && !showCallModal && (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", mt: 3 }}>
                  <CircularProgress size={24} color="primary" />
                  <Typography sx={{ ml: 2, color: colors.textSecondary }}>Connecting...</Typography>
                </Box>
              )}

              {connectionError && callStatus !== "failed" && (
                <Alert
                  severity="error"
                  sx={{
                    mt: 3,
                    borderRadius: 2,
                  }}
                >
                  {connectionError}
                </Alert>
              )}

              {failedMessage && (
                <Alert
                  severity="warning"
                  sx={{
                    mt: 3,
                    borderRadius: 2,
                  }}
                >
                  {failedMessage}
                </Alert>
              )}
            </Paper>
          </Box>
        </Box>
      )}

      <CallModal
        open={showCallModal}
        onClose={handleCancelCall}
        onCancel={handleLeaveQueue}
        callType="outgoing"
        callStatus={callStatus}
        managerName={callData?.managerName}
        managerImage={callData?.managerImage}
        inQueue={inQueue}
        queuePosition={queuePosition}
        queueMessage={queueMessage}
      />

      {isVideoCallActive && (
        <ChatBox
          messages={chatMessages}
          onSendMessage={sendChatMessage}
          onTyping={sendTypingIndicator}
          isTyping={isManagerTyping}
          managerName={callData?.managerName || "Manager"}
          isOpen={isChatOpen}
          onToggle={handleToggleChat}
          unreadCount={unreadChatCount}
        />
      )}

      {/* Face Capture Modal - Shows when manager requests face verification */}
      {faceVerificationInitiated && (isVideoCallActive || callStatus === "connected" || callStatus === "connecting") && (
        <CaptureCustomerImage onClose={handleFaceVerificationClose} />
      )}

      {/* Signature Upload Modal */}
      <SignatureUpload
        open={showSignatureUpload}
        onClose={() => setShowSignatureUpload(false)}
      />

      {/* Feedback Screen */}
      {showFeedback && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: { xs: '100dvh', sm: '100vh' },
            zIndex: 9999,
            backgroundColor: colors.background,
          }}
        >
          <FeedbackScreen
            onSubmit={handleFeedbackSubmit}
            onSkip={handleFeedbackSkip}
          />
        </Box>
      )}

      {/* OTP Verification Modal - Shows when manager requests verification */}
      {/* open is driven directly from context state (managerRequestedOtp) OR local showOtpModal */}
      <VerificationModal
        open={otpModalOpen}
        onClose={handleOtpClose}
        type={activeOtpType === 'email' ? 'email' : 'phone'}
        title={activeOtpType === 'email' ? 'Email Verification' : 'Phone Verification'}
        subtitle={
          activeOtpType === 'email'
            ? `Please enter the 6-digit OTP sent to ${currentAccountData?.email || 'your email'}`
            : `Please enter the 6-digit OTP sent to +88${phone}`
        }
        onVerify={activeOtpType === 'email' ? handleEmailVerificationOtp : handlePhoneVerificationOtp}
        onResend={activeOtpType === 'email' ? handleResendEmailOtp : handleResendPhoneOtp}
        isLoading={otpVerifyLoading}
        success={otpSuccess}
        errorMessage={failedMessage}
        onResetErrorMessage={() => setFailedMessage('')}
      />

      {/* Change Contact Modal (Phone/Email) */}
      <ChangeContactModal
        open={showChangeContactModal}
        onClose={handleChangeContactClose}
        type={changeContactType}
        currentValue={changeContactType === 'email' ? currentAccountData?.email : phone}
        onSubmit={handleChangeContactSubmit}
      />

      {/* Change Address Modal */}
      <ChangeAddressModal
        open={showChangeAddressModal}
        onClose={handleChangeAddressClose}
        onSubmit={handleChangeAddressSubmit}
        currentAddress={{
          present: currentAccountData?.address ? { addressLine1: currentAccountData.address } : null,
          permanent: currentAccountData?.permanentAddress ? { addressLine1: currentAccountData.permanentAddress } : null,
        }}
      />

      {/* Dormant Account Activation Modal */}
      <Dialog
        open={showDormantActivationModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { background: '#6B4FA0', borderRadius: 3 }
        }}
      >
        <DialogContent sx={{ p: 0, position: 'relative' }}>
          <IconButton
            onClick={() => { setShowDormantActivationModal(false); acknowledgeAccountActivationRequest(); }}
            size="small"
            sx={{
              position: 'absolute', top: 8, right: 8, zIndex: 1,
              color: 'rgba(255,255,255,0.7)',
              '&:hover': { color: '#fff', background: 'rgba(255,255,255,0.15)' },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <DormantAccountActivationRequest socket={socket} />
        </DialogContent>
      </Dialog>



      {/* Manager Approval/Rejection Feedback */}
      {showApprovalFeedback && (
        <Box
          sx={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10001,
            width: { xs: '90%', sm: 'auto' },
            maxWidth: '500px',
          }}
        >
          <Alert
            severity={approvalMessage.includes('approved') || approvalMessage.includes('successful') ? 'success' : approvalMessage.includes('not successful') || approvalMessage.includes('not approved') ? 'error' : 'warning'}
            onClose={() => setShowApprovalFeedback(false)}
            sx={{
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {approvalMessage}
          </Alert>
        </Box>
      )}
    </Box>
  );
};

export default Home;