import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../../providers/WebSocketProvider';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtpToCustomer } from '../../../redux/auth/customerSlice';

const PhoneChangeRequest = ({ currentPhone, onBack }) => {
  const { accountDetails } = useSelector((state) => state.customerAccounts);
  const { socket } = useWebSocket();
  const dispatch = useDispatch();
  const [customerTypedPhone, setCustomerTypedPhone] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  useEffect(() => {
    if (!socket) return;
    setIsLoading(true);

    const handleCustomerTyping = (data) => {
      setCustomerTypedPhone(data.newPhoneNumber);
      setIsLoading(false);
      setOtpSent(false);
      setError(null);
    };

    socket.on('customer:typing-phone', handleCustomerTyping);

    return () => {
      socket.off('customer:typing-phone', handleCustomerTyping);
    };
  }, [socket, currentPhone]);

  const isValidPhone = customerTypedPhone?.length === 11;

  const handleSendOtpChangePhone = async () => {
    if (!isValidPhone) return;
    
    setIsSendingOtp(true);
    setError(null);
    
    try {
      const response = await dispatch(
        sendOtpToCustomer({ phone: customerTypedPhone })
      );
      
      if (response?.error) {
        throw new Error(response.error.message || 'Failed to send OTP');
      }
      
      setOtpSent(true);
      socket.emit('manager:sent-otp-change-phone', { 
        phone: customerTypedPhone,
        accountNumber: accountDetails.accountNumber,
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
        Customer Phone Number Update
      </Typography>

      <TextField
        fullWidth
        value={currentPhone}
        variant="outlined"
        label="Current Number"
        InputProps={{ readOnly: true }}
      />

      <TextField
        fullWidth
        value={customerTypedPhone}
        onChange={(e) => {
          const value = e.target.value.replace(/\D/g, '').slice(0, 11);
          setCustomerTypedPhone(value);
          setIsLoading(false);
          setOtpSent(false);
          setError(null);

          // Emit to customer in real-time
          if (typingTimeout) clearTimeout(typingTimeout);
          const timeout = setTimeout(() => {
            if (socket && value) {
              socket.emit('manager:typing-phone', {
                newPhoneNumber: value,
                currentPhone,
                timestamp: Date.now()
              });
            }
          }, 300);
          setTypingTimeout(timeout);
        }}
        variant="outlined"
        label="New Phone Number"
        placeholder={isLoading ? "Waiting for customer input or type here..." : "Enter new phone number"}
        helperText="Agent can type here or wait for customer input (synced to customer)"
      />

      {!isLoading && !otpSent && isValidPhone && (
        <Button
          fullWidth
          variant="contained"
          onClick={handleSendOtpChangePhone}
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
          OTP sent successfully to {customerTypedPhone}
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
          : !customerTypedPhone 
            ? "Waiting for customer to enter new number" 
            : !isValidPhone
              ? "Customer must enter 11-digit phone number"
              : "Verify the new number and send OTP"}
      </Typography>
    </Box>
  );
};

PhoneChangeRequest.propTypes = {
  currentPhone: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired
};

export default PhoneChangeRequest;