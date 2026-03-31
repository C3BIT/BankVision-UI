import { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  CircularProgress,
  Chip,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  Home as HomeIcon,
  AccountBalance as AccountIcon,
  CreditCard as CardIcon,
  AccountBalanceWallet as LoanIcon,
  ChevronRight as ChevronRightIcon,
  Edit as EditIcon,
  VerifiedUser as VerifiedUserIcon,
  Person as PersonIcon,
  Face as FaceIcon,
  Create as SignatureIcon,
  Settings as ServiceIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../providers/WebSocketProvider';
import FaceVerificationModal from '../FaceVerificationModal/FaceVerificationModal';
import SignatureVerification from '../CustomerInformations/SignatureVerification/SignatureVerification';
import AccountActivation from '../CustomerInformations/AccountActivation/AccountActivation';
import DormantAccountActivation from '../CustomerInformations/DormantAccountActivation/DormantAccountActivation';
import PhoneChangeRequest from '../CustomerInformations/PhoneChangeRequest/PhoneChangeRequest';
import EmailChangeRequest from '../CustomerInformations/EmailChangeRequest/EmailChangeRequest';
import AddressChange from '../CustomerInformations/AddressChange/AddressChange';
import PassiveFaceVerification from '../PassiveFaceVerification/PassiveFaceVerification';
import {
  fetchCBSAccounts,
  fetchCBSCards,
  fetchCBSLoans,
  setSelectedAccountNumber,
} from '../../redux/customer/customerAccountsSlice';
import { fetchCustomerImage } from '../../redux/customer/customerImageSlice';

const VideoCallSidebarNew = ({
  customerPhone,
  customerName,
  customerEmail,
  verificationInfo,
  onAccountSelect,
  customerVideoElement,
  callStartTime,
  isCallActive,
  serviceResetKey,
}) => {
  const dispatch = useDispatch();
  const {
    phoneVerified,
    emailVerified,
    faceVerificationStatus,
    requestPhoneVerification,
    requestEmailVerification,
    verificationPending,
    socket,
    markFaceVerified
  } = useWebSocket();

  const { cbsAccounts, cbsCards, cbsLoans, loading, accountDetails: reduxAccountDetails, selectedAccountNumber } = useSelector(
    (state) => state.customerAccounts
  );

  // Resolve email: prop → accountDetails from Redux → fallback null
  const resolvedCustomerEmail = customerEmail && customerEmail !== 'N/A'
    ? customerEmail
    : reduxAccountDetails?.email || null;

  const { profileImage } = useSelector((state) => state.customerImageInfo);

  const [showFaceModal, setShowFaceModal] = useState(false);
  const [isRequestingOTP, setIsRequestingOTP] = useState(false);
  const [isRequestingEmailOTP, setIsRequestingEmailOTP] = useState(false);
  const otpCooldownRef = useRef(null);
  const emailOtpCooldownRef = useRef(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = Verification, 1 = Services
  const [showSignatureVerification, setShowSignatureVerification] = useState(false);
  const [showAccountActivation, setShowAccountActivation] = useState(false);
  const [showPhoneChange, setShowPhoneChange] = useState(false);
  const [showEmailChange, setShowEmailChange] = useState(false);
  const [showAddressChange, setShowAddressChange] = useState(false);
  const [signatureVerified, setSignatureVerified] = useState(false);

  // Navigate back to services list after approval dialog is resolved
  useEffect(() => {
    if (serviceResetKey === 0) return;
    setShowPhoneChange(false);
    setShowEmailChange(false);
    setShowAddressChange(false);
    setShowAccountActivation(false);
    setShowSignatureVerification(false);
  }, [serviceResetKey]);

  // Fetch customer data when phone number is available
  useEffect(() => {
    console.log('🔍 VideoCallSidebarNew mounted with customerPhone:', customerPhone);
    if (customerPhone && customerPhone !== 'N/A') {
      console.log('📞 Fetching CBS data for phone:', customerPhone);
      dispatch(fetchCBSAccounts({ phone: customerPhone }))
        .then(result => console.log('✅ Accounts fetched:', result))
        .catch(err => console.error('❌ Accounts error:', err));
      dispatch(fetchCBSCards({ phone: customerPhone }))
        .then(result => console.log('✅ Cards fetched:', result))
        .catch(err => console.error('❌ Cards error:', err));
      dispatch(fetchCBSLoans({ phone: customerPhone }))
        .then(result => console.log('✅ Loans fetched:', result))
        .catch(err => console.error('❌ Loans error:', err));

      // Fetch profile image for face verification availability check
      dispatch(fetchCustomerImage({ phone: customerPhone }))
        .then(result => console.log('✅ Profile image fetched:', result))
        .catch(err => console.error('❌ Profile image error:', err));
    } else {
      console.warn('⚠️ No valid customerPhone provided:', customerPhone);
    }
  }, [customerPhone, dispatch]);

  // Use real customer data or show empty state
  const clientInfo = {
    name: customerName || 'N/A',
    mobile: customerPhone || 'N/A',
    email: customerEmail || 'N/A',
    address: 'N/A', // TODO: Get from customer profile API
  };

  // Use data from Redux (fetched from CBS backend)
  const accounts = cbsAccounts || [];
  const cards = cbsCards || [];
  const loans = cbsLoans || [];

  // Check if customer data was found
  const hasCustomerData = accounts.length > 0 || cards.length > 0 || loans.length > 0 || customerName !== 'N/A';

  const handleOTPRequest = async () => {
    setIsRequestingOTP(true);
    try {
      await requestPhoneVerification();
    } catch (error) {
      console.error('Error requesting OTP:', error);
    } finally {
      // Keep button disabled for 3 seconds to prevent spam
      clearTimeout(otpCooldownRef.current);
      otpCooldownRef.current = setTimeout(() => {
        setIsRequestingOTP(false);
      }, 3000);
    }
  };

  const handleEmailVerificationRequest = async () => {
    if (resolvedCustomerEmail) {
      setIsRequestingEmailOTP(true);
      try {
        console.log('📧 Manager requesting email verification');
        await requestEmailVerification(resolvedCustomerEmail);
      } catch (error) {
        console.error('Error requesting email OTP:', error);
      } finally {
        clearTimeout(emailOtpCooldownRef.current);
        emailOtpCooldownRef.current = setTimeout(() => {
          setIsRequestingEmailOTP(false);
        }, 3000);
      }
    }
  };


  // Listen for signature verification decision echoed back from backend
  useEffect(() => {
    if (!socket) return;

    const handleSignatureDecision = (data) => {
      if (data.decision === 'approve' || data.decision === 'approved') {
        setSignatureVerified(true);
      }
      setShowSignatureVerification(false);
    };

    socket.on('customer:signature-verification-decision', handleSignatureDecision);

    return () => {
      socket.off('customer:signature-verification-decision', handleSignatureDecision);
    };
  }, [socket]);

  // Clear OTP cooldown timers on unmount
  useEffect(() => {
    return () => {
      clearTimeout(otpCooldownRef.current);
      clearTimeout(emailOtpCooldownRef.current);
    };
  }, []);

  const handleFaceVerification = () => {
    setShowFaceModal(true);
  };

  // Service request handlers
  const handleRequestPhoneChange = () => {
    console.log('📱 Manager opening phone change interface');
    setShowPhoneChange(true);
    // Also notify customer to open their modal
    if (socket && socket.connected) {
      socket.emit('manager:request-phone-change', {
        customerId: customerPhone,
        timestamp: Date.now()
      });
    }
  };

  const handleRequestEmailChange = () => {
    console.log('📧 Manager opening email change interface');
    setShowEmailChange(true);
    // Also notify customer to open their modal
    if (socket && socket.connected) {
      socket.emit('manager:request-email-change', {
        customerId: customerPhone,
        timestamp: Date.now()
      });
    }
  };

  const handleRequestAddressChange = () => {
    console.log('🏠 Manager opening address change interface');
    setShowAddressChange(true);
    // Also notify customer to open their modal
    if (socket && socket.connected) {
      socket.emit('manager:request-address-change', {
        customerId: customerPhone,
        timestamp: Date.now()
      });
    }
  };

  return (
    <>
      <Box
        sx={{
          height: '100%',
          overflow: 'auto',
          backgroundColor: '#FFFFFF',
          p: 3,
        }}
      >
        {/* Client's Information Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1.125rem',
              color: '#1A1A1A',
              mb: 2,
            }}
          >
            Client's Information
          </Typography>

          {/* Show "No Data Found" if customer not in database */}
          {!hasCustomerData && (
            <Alert
              severity="info"
              sx={{
                mb: 2,
                fontSize: '0.875rem',
                '& .MuiAlert-message': {
                  width: '100%',
                }
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                No Customer Data Found
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                This customer is not registered in the bank database. Customer information will be limited.
              </Typography>
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 70 }}>
                Name:
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
                {clientInfo.name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 70 }}>
                Mobile:
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
                {clientInfo.mobile}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 70 }}>
                E-mail:
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
                {clientInfo.email}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', minWidth: 70 }}>
                Address:
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: '#666' }}>
                {clientInfo.address}
              </Typography>
            </Box>
          </Box>

          {/* Pre-Call Verification Info */}
          {verificationInfo && (
            <Box sx={{ mt: 3, mb: 3, p: 2, backgroundColor: '#F5F5F5', borderRadius: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: '#1A1A1A',
                  mb: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}
              >
                <VerifiedUserIcon sx={{ fontSize: 18 }} />
                Pre-Call Verification
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', minWidth: 80 }}>
                    Method:
                  </Typography>
                  <Chip
                    label={verificationInfo.method === 'phone' ? 'Phone' : 'Email'}
                    size="small"
                    icon={verificationInfo.method === 'phone' ? <PhoneIcon /> : <EmailIcon />}
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      backgroundColor: verificationInfo.method === 'phone' ? '#E3F2FD' : '#FFF3E0',
                      color: verificationInfo.method === 'phone' ? '#1976D2' : '#F57C00',
                    }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', minWidth: 80 }}>
                    Verified:
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                    {verificationInfo.phoneOrEmail || 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', minWidth: 80 }}>
                    Status:
                  </Typography>
                  <Chip
                    label={verificationInfo.isInternal ? 'Internal' : 'External'}
                    size="small"
                    icon={<PersonIcon />}
                    sx={{
                      height: 20,
                      fontSize: '0.7rem',
                      backgroundColor: verificationInfo.isInternal ? '#E8F5E9' : '#FFF3E0',
                      color: verificationInfo.isInternal ? '#2E7D32' : '#F57C00',
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Alert
                  severity={verificationInfo.isInternal ? 'success' : 'warning'}
                  sx={{ mt: 1, py: 0.5, fontSize: '0.7rem' }}
                  icon={false}
                >
                  {verificationInfo.isInternal
                    ? 'Verification contact is registered in bank database (Internal Customer)'
                    : 'Verification contact is not in bank database (External/Guest Customer)'}
                </Alert>
              </Box>
            </Box>
          )}

        </Box>

        {/* NEW: Verification Summary Panel */}
        <Box sx={{ mb: 4, p: 2, backgroundColor: '#F8F9FA', borderRadius: 2, border: '1px solid #E0E0E0' }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
              color: '#1A1A1A',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <VerifiedUserIcon sx={{ fontSize: 18, color: '#0066FF' }} />
            Verification Summary
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {/* Phone Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PhoneIcon sx={{ fontSize: 16, color: '#666' }} />
                <Typography sx={{ fontSize: '0.8125rem', color: '#444' }}>Phone</Typography>
              </Box>
              <Chip
                label={phoneVerified ? 'Verified' : 'Pending'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: phoneVerified ? '#E8F5E9' : '#FFF3E0',
                  color: phoneVerified ? '#2E7D32' : '#F57C00',
                }}
              />
            </Box>

            {/* Email Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon sx={{ fontSize: 16, color: '#666' }} />
                <Typography sx={{ fontSize: '0.8125rem', color: '#444' }}>Email</Typography>
              </Box>
              <Chip
                label={emailVerified ? 'Verified' : 'Pending'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: emailVerified ? '#E8F5E9' : '#FFF3E0',
                  color: emailVerified ? '#2E7D32' : '#F57C00',
                }}
              />
            </Box>

            {/* Face Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FaceIcon sx={{ fontSize: 16, color: '#666' }} />
                <Typography sx={{ fontSize: '0.8125rem', color: '#444' }}>Face</Typography>
              </Box>
              <Chip
                label={faceVerificationStatus === 'verified' ? 'Verified' : 'Unverified'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: faceVerificationStatus === 'verified' ? '#E8F5E9' : '#FFEBEE',
                  color: faceVerificationStatus === 'verified' ? '#2E7D32' : '#D32F2F',
                }}
              />
            </Box>

            {/* Signature Status */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SignatureIcon sx={{ fontSize: 16, color: '#666' }} />
                <Typography sx={{ fontSize: '0.8125rem', color: '#444' }}>Signature</Typography>
              </Box>
              <Chip
                label={signatureVerified ? 'Verified' : 'Pending'}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: signatureVerified ? '#E8F5E9' : '#FFF3E0',
                  color: signatureVerified ? '#2E7D32' : '#F57C00',
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Passive Face Verification Indicator Panel */}
        {isCallActive && profileImage && (
          <Box sx={{ mb: 3 }}>
            <PassiveFaceVerification
              videoElement={customerVideoElement}
              customerPhone={customerPhone}
              callStartTime={callStartTime}
              isCallActive={isCallActive}
              onVerified={markFaceVerified}
            />
          </Box>
        )}

        {/* Workflow Panels - Tabbed Interface */}
        <Divider sx={{ my: 3 }} />
        <Box sx={{ mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              mb: 2,
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
              },
            }}
          >
            <Tab
              icon={<VerifiedUserIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Verification"
            />
            <Tab
              icon={<ServiceIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label="Services"
            />
          </Tabs>

          {/* Verification Panel */}
          {activeTab === 0 && (
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  fontSize: '0.75rem',
                  color: '#666',
                  mb: 2,
                }}
              >
                Select verification method (optional - choose as needed)
              </Typography>

              {showSignatureVerification ? (
                <SignatureVerification
                  customerPhone={customerPhone}
                  onBack={() => setShowSignatureVerification(false)}
                  socket={socket}
                />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* Phone Verification */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleOTPRequest}
                    disabled={isRequestingOTP || verificationPending?.phone}
                    startIcon={
                      phoneVerified ? (
                        <CheckCircleIcon sx={{ color: '#10B981' }} />
                      ) : (isRequestingOTP || verificationPending?.phone) ? (
                        <CircularProgress size={20} />
                      ) : (
                        <PhoneIcon />
                      )
                    }
                    sx={{
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 500,
                      justifyContent: 'flex-start',
                      borderColor: phoneVerified ? '#10B981' : '#E0E0E0',
                      color: '#1A1A1A',
                      backgroundColor: phoneVerified ? '#F0FDF4' : '#FFFFFF',
                      '&:hover': {
                        borderColor: phoneVerified ? '#10B981' : '#0066FF',
                        backgroundColor: phoneVerified ? '#F0FDF4' : '#F0F7FF',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Phone Verification
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        {phoneVerified
                          ? 'Verified ✓'
                          : isRequestingOTP || verificationPending?.phone
                            ? 'Sending OTP...'
                            : 'Send OTP to internal phone'}
                      </Typography>
                    </Box>
                  </Button>

                  {/* Email Verification */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={handleEmailVerificationRequest}
                    disabled={!resolvedCustomerEmail || isRequestingEmailOTP || verificationPending?.email}
                    startIcon={
                      emailVerified ? (
                        <CheckCircleIcon sx={{ color: '#10B981' }} />
                      ) : (isRequestingEmailOTP || verificationPending?.email) ? (
                        <CircularProgress size={20} />
                      ) : (
                        <EmailIcon />
                      )
                    }
                    sx={{
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 500,
                      justifyContent: 'flex-start',
                      borderColor: emailVerified ? '#10B981' : '#E0E0E0',
                      color: '#1A1A1A',
                      backgroundColor: emailVerified ? '#F0FDF4' : '#FFFFFF',
                      '&:hover': {
                        borderColor: emailVerified ? '#10B981' : '#0066FF',
                        backgroundColor: emailVerified ? '#F0FDF4' : '#F0F7FF',
                      },
                      '&:disabled': {
                        opacity: 0.5,
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Email Verification
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        {emailVerified
                          ? 'Verified ✓'
                          : !resolvedCustomerEmail
                            ? 'Email not available'
                            : isRequestingEmailOTP || verificationPending?.email
                              ? 'Sending OTP...'
                              : 'Send OTP to internal email'}
                      </Typography>
                    </Box>
                  </Button>

                  {/* Face Verification Status */}
                  {!profileImage ? (
                    <Box
                      sx={{
                        py: 1.5,
                        px: 2,
                        border: '1px solid #E0E0E0',
                        borderRadius: 1,
                        backgroundColor: '#F8F9FA',
                        opacity: 0.6,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <FaceIcon sx={{ color: '#999', fontSize: 20 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#999' }}>
                            Face Verification
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#999' }}>
                            Not Available - No profile image
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        py: 1.5,
                        px: 2,
                        border: '1px solid',
                        borderColor: faceVerificationStatus === 'verified' ? '#10B981' : '#E0E0E0',
                        borderRadius: 1,
                        backgroundColor: faceVerificationStatus === 'verified' ? '#F0FDF4' : '#FFFFFF',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {faceVerificationStatus === 'verified' ? (
                          <CheckCircleIcon sx={{ color: '#10B981', fontSize: 20 }} />
                        ) : (
                          <FaceIcon sx={{ color: '#0066FF', fontSize: 20 }} />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            Face Verification
                          </Typography>
                          <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                            {faceVerificationStatus === 'verified'
                              ? 'Verified ✓ - Passive monitoring active'
                              : 'Passive - Auto-verifying...'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )}

                  {/* Signature Verification */}
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => setShowSignatureVerification(true)}
                    startIcon={
                      signatureVerified ? (
                        <CheckCircleIcon sx={{ color: '#10B981' }} />
                      ) : (
                        <SignatureIcon />
                      )
                    }
                    sx={{
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 500,
                      justifyContent: 'flex-start',
                      borderColor: signatureVerified ? '#10B981' : '#E0E0E0',
                      color: '#1A1A1A',
                      backgroundColor: signatureVerified ? '#F0FDF4' : '#FFFFFF',
                      '&:hover': {
                        borderColor: signatureVerified ? '#10B981' : '#0066FF',
                        backgroundColor: signatureVerified ? '#F0FDF4' : '#F0F7FF',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Signature Verification
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        {signatureVerified ? 'Verified ✓' : 'Upload and match signature'}
                      </Typography>
                    </Box>
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Service Panel */}
          {activeTab === 1 && (
            <Box>
              {/* Account required banner */}
              {!selectedAccountNumber && (
                <Alert
                  severity="warning"
                  sx={{ mb: 2, fontSize: '0.8rem' }}
                >
                  Select an account from the <strong>Account List</strong> below before starting a service.
                </Alert>
              )}

              {showPhoneChange ? (
                <PhoneChangeRequest
                  currentPhone={customerPhone}
                  onBack={() => setShowPhoneChange(false)}
                />
              ) : showEmailChange ? (
                <EmailChangeRequest
                  currentEmail={customerEmail}
                  onBack={() => setShowEmailChange(false)}
                />
              ) : showAddressChange ? (
                <AddressChange
                  currentAddress={reduxAccountDetails?.presentAddress || reduxAccountDetails?.address || null}
                  onBack={() => setShowAddressChange(false)}
                />
              ) : showAccountActivation ? (
                <DormantAccountActivation onBack={() => setShowAccountActivation(false)} />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {/* Phone Change Request */}
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!selectedAccountNumber}
                    onClick={handleRequestPhoneChange}
                    startIcon={<PhoneIcon />}
                    sx={{
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 500,
                      justifyContent: 'flex-start',
                      borderColor: '#E0E0E0',
                      color: '#1A1A1A',
                      backgroundColor: '#FFFFFF',
                      '&:hover': {
                        borderColor: '#0066FF',
                        backgroundColor: '#F0F7FF',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Phone Number Change
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        Request new mobile number
                      </Typography>
                    </Box>
                    <EditIcon sx={{ fontSize: 20, color: '#0066FF' }} />
                  </Button>

                  {/* Email Change Request */}
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!selectedAccountNumber}
                    onClick={handleRequestEmailChange}
                    startIcon={<EmailIcon />}
                    sx={{
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 500,
                      justifyContent: 'flex-start',
                      borderColor: '#E0E0E0',
                      color: '#1A1A1A',
                      backgroundColor: '#FFFFFF',
                      '&:hover': {
                        borderColor: '#0066FF',
                        backgroundColor: '#F0F7FF',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Email Change
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        Request new email address
                      </Typography>
                    </Box>
                    <EditIcon sx={{ fontSize: 20, color: '#0066FF' }} />
                  </Button>

                  {/* Address Change Request */}
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!selectedAccountNumber}
                    onClick={handleRequestAddressChange}
                    startIcon={<HomeIcon />}
                    sx={{
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 500,
                      justifyContent: 'flex-start',
                      borderColor: '#E0E0E0',
                      color: '#1A1A1A',
                      backgroundColor: '#FFFFFF',
                      '&:hover': {
                        borderColor: '#0066FF',
                        backgroundColor: '#F0F7FF',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Address Change
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        Request address update
                      </Typography>
                    </Box>
                    <EditIcon sx={{ fontSize: 20, color: '#0066FF' }} />
                  </Button>

                  {/* Dormant Account Activation */}
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled={!selectedAccountNumber}
                    onClick={() => setShowAccountActivation(true)}
                    startIcon={<AccountIcon />}
                    sx={{
                      py: 1.5,
                      textTransform: 'none',
                      fontWeight: 500,
                      justifyContent: 'flex-start',
                      borderColor: '#E0E0E0',
                      color: '#1A1A1A',
                      backgroundColor: '#FFFFFF',
                      '&:hover': {
                        borderColor: '#0066FF',
                        backgroundColor: '#F0F7FF',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        Dormant Account Activation
                      </Typography>
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        Activate dormant account
                      </Typography>
                    </Box>
                    <EditIcon sx={{ fontSize: 20, color: '#0066FF' }} />
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Account List Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1.125rem',
              color: '#1A1A1A',
              mb: 2,
            }}
          >
            Account List
          </Typography>
          {accounts.length === 0 ? (
            <Box
              sx={{
                p: 3,
                backgroundColor: '#F8F9FA',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontSize: '0.875rem', color: '#999' }}>
                No accounts available
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {accounts.map((account, index) => (
                <ListItem
                  key={index}
                  onClick={() => {
                    if (onAccountSelect) onAccountSelect(account.id);
                    dispatch(setSelectedAccountNumber(account.id));
                  }}
                  sx={{
                    px: 2,
                    py: 1.5,
                    mb: 1,
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: selectedAccountNumber === account.id ? '2px solid #0066FF' : '2px solid transparent',
                    backgroundColor: selectedAccountNumber === account.id ? '#E8F0FF' : '#F8F9FA',
                    '&:hover': { backgroundColor: selectedAccountNumber === account.id ? '#D4E5FF' : '#E9ECEF' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <AccountIcon sx={{ color: selectedAccountNumber === account.id ? '#0066FF' : '#666', fontSize: 24 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: selectedAccountNumber === account.id ? '#0066FF' : '#1A1A1A' }}>
                        A/C : {account.id}
                      </Typography>
                    }
                    secondary={
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        {account.type}, {account.branch}
                      </Typography>
                    }
                  />
                  {selectedAccountNumber === account.id ? (
                    <CheckCircleIcon sx={{ color: '#0066FF', fontSize: 20 }} />
                  ) : (
                    <IconButton size="small">
                      <ChevronRightIcon />
                    </IconButton>
                  )}
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Card List Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1.125rem',
              color: '#1A1A1A',
              mb: 2,
            }}
          >
            Card List
          </Typography>
          {cards.length === 0 ? (
            <Box
              sx={{
                p: 3,
                backgroundColor: '#F8F9FA',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontSize: '0.875rem', color: '#999' }}>
                No cards available
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {cards.map((card, index) => (
                <ListItem
                  key={index}
                  sx={{
                    px: 2,
                    py: 1.5,
                    mb: 1,
                    backgroundColor: '#F8F9FA',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#E9ECEF' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <CardIcon sx={{ color: '#0066FF', fontSize: 24 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {card.number}
                      </Typography>
                    }
                    secondary={
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        {card.type} - {card.category}
                      </Typography>
                    }
                  />
                  <IconButton size="small">
                    <ChevronRightIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Loan Details Section */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '1.125rem',
              color: '#1A1A1A',
              mb: 2,
            }}
          >
            Loan Details
          </Typography>
          {loans.length === 0 ? (
            <Box
              sx={{
                p: 3,
                backgroundColor: '#F8F9FA',
                borderRadius: 1,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontSize: '0.875rem', color: '#999' }}>
                No loans available
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {loans.map((loan, index) => (
                <ListItem
                  key={index}
                  sx={{
                    px: 2,
                    py: 1.5,
                    mb: 1,
                    backgroundColor: '#F8F9FA',
                    borderRadius: 1,
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#E9ECEF' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <LoanIcon sx={{ color: '#0066FF', fontSize: 24 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        {loan.number}
                      </Typography>
                    }
                    secondary={
                      <Typography sx={{ fontSize: '0.75rem', color: '#666' }}>
                        {loan.type} - {loan.category}
                      </Typography>
                    }
                  />
                  <IconButton size="small">
                    <ChevronRightIcon />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>

      {/* Face Verification Modal - Keep for manual verification if needed */}
      <FaceVerificationModal
        open={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        customerName={customerPhone}
      />
    </>
  );
};

VideoCallSidebarNew.propTypes = {
  customerPhone: PropTypes.string.isRequired,
  customerName: PropTypes.string,
  customerEmail: PropTypes.string,
  verificationInfo: PropTypes.shape({
    method: PropTypes.oneOf(['phone', 'email']),
    phoneOrEmail: PropTypes.string,
    isInternal: PropTypes.bool,
  }),
  onAccountSelect: PropTypes.func,
  customerVideoElement: PropTypes.instanceOf(HTMLVideoElement),
  callStartTime: PropTypes.number,
  isCallActive: PropTypes.bool,
  serviceResetKey: PropTypes.number,
};

export default VideoCallSidebarNew;
