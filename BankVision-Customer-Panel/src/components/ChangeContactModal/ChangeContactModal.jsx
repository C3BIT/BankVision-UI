import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { useWebSocket } from '../../context/WebSocketContext';
import { debounce } from '../../utils/debounce';
import { publicPost } from '../../services/apiCaller';
import axios from 'axios';

const ChangeContactModal = ({
  open,
  onClose,
  type = 'phone', // 'phone' or 'email'
  currentValue,
  onSubmit,
}) => {
  const { socket } = useWebSocket();
  const [step, setStep] = useState(1); // 1: enter new value, 2: verify OTP
  const [newValue, setNewValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Debounced socket emit for real-time updates to manager - separate events for new and confirm fields (150ms so manager sees typing quickly)
  const emitNewFieldChange = useCallback(
    debounce((value) => {
      if (socket) {
        const eventName = type === 'phone' ? 'typing:phone-number-new' : 'typing:email-new';
        socket.emit(eventName, {
          value: value,
        });
      }
    }, 150),
    [socket, type]
  );

  const emitConfirmFieldChange = useCallback(
    debounce((value) => {
      if (socket) {
        const eventName = type === 'phone' ? 'typing:phone-number-confirm' : 'typing:email-confirm';
        socket.emit(eventName, {
          value: value,
        });
      }
    }, 150),
    [socket, type]
  );

  // Check if phone number is already registered (debounced)
  const checkDuplicatePhone = useCallback(
    debounce(async (phoneNumber) => {
      if (!phoneNumber || phoneNumber.length !== 11) {
        setDuplicateWarning('');
        return;
      }
      // Skip if same as current
      if (phoneNumber === currentValue) return;
      try {
        const response = await publicPost('/customer/find-phone', { phone: phoneNumber });
        if (response?.data && response.data.length > 0) {
          setDuplicateWarning('This phone number is already registered to another account');
        } else {
          setDuplicateWarning('');
        }
      } catch {
        setDuplicateWarning('');
      }
    }, 500),
    [currentValue]
  );

  // Check if email is already registered (debounced)
  const checkDuplicateEmail = useCallback(
    debounce(async (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        setDuplicateWarning('');
        return;
      }
      // Skip if same as current
      if (email.toLowerCase() === currentValue?.toLowerCase()) return;
      try {
        const response = await publicPost('/customer/find-email', { email: email });
        if (response?.data && response.data.length > 0) {
          setDuplicateWarning('This email is already registered to another account');
        } else {
          setDuplicateWarning('');
        }
      } catch {
        setDuplicateWarning('');
      }
    }, 500),
    [currentValue]
  );

  // Trigger duplicate check when new value changes
  useEffect(() => {
    if (type === 'phone' && newValue.length === 11) {
      checkDuplicatePhone(newValue);
    } else if (type === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) {
      checkDuplicateEmail(newValue);
    } else {
      setDuplicateWarning('');
    }
  }, [newValue, type, checkDuplicatePhone, checkDuplicateEmail]);

  // Listen for manager override events - separate handlers for new and confirm fields
  useEffect(() => {
    if (!socket) return;

    const handleManagerTypingNew = (data) => {
      console.log('📝 Manager typing new field:', data);
      if (data.value !== undefined) {
        setNewValue(data.value);
        setStep(1);
        setOtpSent(false);
      }
    };

    const handleManagerTypingConfirm = (data) => {
      console.log('📝 Manager typing confirm field:', data);
      if (data.value !== undefined) {
        setConfirmValue(data.value);
        setStep(1);
        setOtpSent(false);
      }
    };

    const eventNameNew = type === 'phone' ? 'manager:typing-phone-new' : 'manager:typing-email-new';
    const eventNameConfirm = type === 'phone' ? 'manager:typing-phone-confirm' : 'manager:typing-email-confirm';

    socket.on(eventNameNew, handleManagerTypingNew);
    socket.on(eventNameConfirm, handleManagerTypingConfirm);

    return () => {
      socket.off(eventNameNew, handleManagerTypingNew);
      socket.off(eventNameConfirm, handleManagerTypingConfirm);
    };
  }, [socket, type]);

  // Listen for manager-sent OTP events — transition to step 2 automatically
  useEffect(() => {
    if (!socket) return;

    const handlePhoneOtpSent = (data) => {
      console.log('📱 Manager sent phone change OTP:', data);
      if (data.phone) {
        setNewValue(data.phone);
        setConfirmValue(data.phone);
      }
      setOtpSent(true);
      setStep(2);
      setError('');
    };

    const handleEmailOtpSent = (data) => {
      console.log('📧 Manager sent email change OTP:', data);
      if (data.email) {
        setNewValue(data.email);
        setConfirmValue(data.email);
      }
      setOtpSent(true);
      setStep(2);
      setError('');
    };

    if (type === 'phone') {
      socket.on('customer:phone-change-otp-sent', handlePhoneOtpSent);
    } else {
      socket.on('customer:email-change-otp-sent', handleEmailOtpSent);
    }

    return () => {
      socket.off('customer:phone-change-otp-sent', handlePhoneOtpSent);
      socket.off('customer:email-change-otp-sent', handleEmailOtpSent);
    };
  }, [socket, type]);

  const handleRequestOTP = async () => {
    if (!newValue || !confirmValue) {
      setError(`Please fill in all fields`);
      return;
    }

    if (newValue !== confirmValue) {
      setError(`${type === 'phone' ? 'Mobile numbers' : 'Email addresses'} do not match`);
      return;
    }

    // Check if new value is same as current value
    if (type === 'phone') {
      if (newValue === currentValue) {
        setError('New phone number cannot be the same as current phone number');
        return;
      }
    } else {
      if (newValue.trim().toLowerCase() === currentValue?.toLowerCase()) {
        setError('New email cannot be the same as current email');
        return;
      }
    }

    if (type === 'phone') {
      const phoneRegex = /^01[3-9]\d{8}$/;
      if (!phoneRegex.test(newValue)) {
        setError('Please enter a valid Bangladeshi mobile number');
        return;
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newValue)) {
        setError('Please enter a valid email address');
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const endpoint = type === 'phone' ? '/otp/send-phone' : '/otp/send';

      const payload = type === 'phone'
        ? { phone: newValue, checkDuplicate: true }
        : { email: newValue, checkDuplicate: true };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);

      if (response.data.status === 'success') {
        setOtpSent(true);
        setStep(2);
        setError('');
      } else {
        setError(response.data.message || `Failed to send OTP to ${type}`);
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      setError(error.response?.data?.message || `Failed to send OTP to new ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const endpoint = type === 'phone' ? '/otp/verify-phone' : '/otp/verify-email';

      const payload = type === 'phone'
        ? { phone: newValue, otp: otp }
        : { email: newValue, otp: otp };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);

      if (response.data.status === 'success') {
        // OTP verified, now send to manager for approval
        if (socket) {
          socket.emit('customer:submit-change-request', {
            changeType: type,
            newValue: newValue,
            currentValue: currentValue,
            verified: true
          });
        }

        onSubmit(newValue);
        handleClose();
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setNewValue('');
    setConfirmValue('');
    setOtp('');
    setError('');
    setDuplicateWarning('');
    setOtpSent(false);
    setIsLoading(false);
    onClose();
  };

  const handleBack = () => {
    setStep(1);
    setOtp('');
    setError('');
    setOtpSent(false);
  };

  const getTitle = () => {
    if (type === 'phone') return 'Change Mobile Number';
    return 'Change Email';
  };

  const getSubtitle = () => {
    if (type === 'phone') return 'Enter your new 11 digit mobile number';
    return 'Enter your new email address';
  };

  const getPlaceholder = (field) => {
    if (type === 'phone') {
      return field === 'new' ? '01XXXXXXXXX' : '01XXXXXXXXX';
    }
    return field === 'new' ? 'example@email.com' : 'example@email.com';
  };

  const getLabel = (field) => {
    if (type === 'phone') {
      return field === 'new' ? 'New Mobile Number' : 'Confirm New Mobile Number';
    }
    return field === 'new' ? 'New E-mail' : 'Confirm New E-mail';
  };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        handleClose();
      }}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <DialogContent sx={{ p: 4 }}>
        <Typography
          sx={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#0066FF',
            mb: 2,
            textAlign: 'center',
          }}
        >
          {getTitle()}
        </Typography>

        <Typography
          sx={{
            fontSize: '0.875rem',
            color: '#666666',
            mb: 2,
            textAlign: 'center',
          }}
        >
          {step === 1 ? getSubtitle() : `Verify your new ${type}`}
        </Typography>

        {/* Step Indicator */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: step >= 1 ? '#0066FF' : '#E0E0E0',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {step > 1 ? <CheckCircle sx={{ fontSize: 20 }} /> : '1'}
          </Box>
          <Box
            sx={{
              width: 32,
              height: 4,
              alignSelf: 'center',
              backgroundColor: step >= 2 ? '#0066FF' : '#E0E0E0',
              borderRadius: 1,
            }}
          />
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: step >= 2 ? '#0066FF' : '#E0E0E0',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            2
          </Box>
        </Box>

        {/* Current Value Display */}
        {currentValue && step === 1 && (
          <Alert
            severity="info"
            sx={{
              mb: 3,
              '& .MuiAlert-message': {
                width: '100%',
                textAlign: 'center'
              }
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', color: '#666666', mb: 0.5 }}>
              Current {type === 'phone' ? 'Mobile Number' : 'Email'}:
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A1A' }}>
              {type === 'phone' ? `+88${currentValue}` : currentValue}
            </Typography>
          </Alert>
        )}

        {/* Step 1: Enter New Value */}
        {step === 1 && (
          <>
            {/* New Value Input */}
            <Box sx={{ mb: 2 }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#666666',
                  mb: 1,
                }}
              >
                {getLabel('new')}
              </Typography>
              <TextField
                fullWidth
                placeholder={getPlaceholder('new')}
                value={newValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setNewValue(value);
                  setError('');
                  emitNewFieldChange(value);
                }}
                type={type === 'email' ? 'email' : 'tel'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#FFFFFF',
                    '& fieldset': {
                      borderColor: error ? '#FF4444' : '#E0E0E0',
                    },
                    '&:hover fieldset': {
                      borderColor: error ? '#FF4444' : '#0066FF',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: error ? '#FF4444' : '#0066FF',
                      borderWidth: 2,
                    },
                  },
                }}
              />
            </Box>

            {/* Confirm Value Input */}
            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#666666',
                  mb: 1,
                }}
              >
                {getLabel('confirm')}
              </Typography>
              <TextField
                fullWidth
                placeholder={getPlaceholder('confirm')}
                value={confirmValue}
                onChange={(e) => {
                  const value = e.target.value;
                  setConfirmValue(value);
                  setError('');
                  emitConfirmFieldChange(value);
                }}
                type={type === 'email' ? 'email' : 'tel'}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#FFFFFF',
                    '& fieldset': {
                      borderColor: error ? '#FF4444' : '#E0E0E0',
                    },
                    '&:hover fieldset': {
                      borderColor: error ? '#FF4444' : '#0066FF',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: error ? '#FF4444' : '#0066FF',
                      borderWidth: 2,
                    },
                  },
                }}
              />
            </Box>

            {/* Duplicate phone warning */}
            {duplicateWarning && (
              <Alert severity="warning" sx={{ mb: 0 }}>
                <Typography sx={{ fontSize: '0.8rem' }}>
                  {duplicateWarning}
                </Typography>
              </Alert>
            )}
          </>
        )}

        {/* Step 2: Verify OTP */}
        {step === 2 && (
          <>
            <Alert severity="success" sx={{ mb: 3 }}>
              <Typography sx={{ fontSize: '0.875rem' }}>
                OTP sent to {type === 'phone' ? `+88${newValue}` : newValue}
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#666666',
                  mb: 1,
                }}
              >
                Enter 6-Digit OTP
              </Typography>
              <TextField
                fullWidth
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                  setError('');
                }}
                inputProps={{
                  maxLength: 6,
                  style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#FFFFFF',
                    '& fieldset': {
                      borderColor: error ? '#FF4444' : '#E0E0E0',
                    },
                    '&:hover fieldset': {
                      borderColor: error ? '#FF4444' : '#0066FF',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: error ? '#FF4444' : '#0066FF',
                      borderWidth: 2,
                    },
                  },
                }}
              />
            </Box>
          </>
        )}

        {error && (
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#FF4444',
              mb: 2,
              textAlign: 'center',
            }}
          >
            {error}
          </Typography>
        )}

        {/* Buttons */}
        <Box
          sx={{
            display: 'flex',
            gap: 2,
          }}
        >
          <Button
            fullWidth
            onClick={step === 1 ? handleClose : handleBack}
            disabled={isLoading}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontWeight: 500,
              color: '#666666',
              borderColor: '#E0E0E0',
              '&:hover': {
                borderColor: '#999999',
                backgroundColor: 'transparent',
              },
            }}
            variant="outlined"
          >
            {step === 1 ? 'Close' : 'Back'}
          </Button>
          <Button
            fullWidth
            onClick={step === 1 ? handleRequestOTP : handleVerifyOTP}
            disabled={
              isLoading ||
              (step === 1 && (!newValue || !confirmValue || !!duplicateWarning)) ||
              (step === 2 && otp.length !== 6)
            }
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : null}
            sx={{
              py: 1.5,
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#0066FF',
              color: '#FFFFFF',
              '&:hover': {
                backgroundColor: '#0052CC',
              },
              '&.Mui-disabled': {
                backgroundColor: '#E0E0E0',
                color: '#999999',
              },
            }}
            variant="contained"
          >
            {isLoading
              ? 'Processing...'
              : step === 1
                ? 'Send OTP'
                : 'Verify & Submit'}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ChangeContactModal;
