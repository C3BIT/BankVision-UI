import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Slide,
  useMediaQuery,
  useTheme,
  Alert,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const VerificationModal = ({
  open,
  onClose,
  type = 'phone', // 'phone', 'email', 'identity'
  title,
  subtitle,
  onVerify,
  onResend, // Callback to resend OTP
  isLoading = false,
  success = false,
  errorMessage = '', // External error message from parent
  onResetErrorMessage, // Add this new prop
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Combine internal validation error and external error message for immediate display
  const displayError = error || errorMessage;

  useEffect(() => {
    if (success) {
      // Auto close after success
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [success, onClose]);

  useEffect(() => {
    if (open) {
      setOtp(['', '', '', '', '', '']); // Clear OTP inputs when modal opens
      setError(''); // Clear any previous error
      // Focus first input after a short delay to ensure it's rendered
      const timer = setTimeout(() => {
        const firstInput = document.getElementById('otp-input-0');
        if (firstInput) firstInput.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Clear OTP inputs when external error arrives so user can retry cleanly
  useEffect(() => {
    if (errorMessage) {
      setOtp(['', '', '', '', '', '']);
      // Focus first input for retry
      setTimeout(() => {
        const firstInput = document.getElementById('otp-input-0');
        if (firstInput) firstInput.focus();
      }, 100);
    }
  }, [errorMessage]);

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(''); // Clear internal error state

    if (onResetErrorMessage) { // Call parent's reset function if provided
      onResetErrorMessage();
    }

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    try {
      await onVerify(otpValue);
    } catch (err) {
      // Set error directly — no prop-passing delay
      setError(err.message || 'Verification failed. Please try again.');
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        const firstInput = document.getElementById('otp-input-0');
        if (firstInput) firstInput.focus();
      }, 100);
    }
  };

  const handleResend = async () => {
    // Clear OTP inputs
    setOtp(['', '', '', '', '', '']);
    setError('');

    // Call parent's resend function to actually send new OTP
    if (onResend) {
      try {
        await onResend();
      } catch (error) {
        console.error('Error resending OTP:', error);
        setError('Failed to resend OTP. Please try again.');
      }
    }

    // Focus first input
    const firstInput = document.getElementById('otp-input-0');
    if (firstInput) firstInput.focus();
  };

  const handleClose = () => {
    setOtp(['', '', '', '', '', '']);
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={(event, reason) => {
        // Prevent closing when tapping backdrop or pressing Escape
        // Only allow close via the buttons (programmatic close)
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        }
        handleClose();
      }}
      disableEscapeKeyDown
      maxWidth="xs"
      fullWidth
      TransitionComponent={isMobile ? Transition : undefined}
      sx={{
        '& .MuiDialog-container': isMobile ? {
          alignItems: 'flex-end',
        } : {},
      }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? '16px 16px 0 0' : 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          margin: isMobile ? 0 : 2,
          maxHeight: isMobile ? '80vh' : '90vh',
          width: isMobile ? '100%' : 'auto',
        },
      }}
    >
      <DialogContent sx={{ p: { xs: 3, sm: 4 }, textAlign: 'center' }}>
        {isLoading ? (
          <Box sx={{ py: 4 }}>
            <Typography
              sx={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#0066FF',
                mb: 3,
              }}
            >
              Verification
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#666666',
                mb: 4,
              }}
            >
              Verifying
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                gap: 1,
                mb: 4,
              }}
            >
              {[0, 1, 2].map((index) => (
                <Box
                  key={index}
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#0066FF',
                    animation: 'bounce 1.4s infinite ease-in-out',
                    animationDelay: `${index * 0.16}s`,
                    '@keyframes bounce': {
                      '0%, 80%, 100%': {
                        transform: 'scale(0)',
                        opacity: 0.5,
                      },
                      '40%': {
                        transform: 'scale(1)',
                        opacity: 1,
                      },
                    },
                  }}
                />
              ))}
            </Box>
            <Button
              onClick={handleClose}
              sx={{
                color: '#666666',
                textTransform: 'none',
                fontWeight: 500,
              }}
            >
              Close
            </Button>
          </Box>
        ) : success ? (
          <Box sx={{ py: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                backgroundColor: '#4CAF50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle sx={{ fontSize: 48, color: '#FFFFFF' }} />
            </Box>
            <Typography
              sx={{
                fontSize: '1.125rem',
                fontWeight: 600,
                color: '#1A1A1A',
                mb: 1,
              }}
            >
              Updated Successfully
            </Typography>
            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#666666',
              }}
            >
              Present account is activate successfully
            </Typography>
          </Box>
        ) : (
          <>
            <Typography
              sx={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: '#0066FF',
                mb: 2,
              }}
            >
              {title || 'Verification'}
            </Typography>

            <Typography
              sx={{
                fontSize: '0.875rem',
                color: '#666666',
                mb: 4,
              }}
            >
              {subtitle || 'Enter the 6 digit code sent to'}
            </Typography>

            {/* OTP Input Boxes */}
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, sm: 2 },
                justifyContent: 'center',
                mb: 3,
              }}
            >
              {otp.map((digit, index) => (
                <TextField
                  key={index}
                  id={`otp-input-${index}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  inputProps={{
                    maxLength: 1,
                    style: {
                      textAlign: 'center',
                      fontSize: isMobile ? '1.25rem' : '1.5rem',
                      fontWeight: 600,
                      padding: isMobile ? '12px 0' : '16px 0',
                    },
                  }}
                  sx={{
                    width: { xs: 45, sm: 60 },
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '& fieldset': {
                        borderColor: displayError ? '#FF4444' : '#E0E0E0',
                        borderWidth: 2,
                      },
                      '&:hover fieldset': {
                        borderColor: displayError ? '#FF4444' : '#0066FF',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: displayError ? '#FF4444' : '#0066FF',
                      },
                    },
                  }}
                />
              ))}
            </Box>

            {displayError && (
              <Alert
                severity="error"
                sx={{
                  mb: 2,
                  fontSize: '0.8125rem',
                  borderRadius: 2,
                  textAlign: 'left'
                }}
                onClose={() => {
                  setError('');
                  if (onResetErrorMessage) onResetErrorMessage();
                }}
              >
                {displayError}
              </Alert>
            )}

            {/* Resend Link */}
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: '#666666',
                mb: 3,
              }}
            >
              Didn't Get it? <Box component="span" onClick={handleResend} sx={{ color: '#0066FF', cursor: 'pointer', fontWeight: 500 }}>Resend Code</Box>
            </Typography>

            {/* Buttons */}
            <Box
              sx={{
                display: 'flex',
                gap: 2,
              }}
            >
              <Button
                fullWidth
                onClick={handleClose}
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
                Close
              </Button>
              <Button
                fullWidth
                onClick={handleVerify}
                disabled={otp.join('').length !== 6}
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
                Verify
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VerificationModal;
