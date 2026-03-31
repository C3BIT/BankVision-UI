import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Divider,
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../providers/WebSocketProvider';
import { useSelector } from 'react-redux';
import { publicPost } from '../../services/apiCaller';
import debounce from 'lodash/debounce';

/**
 * Generic manager-side change request panel.
 *
 * Handles:
 *   - Real-time sync from customer typing (both new + confirm fields)
 *   - Manager can override either field and it syncs back to customer
 *   - Duplicate check (debounced)
 *   - Send OTP on behalf of customer
 *   - Verify OTP + call update API + notify customer of completion
 *
 * To support a new service, add its config to changeRequestConfig.js and
 * create a thin wrapper that provides sendOtpFn (see EmailChangeRequest.jsx).
 *
 * @param {object}   config      - Entry from MANAGER_CHANGE_REQUEST_CONFIG
 * @param {string}   currentValue
 * @param {function} onBack
 * @param {function} sendOtpFn  - async (value: string) => void — throws on error
 */
const SimpleManagerChangePanel = ({ config, currentValue, onBack, sendOtpFn }) => {
  const { accountDetails, selectedAccountNumber } = useSelector((state) => state.customerAccounts);
  const { socket } = useWebSocket();

  const [newValue, setNewValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const typingTimeoutNewRef = useRef(null);
  const typingTimeoutConfirmRef = useRef(null);

  // ── Duplicate check ────────────────────────────────────────────────────────
  const checkDuplicate = useCallback(
    debounce(async (value) => {
      if (!config.validate(value) || value === currentValue) {
        setDuplicateWarning('');
        return;
      }
      setIsCheckingDuplicate(true);
      try {
        const response = await publicPost(
          config.duplicateCheckEndpoint,
          config.duplicateCheckPayload(value)
        );
        const data = response?.data?.data ?? response?.data ?? [];
        const exists = Array.isArray(data) ? data.length > 0 : Boolean(data);
        setDuplicateWarning(
          exists ? `This ${config.serviceKey} is already registered to another account` : ''
        );
      } catch {
        setDuplicateWarning('');
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 500),
    [config, currentValue]
  );

  useEffect(() => {
    if (config.validate(newValue)) checkDuplicate(newValue);
    else setDuplicateWarning('');
  }, [newValue, checkDuplicate, config]);

  // ── Listen for customer typing ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    setIsLoading(true);
    const readyTimer = setTimeout(() => setIsLoading(false), 1500);

    const handleCustomerTypingNew = (data) => {
      setNewValue(data.value);
      setIsLoading(false);
      setOtpSent(false);
      setError(null);
    };
    const handleCustomerTypingConfirm = (data) => {
      setConfirmValue(data.value);
      setIsLoading(false);
      setOtpSent(false);
      setError(null);
    };

    socket.on(config.customerTypingNewEvent, handleCustomerTypingNew);
    socket.on(config.customerTypingConfirmEvent, handleCustomerTypingConfirm);

    return () => {
      clearTimeout(readyTimer);
      socket.off(config.customerTypingNewEvent, handleCustomerTypingNew);
      socket.off(config.customerTypingConfirmEvent, handleCustomerTypingConfirm);
    };
  }, [socket, config]);

  // ── Derived validation state ───────────────────────────────────────────────
  // Use selectedAccountNumber (set synchronously on click) as primary guard,
  // fall back to accountDetails.accountNumber if the sync value is somehow missing.
  const hasAccountSelected = Boolean(selectedAccountNumber || accountDetails?.accountNumber);
  const isValid = config.validate(newValue) && config.validate(confirmValue);
  const valuesMatch = newValue === confirmValue;
  const isSameAsCurrent = newValue === currentValue;
  const canSubmit =
    !isLoading && !otpSent && !verified && hasAccountSelected &&
    isValid && valuesMatch && !isSameAsCurrent && !duplicateWarning && !isCheckingDuplicate;

  // ── Emit manager typing to customer ───────────────────────────────────────
  const emitManagerTyping = (eventName, value, timeoutRef) => {
    if (!socket) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      socket.emit(eventName, { value, timestamp: Date.now() });
    }, 300);
  };

  // ── OTP send ──────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!canSubmit) return;
    setIsSendingOtp(true);
    setError(null);
    try {
      await sendOtpFn(newValue);
      setOtpSent(true);
      setOtp('');
      if (socket) {
        socket.emit(
          config.otpSentSocketEvent,
          config.otpSentPayload(newValue, accountDetails)
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ── OTP verify + update ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    setIsVerifying(true);
    setError(null);
    try {
      const verifyResponse = await publicPost(
        config.verifyOtpEndpoint,
        config.verifyOtpPayload(newValue, otp)
      );

      const isOtpSuccess =
        verifyResponse?.status === 'success' ||
        verifyResponse?.data?.isVerified ||
        verifyResponse?.isVerified;

      if (!isOtpSuccess) throw new Error(verifyResponse?.message || 'Verification failed');

      // OTP confirmed — hand off to the approval dialog (ChangeRequestPanel).
      // CBS update happens there so all change types go through one approval path.
      setVerified(true);

      if (socket) {
        socket.emit('customer:submit-change-request', {
          changeType: config.submitChangeType,
          newValue,
          currentValue,
          accountNumber: accountDetails?.accountNumber,
          verified: true,
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{
      width: '100%', padding: '20px', display: 'flex', flexDirection: 'column',
      backgroundColor: '#FFFFFF', borderRadius: '12px',
      border: '1px solid #E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', gap: 2,
    }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{ alignSelf: 'flex-start', color: '#1A1A1A', '&:hover': { backgroundColor: '#F0F0F0' } }}
      >
        Back
      </Button>

      <Typography variant="h6" sx={{ color: '#1A1A1A', fontWeight: 'medium' }}>
        {config.label}
      </Typography>

      <Divider sx={{ borderColor: '#E0E0E0' }} />

      {/* Current value (read-only) */}
      <Box>
        <Typography variant="caption" sx={{ color: '#666' }}>{config.currentLabel}</Typography>
        <TextField
          fullWidth value={currentValue || 'Not available'} variant="outlined"
          InputProps={{ readOnly: true, sx: { color: '#1A1A1A' } }}
          sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { backgroundColor: '#F5F5F5', '& fieldset': { borderColor: '#E0E0E0' } } }}
        />
      </Box>

      <Divider sx={{ borderColor: '#E0E0E0' }} />

      {/* New value */}
      <Box>
        <Typography variant="caption" sx={{ color: '#666' }}>
          {config.fieldLabel} (Customer Typing)
        </Typography>
        <TextField
          fullWidth value={newValue} variant="outlined" type={config.fieldType}
          disabled={verified}
          placeholder={isLoading ? 'Waiting for customer or type here...' : `Enter ${config.fieldLabel.toLowerCase()}`}
          helperText="Manager can type/edit — synced to customer in real-time"
          inputProps={config.inputProps}
          onChange={(e) => {
            const value = config.preprocessInput(e.target.value);
            setNewValue(value);
            setIsLoading(false); setOtpSent(false); setError(null);
            emitManagerTyping(config.managerEmitEvent, value, typingTimeoutNewRef);
          }}
          sx={{
            mt: 0.5,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FAFAFA', color: '#1A1A1A',
              '& fieldset': { borderColor: '#E0E0E0' },
              '&:hover fieldset': { borderColor: '#BDBDBD' },
              '&.Mui-focused fieldset': { borderColor: '#0066FF', borderWidth: 2 },
            },
            '& .MuiFormHelperText-root': { color: '#666', fontSize: '0.7rem' },
          }}
        />
      </Box>

      {/* Confirm value */}
      <Box>
        <Typography variant="caption" sx={{ color: '#666' }}>
          {config.confirmLabel} (Customer Typing)
        </Typography>
        <TextField
          fullWidth value={confirmValue} variant="outlined" type={config.fieldType}
          disabled={verified}
          placeholder={isLoading ? 'Waiting for customer or type here...' : `Confirm ${config.fieldLabel.toLowerCase()}`}
          helperText="Manager can type/edit — synced to customer in real-time"
          inputProps={config.inputProps}
          onChange={(e) => {
            const value = config.preprocessInput(e.target.value);
            setConfirmValue(value);
            setIsLoading(false); setOtpSent(false); setError(null);
            emitManagerTyping(config.managerConfirmEmitEvent, value, typingTimeoutConfirmRef);
          }}
          sx={{
            mt: 0.5,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FAFAFA', color: '#1A1A1A',
              '& fieldset': { borderColor: '#E0E0E0' },
              '&:hover fieldset': { borderColor: '#BDBDBD' },
              '&.Mui-focused fieldset': { borderColor: '#0066FF', borderWidth: 2 },
            },
            '& .MuiFormHelperText-root': { color: '#666', fontSize: '0.7rem' },
          }}
        />
      </Box>

      {/* Validation status */}
      {newValue && confirmValue && (
        <Box>
          {!valuesMatch ? (
            <Alert severity="error" sx={{ backgroundColor: 'rgba(244,67,54,0.08)' }}>{config.noMatchMessage}</Alert>
          ) : !isValid ? (
            <Alert severity="warning" sx={{ backgroundColor: 'rgba(255,152,0,0.08)' }}>{config.invalidMessage}</Alert>
          ) : isSameAsCurrent ? (
            <Alert severity="error" sx={{ backgroundColor: 'rgba(244,67,54,0.08)' }}>{config.isSameMessage}</Alert>
          ) : isCheckingDuplicate ? (
            <Alert severity="info" sx={{ backgroundColor: 'rgba(33,150,243,0.08)' }}>Checking {config.serviceKey}...</Alert>
          ) : duplicateWarning ? (
            <Alert severity="warning" sx={{ backgroundColor: 'rgba(255,152,0,0.08)' }}>{duplicateWarning}</Alert>
          ) : (
            <Alert severity="success" sx={{ backgroundColor: 'rgba(76,175,80,0.08)' }}>{config.matchMessage}</Alert>
          )}
        </Box>
      )}

      {/* Account not selected warning */}
      {!hasAccountSelected && (
        <Alert severity="warning" sx={{ backgroundColor: 'rgba(255,152,0,0.08)' }}>
          No account selected. Please scroll down to the <strong>Account List</strong> section and click the customer&apos;s account before proceeding.
        </Alert>
      )}

      {/* Submit on behalf button */}
      {canSubmit && (
        <Button
          fullWidth variant="contained" onClick={handleSendOtp} disabled={isSendingOtp}
          sx={{
            py: 1.5, backgroundColor: '#2196F3', borderRadius: '6px', color: 'white', fontWeight: 'bold',
            '&:hover': { backgroundColor: '#1976D2' },
            '&:disabled': { backgroundColor: '#90CAF9' },
          }}
        >
          {isSendingOtp ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Submit on Behalf of Customer & Send OTP'}
        </Button>
      )}

      {/* OTP entry */}
      {otpSent && !verified && (
        <>
          <Alert severity="success" sx={{ backgroundColor: 'rgba(76,175,80,0.08)' }}>
            OTP sent successfully to {accountDetails?.mobileNumber}
          </Alert>
          <Divider sx={{ borderColor: '#E0E0E0' }} />
          <Box>
            <Typography variant="caption" sx={{ color: '#666' }}>Enter 6-Digit OTP</Typography>
            <TextField
              fullWidth value={otp} variant="outlined" placeholder="000000"
              inputProps={{ maxLength: 6, style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' } }}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
              sx={{
                mt: 0.5,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#FAFAFA', color: '#1A1A1A',
                  '& fieldset': { borderColor: '#E0E0E0' },
                  '&.Mui-focused fieldset': { borderColor: '#0066FF', borderWidth: 2 },
                },
              }}
            />
          </Box>
          <Button
            fullWidth variant="contained" onClick={handleVerifyOtp}
            disabled={isVerifying || otp.length !== 6}
            sx={{
              py: 1.5, backgroundColor: '#4CAF50', borderRadius: '6px', color: 'white', fontWeight: 'bold',
              '&:hover': { backgroundColor: '#388E3C' },
              '&:disabled': { backgroundColor: '#A5D6A7' },
            }}
          >
            {isVerifying ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Verify OTP & Submit Change'}
          </Button>
        </>
      )}

      {/* Success */}
      {verified && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert severity="success" sx={{ backgroundColor: 'rgba(76, 175, 80, 0.08)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>OTP Verified!</Typography>
            {config.submitChangeType} change submitted for approval.
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#666' }}>
              Please complete the approval in the approval dialog above, then return to services.
            </Typography>
          </Alert>
          <Button
            fullWidth variant="contained" onClick={onBack}
            sx={{ py: 1.5, backgroundColor: '#4CAF50', borderRadius: '6px', color: 'white', fontWeight: 'bold', '&:hover': { backgroundColor: '#388E3C' } }}
          >
            Back to Services
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ backgroundColor: 'rgba(244,67,54,0.08)' }}>{error}</Alert>
      )}

      <Typography variant="caption" sx={{ color: '#666', textAlign: 'center' }}>
        {isLoading
          ? 'Connecting to customer...'
          : !newValue && !confirmValue
            ? `Waiting for customer to enter ${config.fieldLabel.toLowerCase()} or type to override`
            : !isValid
              ? config.invalidMessage
              : !valuesMatch
                ? config.noMatchMessage
                : verified
                  ? 'Verification complete'
                  : 'Ready to submit on behalf of customer'}
      </Typography>
    </Box>
  );
};

SimpleManagerChangePanel.propTypes = {
  config: PropTypes.shape({
    serviceKey: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    fieldLabel: PropTypes.string.isRequired,
    confirmLabel: PropTypes.string.isRequired,
    fieldType: PropTypes.string.isRequired,
    currentLabel: PropTypes.string.isRequired,
    managerEmitEvent: PropTypes.string.isRequired,
    managerConfirmEmitEvent: PropTypes.string.isRequired,
    customerTypingNewEvent: PropTypes.string.isRequired,
    customerTypingConfirmEvent: PropTypes.string.isRequired,
    otpSentSocketEvent: PropTypes.string.isRequired,
    submitChangeType: PropTypes.string.isRequired,
    verifyOtpEndpoint: PropTypes.string.isRequired,
    verifyOtpPayload: PropTypes.func.isRequired,
    updateEndpoint: PropTypes.string.isRequired,
    updatePayload: PropTypes.func.isRequired,
    duplicateCheckEndpoint: PropTypes.string.isRequired,
    duplicateCheckPayload: PropTypes.func.isRequired,
    otpSentPayload: PropTypes.func.isRequired,
    validate: PropTypes.func.isRequired,
    preprocessInput: PropTypes.func.isRequired,
    matchMessage: PropTypes.string.isRequired,
    noMatchMessage: PropTypes.string.isRequired,
    invalidMessage: PropTypes.string.isRequired,
    isSameMessage: PropTypes.string.isRequired,
    inputProps: PropTypes.object,
  }).isRequired,
  currentValue: PropTypes.string,
  onBack: PropTypes.func.isRequired,
  sendOtpFn: PropTypes.func.isRequired,
};

export default SimpleManagerChangePanel;
