import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../../providers/WebSocketProvider';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtpToCustomer } from '../../../redux/auth/customerSlice';

const EmailChangeRequest = ({ currentEmail, onBack }) => {
  const { accountDetails } = useSelector((state) => state.customerAccounts);
  const { socket } = useWebSocket();
  const dispatch = useDispatch();
  const [customerTypedEmail, setCustomerTypedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  useEffect(() => {
    if (!socket) return;
    setIsLoading(true);

    const handleCustomerTyping = (data) => {
      setCustomerTypedEmail(data.newEmail);
      setIsLoading(false);
      setOtpSent(false);
      setError(null);
    };

    socket.on('customer:typing-email', handleCustomerTyping);

    return () => {
      socket.off('customer:typing-email', handleCustomerTyping);
    };
  }, [socket, currentEmail]);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerTypedEmail);

  const handleSendOtpChangeEmail = async () => {
    if (!isValidEmail) return;

    setIsSendingOtp(true);
    setError(null);

    try {
      const response = await dispatch(
        sendOtpToCustomer({ phone: accountDetails?.mobileNumber })
      );

      if (response?.error) {
        throw new Error(response.error.message || 'Failed to send OTP');
      }

      setOtpSent(true);
      socket.emit('manager:sent-otp-change-email', {
        email: customerTypedEmail,
        phone: accountDetails?.mobileNumber,
        accountNumber: accountDetails?.accountNumber,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsSendingOtp(false);
    }
  };

  return (
    <Box sx={{
      width: '100%',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '12px',
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      gap: 2
    }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{
          alignSelf: 'flex-start',
          color: 'white',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        Back
      </Button>

      <Typography variant="h6" sx={{ color: 'white', fontWeight: 'medium' }}>
        Customer Email Update
      </Typography>

      <TextField
        fullWidth
        value={currentEmail || 'Not available'}
        variant="outlined"
        label="Current Email"
        InputProps={{ readOnly: true }}
      />

      <TextField
        fullWidth
        value={customerTypedEmail}
        onChange={(e) => {
          const value = e.target.value;
          setCustomerTypedEmail(value);
          setIsLoading(false);
          setOtpSent(false);
          setError(null);

          // Emit to customer in real-time
          if (typingTimeout) clearTimeout(typingTimeout);
          const timeout = setTimeout(() => {
            if (socket && value) {
              socket.emit('manager:typing-email', {
                newEmail: value,
                currentEmail,
                timestamp: Date.now()
              });
            }
          }, 300);
          setTypingTimeout(timeout);
        }}
        variant="outlined"
        label="New Email"
        placeholder={isLoading ? "Waiting for customer input or type here..." : "Enter new email"}
        helperText="Agent can type here or wait for customer input (synced to customer)"
      />

      {!isLoading && !otpSent && isValidEmail && (
        <Button
          fullWidth
          variant="contained"
          onClick={handleSendOtpChangeEmail}
          disabled={isSendingOtp}
          sx={{
            py: 1.5,
            backgroundColor: '#4CAF50',
            '&:hover': {
              backgroundColor: '#388E3C',
            },
            '&:disabled': {
              backgroundColor: '#81C784',
            },
            borderRadius: '6px',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {isSendingOtp ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            'Send OTP to Customer'
          )}
        </Button>
      )}

      {otpSent && (
        <Alert severity="success">
          OTP sent successfully to {accountDetails?.mobileNumber}
        </Alert>
      )}

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
        {isLoading
          ? "Connecting to customer..."
          : !customerTypedEmail
            ? "Waiting for customer to enter new email"
            : !isValidEmail
              ? "Customer must enter a valid email address"
              : "Verify the new email and send OTP"}
      </Typography>
    </Box>
  );
};

EmailChangeRequest.propTypes = {
  currentEmail: PropTypes.string,
  onBack: PropTypes.func.isRequired
};

export default EmailChangeRequest;