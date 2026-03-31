import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip
} from '@mui/material';
import { ArrowBack, CheckCircle, Visibility } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../../providers/WebSocketProvider';
import { useSelector } from 'react-redux';

const DormantAccountActivation = ({ onBack }) => {
  const { accountDetails } = useSelector((state) => state.customerAccounts);
  const { socket } = useWebSocket();

  const [customerTypedNew, setCustomerTypedNew] = useState('');
  const [customerTypedConfirm, setCustomerTypedConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const typingTimeoutNewRef = useRef(null);
  const typingTimeoutConfirmRef = useRef(null);
  const [customerIsTyping, setCustomerIsTyping] = useState(false);

  // Listen for customer typing events
  useEffect(() => {
    if (!socket) return;
    setIsLoading(true);
    const readyTimer = setTimeout(() => setIsLoading(false), 1500);

    const handleCustomerTypingNew = (data) => {
      setCustomerTypedNew(data.accountNumber);
      setIsLoading(false);
      setError(null);
      setSuccess(false);
      setCustomerIsTyping(true);
      setTimeout(() => setCustomerIsTyping(false), 1000);
    };

    const handleCustomerTypingConfirm = (data) => {
      setCustomerTypedConfirm(data.accountNumber);
      setIsLoading(false);
      setError(null);
      setSuccess(false);
      setCustomerIsTyping(true);
      setTimeout(() => setCustomerIsTyping(false), 1000);
    };

    const handleActivationError = (data) => {
      setSuccess(false);
      setError(data?.message || 'Account activation failed. Please try again.');
    };

    socket.on('customer:typing-account-number-new', handleCustomerTypingNew);
    socket.on('customer:typing-account-number-confirm', handleCustomerTypingConfirm);
    socket.on('error', handleActivationError);

    return () => {
      clearTimeout(readyTimer);
      socket.off('customer:typing-account-number-new', handleCustomerTypingNew);
      socket.off('customer:typing-account-number-confirm', handleCustomerTypingConfirm);
      socket.off('error', handleActivationError);
    };
  }, [socket]);

  const handleValidateAndActivate = () => {
    setError(null);
    setSuccess(false);

    // Validation
    if (!customerTypedNew || !customerTypedConfirm) {
      setError('Customer must enter both fields');
      return;
    }

    if (customerTypedNew !== customerTypedConfirm) {
      setError('Account numbers do not match');
      return;
    }

    if (customerTypedNew !== accountDetails?.accountNumber) {
      setError('Account number does not match customer account');
      return;
    }

    // Success - account validated
    setSuccess(true);
    setError(null);

    // Emit to backend to hit CBS API
    if (socket) {
      socket.emit('manager:approve-account-activation', {
        customerId: accountDetails?.mobileNumber,
        accountNumber: customerTypedNew,
        timestamp: Date.now()
      });
    }
  };

  const isValid = customerTypedNew &&
    customerTypedConfirm &&
    customerTypedNew === customerTypedConfirm &&
    customerTypedNew === accountDetails?.accountNumber;

  return (
    <Box sx={{
      width: '100%',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#FFFFFF',
      borderRadius: '12px',
      border: '1px solid #E0E0E0',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      gap: 2
    }}>
      <Button
        startIcon={<ArrowBack />}
        onClick={onBack}
        sx={{
          alignSelf: 'flex-start',
          color: '#1A1A1A',
          '&:hover': {
            backgroundColor: '#F0F0F0'
          }
        }}
      >
        Back
      </Button>

      <Typography variant="h6" sx={{ color: '#1A1A1A', fontWeight: 'medium' }}>
        Dormant Account Activation
      </Typography>

      {customerIsTyping && (
        <Chip
          icon={<Visibility />}
          label="Customer is typing"
          size="small"
          color="info"
          sx={{ alignSelf: 'flex-start' }}
        />
      )}

      <Divider sx={{ borderColor: '#E0E0E0' }} />

      {/* Customer Account Information */}
      <Box>
        <Typography variant="caption" sx={{ color: '#666' }}>
          Customer Account Number (Expected)
        </Typography>
        <TextField
          fullWidth
          value={accountDetails?.accountNumber || 'N/A'}
          variant="outlined"
          InputProps={{
            readOnly: true,
            sx: { color: '#1A1A1A' }
          }}
          sx={{
            mt: 0.5,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#F5F5F5',
              '& fieldset': {
                borderColor: '#E0E0E0',
              },
            },
          }}
        />
      </Box>

      <Divider sx={{ borderColor: '#E0E0E0' }} />

      {/* Customer Input - New Account Number */}
      <Box>
        <Typography variant="caption" sx={{ color: '#666' }}>
          Customer Entered - Account Number
        </Typography>
        <TextField
          fullWidth
          value={customerTypedNew}
          onChange={(e) => {
            const value = e.target.value;
            setCustomerTypedNew(value);
            setIsLoading(false);
            setError(null);
            setSuccess(false);

            // Emit to customer in real-time (override)
            if (typingTimeoutNewRef.current) clearTimeout(typingTimeoutNewRef.current);
            typingTimeoutNewRef.current = setTimeout(() => {
              if (socket && value) {
                socket.emit('manager:typing-account-number-new', {
                  accountNumber: value,
                  timestamp: Date.now()
                });
              }
            }, 300);
          }}
          variant="outlined"
          placeholder={isLoading ? "Waiting for customer input or type here..." : "Enter account number"}
          helperText="Manager can type here to override customer input (synced to customer)"
          sx={{
            mt: 0.5,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FAFAFA',
              color: '#1A1A1A',
              '& fieldset': {
                borderColor: '#E0E0E0',
              },
              '&:hover fieldset': {
                borderColor: '#BDBDBD',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#0066FF',
                borderWidth: 2,
              },
            },
            '& .MuiFormHelperText-root': {
              color: '#666',
              fontSize: '0.7rem',
            },
          }}
        />
      </Box>

      {/* Customer Input - Confirm Account Number */}
      <Box>
        <Typography variant="caption" sx={{ color: '#666' }}>
          Customer Entered - Confirm Account Number
        </Typography>
        <TextField
          fullWidth
          value={customerTypedConfirm}
          onChange={(e) => {
            const value = e.target.value;
            setCustomerTypedConfirm(value);
            setIsLoading(false);
            setError(null);
            setSuccess(false);

            // Emit to customer in real-time (override)
            if (typingTimeoutConfirmRef.current) clearTimeout(typingTimeoutConfirmRef.current);
            typingTimeoutConfirmRef.current = setTimeout(() => {
              if (socket && value) {
                socket.emit('manager:typing-account-number-confirm', {
                  accountNumber: value,
                  timestamp: Date.now()
                });
              }
            }, 300);
          }}
          variant="outlined"
          placeholder={isLoading ? "Waiting for customer input or type here..." : "Confirm account number"}
          helperText="Manager can type here to override customer input (synced to customer)"
          sx={{
            mt: 0.5,
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#FAFAFA',
              color: '#1A1A1A',
              '& fieldset': {
                borderColor: '#E0E0E0',
              },
              '&:hover fieldset': {
                borderColor: '#BDBDBD',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#0066FF',
                borderWidth: 2,
              },
            },
            '& .MuiFormHelperText-root': {
              color: '#666',
              fontSize: '0.7rem',
            },
          }}
        />
      </Box>

      {/* Validation Status */}
      {!isLoading && customerTypedNew && customerTypedConfirm && (
        <Box>
          {customerTypedNew !== customerTypedConfirm ? (
            <Alert severity="error" sx={{ backgroundColor: 'rgba(244, 67, 54, 0.08)' }}>
              Account numbers do not match
            </Alert>
          ) : customerTypedNew !== accountDetails?.accountNumber ? (
            <Alert severity="error" sx={{ backgroundColor: 'rgba(244, 67, 54, 0.08)' }}>
              Account number does not match expected account
            </Alert>
          ) : (
            <Alert
              severity="success"
              icon={<CheckCircle />}
              sx={{ backgroundColor: 'rgba(76, 175, 80, 0.08)' }}
            >
              Account numbers match! Ready to activate.
            </Alert>
          )}
        </Box>
      )}

      {/* Error Message */}
      {error && (
        <Alert severity="error" sx={{ backgroundColor: 'rgba(244, 67, 54, 0.08)' }}>
          {error}
        </Alert>
      )}

      {/* Success Message */}
      {success && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Alert
            severity="success"
            icon={<CheckCircle />}
            sx={{ backgroundColor: 'rgba(76, 175, 80, 0.08)' }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Success!</Typography>
            Account validated successfully! Customer notified.
          </Alert>

          <Button
            fullWidth
            variant="contained"
            onClick={onBack}
            sx={{
              py: 1.5,
              backgroundColor: '#4CAF50',
              '&:hover': { backgroundColor: '#388E3C' },
              borderRadius: '6px',
              color: 'white',
              fontWeight: 'bold'
            }}
          >
            Done
          </Button>
        </Box>
      )}

      {/* Action Button */}
      {!isLoading && customerTypedNew && customerTypedConfirm && (
        <Button
          fullWidth
          variant="contained"
          onClick={handleValidateAndActivate}
          disabled={!isValid || success}
          startIcon={success ? <CheckCircle /> : null}
          sx={{
            py: 1.5,
            backgroundColor: success ? '#4CAF50' : '#2196F3',
            '&:hover': {
              backgroundColor: success ? '#388E3C' : '#1976D2',
            },
            '&:disabled': {
              backgroundColor: '#81C784',
            },
            borderRadius: '6px',
            color: 'white',
            fontWeight: 'bold'
          }}
        >
          {success ? 'Validated Successfully' : 'Validate & Activate Account'}
        </Button>
      )}

      {/* Status Text */}
      <Typography variant="caption" sx={{ color: '#666', textAlign: 'center' }}>
        {isLoading
          ? "Connecting to customer..."
          : !customerTypedNew && !customerTypedConfirm
            ? "Waiting for customer to enter account numbers"
            : !customerTypedNew || !customerTypedConfirm
              ? "Waiting for customer to complete both fields"
              : isValid
                ? "Ready to validate and activate account"
                : "Account numbers must match expected account"}
      </Typography>
    </Box>
  );
};

DormantAccountActivation.propTypes = {
  onBack: PropTypes.func.isRequired
};

export default DormantAccountActivation;
