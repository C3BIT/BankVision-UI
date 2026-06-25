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
  fetchCustomerDetailsByAccount,
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
  const [activeListTab, setActiveListTab] = useState(0); // 0 = Accounts, 1 = Cards, 2 = Loans
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
    if (customerPhone && customerPhone !== 'N/A') {
      dispatch(fetchCBSAccounts({ phone: customerPhone }));
      dispatch(fetchCBSCards({ phone: customerPhone }));
      dispatch(fetchCBSLoans({ phone: customerPhone }));
      dispatch(fetchCustomerImage({ phone: customerPhone }));
    }
  }, [customerPhone, dispatch]);

  // Auto-fetch account details for the first CBS account to populate address
  useEffect(() => {
    if (cbsAccounts && cbsAccounts.length > 0 && customerPhone && !reduxAccountDetails?.address) {
      const firstAccNo = cbsAccounts[0].accountNumber;
      dispatch(fetchCustomerDetailsByAccount({ accountNumber: firstAccNo, phone: customerPhone }));
    }
  }, [cbsAccounts, customerPhone, reduxAccountDetails?.address, dispatch]);

  // Use real customer data or show empty state
  const clientInfo = {
    name: customerName || 'N/A',
    mobile: customerPhone || 'N/A',
    email: customerEmail || 'N/A',
    address: reduxAccountDetails?.address || reduxAccountDetails?.presentAddress || null,
    permanentAddress: reduxAccountDetails?.permanentAddress || null,
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

    setShowAddressChange(true);
    // Notify customer to open their modal and pass current address data so
    // the customer's ChangeAddressModal can display and submit the previous value.
    if (socket && socket.connected) {
      socket.emit('manager:request-address-change', {
        customerId: customerPhone,
        timestamp: Date.now(),
        accountData: {
          address: reduxAccountDetails?.address || reduxAccountDetails?.presentAddress || null,
          permanentAddress: reduxAccountDetails?.permanentAddress || null,
        },
      });
    }
  };

  // Compact button sx shared across verification + service buttons
  const btnSx = (active) => ({
    py: 0.75,
    textTransform: 'none',
    fontWeight: 500,
    justifyContent: 'flex-start',
    borderColor: active ? '#10B981' : '#E0E0E0',
    color: '#1A1A1A',
    backgroundColor: active ? '#F0FDF4' : '#FFFFFF',
    '&:hover': { borderColor: active ? '#10B981' : '#0066FF', backgroundColor: active ? '#F0FDF4' : '#F0F7FF' },
    '&:disabled': { opacity: 0.5 },
  });

  return (
    <>
      <Box sx={{ minHeight: '100%', backgroundColor: '#FFFFFF', p: 2 }}>

        {/* Client's Information */}
        <Box sx={{ mb: 1.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1A1A1A', mb: 0.75, mt: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Client's Information
          </Typography>

          {!hasCustomerData && (
            <Alert severity="info" sx={{ mb: 1, py: 0.25, fontSize: '0.75rem' }} icon={false}>
              Not registered in bank database — limited information.
            </Alert>
          )}

          {/* CBS Profile Photo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: 1, overflow: 'hidden', flexShrink: 0,
              border: '1px solid #E0E0E0', backgroundColor: '#F5F5F5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {profileImage
                ? <img src={`data:image/jpeg;base64,${profileImage}`} alt="CBS" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <PersonIcon sx={{ fontSize: 32, color: '#BDBDBD' }} />
              }
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1A1A1A', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {clientInfo.name}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: '#666', lineHeight: 1.4 }}>{clientInfo.mobile}</Typography>
              {profileImage
                ? <Chip label="Photo on record" size="small" sx={{ height: 16, fontSize: '0.6rem', backgroundColor: '#F0FDF4', color: '#10B981', mt: 0.25 }} />
                : <Chip label="No photo on record" size="small" sx={{ height: 16, fontSize: '0.6rem', backgroundColor: '#FFF3E0', color: '#E65100', mt: 0.25 }} />
              }
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '62px 1fr', rowGap: 0.25, columnGap: 0.75 }}>
            {[
              ['E-mail', clientInfo.email],
              ['Present', clientInfo.address || 'N/A'],
              ['Permanent', clientInfo.permanentAddress || 'N/A'],
            ].map(([label, value]) => (
              <>
                <Typography key={label + 'l'} sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#555', lineHeight: 1.6 }}>{label}:</Typography>
                <Typography key={label + 'v'} sx={{ fontSize: '0.75rem', color: '#666', lineHeight: 1.6, wordBreak: 'break-word' }}>{value}</Typography>
              </>
            ))}
          </Box>

          {/* Pre-Call Verification Info */}
          {verificationInfo && (
            <Box sx={{ mt: 1, p: 1, backgroundColor: '#F5F5F5', borderRadius: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.75rem', color: '#1A1A1A', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <VerifiedUserIcon sx={{ fontSize: 14 }} /> Pre-Call Verification
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                <Chip
                  label={verificationInfo.method === 'phone' ? 'Phone' : 'Email'}
                  size="small"
                  icon={verificationInfo.method === 'phone' ? <PhoneIcon /> : <EmailIcon />}
                  sx={{ height: 18, fontSize: '0.65rem', backgroundColor: verificationInfo.method === 'phone' ? '#E3F2FD' : '#FFF3E0', color: verificationInfo.method === 'phone' ? '#1976D2' : '#F57C00' }}
                />
                <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{verificationInfo.phoneOrEmail || 'N/A'}</Typography>
                <Chip
                  label={verificationInfo.isInternal ? 'Internal' : 'External'}
                  size="small"
                  icon={<PersonIcon />}
                  sx={{ height: 18, fontSize: '0.65rem', backgroundColor: verificationInfo.isInternal ? '#E8F5E9' : '#FFF3E0', color: verificationInfo.isInternal ? '#2E7D32' : '#F57C00', fontWeight: 600 }}
                />
              </Box>
            </Box>
          )}
        </Box>

        {/* Verification Summary — compact horizontal chips */}
        <Box sx={{ mb: 1.5, p: 1, backgroundColor: '#F8F9FA', borderRadius: 1, border: '1px solid #E0E0E0' }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.7rem', color: '#555', mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <VerifiedUserIcon sx={{ fontSize: 13, color: '#0066FF' }} /> Verification Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {[
              { icon: <PhoneIcon sx={{ fontSize: 11 }} />, label: 'Phone', ok: phoneVerified },
              { icon: <EmailIcon sx={{ fontSize: 11 }} />, label: 'Email', ok: emailVerified },
              { icon: <FaceIcon sx={{ fontSize: 11 }} />, label: 'Face', ok: faceVerificationStatus === 'verified', fail: faceVerificationStatus !== 'verified' },
              { icon: <SignatureIcon sx={{ fontSize: 11 }} />, label: 'Sign', ok: signatureVerified },
            ].map(({ icon, label, ok, fail }) => (
              <Chip
                key={label}
                icon={icon}
                label={`${label}: ${ok ? '✓' : '—'}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  backgroundColor: ok ? '#E8F5E9' : fail ? '#FFEBEE' : '#FFF3E0',
                  color: ok ? '#2E7D32' : fail ? '#D32F2F' : '#F57C00',
                  '& .MuiChip-icon': { marginLeft: '4px' },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Passive Face Verification */}
        {isCallActive && profileImage && (
          <Box sx={{ mb: 1.5 }}>
            <PassiveFaceVerification
              videoElement={customerVideoElement}
              customerPhone={customerPhone}
              callStartTime={callStartTime}
              isCallActive={isCallActive}
              onVerified={markFaceVerified}
            />
          </Box>
        )}

        {/* Tabs: Verification / Services */}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ mb: 1.5 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              mb: 1,
              borderBottom: 1,
              borderColor: 'divider',
              minHeight: 36,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem', minHeight: 36, py: 0.5 },
            }}
          >
            <Tab icon={<VerifiedUserIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Verification" />
            <Tab icon={<ServiceIcon sx={{ fontSize: 16 }} />} iconPosition="start" label="Services" />
          </Tabs>

          {/* Verification Panel */}
          {activeTab === 0 && (
            <Box>
              {showSignatureVerification ? (
                <SignatureVerification customerPhone={customerPhone} onBack={() => setShowSignatureVerification(false)} socket={socket} />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Button fullWidth variant="outlined" onClick={handleOTPRequest} disabled={isRequestingOTP || verificationPending?.phone}
                    startIcon={phoneVerified ? <CheckCircleIcon sx={{ color: '#10B981' }} /> : (isRequestingOTP || verificationPending?.phone) ? <CircularProgress size={16} /> : <PhoneIcon />}
                    sx={btnSx(phoneVerified)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Phone Verification</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{phoneVerified ? 'Verified ✓' : isRequestingOTP || verificationPending?.phone ? 'Sending OTP...' : 'Send OTP to internal phone'}</Typography>
                    </Box>
                  </Button>

                  <Button fullWidth variant="outlined" onClick={handleEmailVerificationRequest} disabled={!resolvedCustomerEmail || isRequestingEmailOTP || verificationPending?.email}
                    startIcon={emailVerified ? <CheckCircleIcon sx={{ color: '#10B981' }} /> : (isRequestingEmailOTP || verificationPending?.email) ? <CircularProgress size={16} /> : <EmailIcon />}
                    sx={btnSx(emailVerified)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Email Verification</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{emailVerified ? 'Verified ✓' : !resolvedCustomerEmail ? 'Email not available' : isRequestingEmailOTP || verificationPending?.email ? 'Sending OTP...' : 'Send OTP to internal email'}</Typography>
                    </Box>
                  </Button>

                  {!profileImage ? (
                    <Box sx={{ py: 0.75, px: 1.5, border: '1px solid #E0E0E0', borderRadius: 1, backgroundColor: '#F8F9FA', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FaceIcon sx={{ color: '#999', fontSize: 18 }} />
                      <Box>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: '#999' }}>Face Verification</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: '#999' }}>Not Available - No profile image</Typography>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ py: 0.75, px: 1.5, border: '1px solid', borderColor: faceVerificationStatus === 'verified' ? '#10B981' : '#E0E0E0', borderRadius: 1, backgroundColor: faceVerificationStatus === 'verified' ? '#F0FDF4' : '#FFFFFF', display: 'flex', alignItems: 'center', gap: 1 }}>
                      {faceVerificationStatus === 'verified' ? <CheckCircleIcon sx={{ color: '#10B981', fontSize: 18 }} /> : <FaceIcon sx={{ color: '#0066FF', fontSize: 18 }} />}
                      <Box>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Face Verification</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{faceVerificationStatus === 'verified' ? 'Verified ✓ - Passive monitoring active' : 'Passive - Auto-verifying...'}</Typography>
                      </Box>
                    </Box>
                  )}

                  <Button fullWidth variant="outlined" onClick={() => setShowSignatureVerification(true)}
                    startIcon={signatureVerified ? <CheckCircleIcon sx={{ color: '#10B981' }} /> : <SignatureIcon />}
                    sx={btnSx(signatureVerified)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                      <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>Signature Verification</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{signatureVerified ? 'Verified ✓' : 'Upload and match signature'}</Typography>
                    </Box>
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Service Panel */}
          {activeTab === 1 && (
            <Box>
              {!selectedAccountNumber && (
                <Alert severity="warning" sx={{ mb: 1, py: 0.25, fontSize: '0.75rem' }}>
                  Select an account below before starting a service.
                </Alert>
              )}
              {showPhoneChange ? (
                <PhoneChangeRequest currentPhone={customerPhone} onBack={() => setShowPhoneChange(false)} />
              ) : showEmailChange ? (
                <EmailChangeRequest currentEmail={resolvedCustomerEmail || customerEmail} onBack={() => setShowEmailChange(false)} />
              ) : showAddressChange ? (
                <AddressChange presentAddress={reduxAccountDetails?.presentAddress || reduxAccountDetails?.address || null} permanentAddress={reduxAccountDetails?.permanentAddress || null} onBack={() => setShowAddressChange(false)} />
              ) : showAccountActivation ? (
                <DormantAccountActivation onBack={() => setShowAccountActivation(false)} />
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  {[
                    { icon: <PhoneIcon />, label: 'Phone Number Change', sub: 'Request new mobile number', onClick: handleRequestPhoneChange },
                    { icon: <EmailIcon />, label: 'Email Change', sub: 'Request new email address', onClick: handleRequestEmailChange },
                    { icon: <HomeIcon />, label: 'Address Change', sub: 'Request address update', onClick: handleRequestAddressChange },
                    { icon: <AccountIcon />, label: 'Dormant Account Activation', sub: 'Activate dormant account', onClick: () => setShowAccountActivation(true) },
                  ].map(({ icon, label, sub, onClick }) => (
                    <Button key={label} fullWidth variant="outlined" disabled={!selectedAccountNumber} onClick={onClick} startIcon={icon}
                      sx={{ py: 0.75, textTransform: 'none', fontWeight: 500, justifyContent: 'flex-start', borderColor: '#E0E0E0', color: '#1A1A1A', backgroundColor: '#FFFFFF', '&:hover': { borderColor: '#0066FF', backgroundColor: '#F0F7FF' } }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1 }}>
                        <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{label}</Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{sub}</Typography>
                      </Box>
                      <EditIcon sx={{ fontSize: 16, color: '#0066FF' }} />
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Accounts / Cards / Loans — tabbed to avoid stacking all three */}
        <Box>
          <Tabs
            value={activeListTab}
            onChange={(e, v) => setActiveListTab(v)}
            variant="fullWidth"
            sx={{
              mb: 0.75,
              minHeight: 32,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', minHeight: 32, py: 0.25 },
            }}
          >
            <Tab icon={<AccountIcon sx={{ fontSize: 14 }} />} iconPosition="start" label={`Accounts (${accounts.length})`} />
            <Tab icon={<CardIcon sx={{ fontSize: 14 }} />} iconPosition="start" label={`Cards (${cards.length})`} />
            <Tab icon={<LoanIcon sx={{ fontSize: 14 }} />} iconPosition="start" label={`Loans (${loans.length})`} />
          </Tabs>

          {/* Accounts */}
          {activeListTab === 0 && (
            accounts.length === 0 ? (
              <Box sx={{ p: 1.5, backgroundColor: '#F8F9FA', borderRadius: 1, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.8rem', color: '#999' }}>No accounts available</Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {accounts.map((account, index) => (
                  <ListItem key={index} onClick={() => { if (onAccountSelect) onAccountSelect(account.id); dispatch(setSelectedAccountNumber(account.id)); }}
                    sx={{ px: 1.5, py: 0.75, mb: 0.5, borderRadius: 1, cursor: 'pointer', border: selectedAccountNumber === account.id ? '2px solid #0066FF' : '2px solid transparent', backgroundColor: selectedAccountNumber === account.id ? '#E8F0FF' : '#F8F9FA', '&:hover': { backgroundColor: selectedAccountNumber === account.id ? '#D4E5FF' : '#E9ECEF' } }}>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <AccountIcon sx={{ color: selectedAccountNumber === account.id ? '#0066FF' : '#666', fontSize: 20 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: selectedAccountNumber === account.id ? '#0066FF' : '#1A1A1A' }}>A/C: {account.id}</Typography>}
                      secondary={<Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{account.type}, {account.branch}</Typography>}
                    />
                    {selectedAccountNumber === account.id ? <CheckCircleIcon sx={{ color: '#0066FF', fontSize: 18 }} /> : <IconButton size="small"><ChevronRightIcon sx={{ fontSize: 18 }} /></IconButton>}
                  </ListItem>
                ))}
              </List>
            )
          )}

          {/* Cards */}
          {activeListTab === 1 && (
            cards.length === 0 ? (
              <Box sx={{ p: 1.5, backgroundColor: '#F8F9FA', borderRadius: 1, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.8rem', color: '#999' }}>No cards available</Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {cards.map((card, index) => (
                  <ListItem key={index} sx={{ px: 1.5, py: 0.75, mb: 0.5, backgroundColor: '#F8F9FA', borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: '#E9ECEF' } }}>
                    <ListItemIcon sx={{ minWidth: 32 }}><CardIcon sx={{ color: '#0066FF', fontSize: 20 }} /></ListItemIcon>
                    <ListItemText
                      primary={<Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{card.number}</Typography>}
                      secondary={<Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{card.type} - {card.category}</Typography>}
                    />
                    <IconButton size="small"><ChevronRightIcon sx={{ fontSize: 18 }} /></IconButton>
                  </ListItem>
                ))}
              </List>
            )
          )}

          {/* Loans */}
          {activeListTab === 2 && (
            loans.length === 0 ? (
              <Box sx={{ p: 1.5, backgroundColor: '#F8F9FA', borderRadius: 1, textAlign: 'center' }}>
                <Typography sx={{ fontSize: '0.8rem', color: '#999' }}>No loans available</Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {loans.map((loan, index) => (
                  <ListItem key={index} sx={{ px: 1.5, py: 0.75, mb: 0.5, backgroundColor: '#F8F9FA', borderRadius: 1, cursor: 'pointer', '&:hover': { backgroundColor: '#E9ECEF' } }}>
                    <ListItemIcon sx={{ minWidth: 32 }}><LoanIcon sx={{ color: '#0066FF', fontSize: 20 }} /></ListItemIcon>
                    <ListItemText
                      primary={<Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{loan.number}</Typography>}
                      secondary={<Typography sx={{ fontSize: '0.7rem', color: '#666' }}>{loan.type} - {loan.category}</Typography>}
                    />
                    <IconButton size="small"><ChevronRightIcon sx={{ fontSize: 18 }} /></IconButton>
                  </ListItem>
                ))}
              </List>
            )
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
