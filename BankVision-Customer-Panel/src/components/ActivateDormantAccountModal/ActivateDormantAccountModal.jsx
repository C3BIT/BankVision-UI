import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Chip,
} from '@mui/material';
import { CheckCircle, Visibility } from '@mui/icons-material';
import { useWebSocket } from '../../context/WebSocketContext';

// Debounce utility
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

const ActivateDormantAccountModal = ({ open, onClose, accountNumber, onContinue, onBack }) => {
  const { socket } = useWebSocket();
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [reEnterAccountNumber, setReEnterAccountNumber] = useState('');
  const [error, setError] = useState('');
  const [managerIsTyping, setManagerIsTyping] = useState(false);

  // Debounced emit for customer typing - new account number field
  const emitTypingNew = useCallback(
    debounce((value) => {
      if (socket) {
        socket.emit('typing:account-number-new', {
          accountNumber: value,
        });
      }
    }, 300),
    [socket]
  );

  // Debounced emit for customer typing - confirm account number field
  const emitTypingConfirm = useCallback(
    debounce((value) => {
      if (socket) {
        socket.emit('typing:account-number-confirm', {
          accountNumber: value,
        });
      }
    }, 300),
    [socket]
  );

  // Listen for manager override events
  useEffect(() => {
    if (!socket) return;

    const handleManagerTypingNew = (data) => {
      setConfirmAccountNumber(data.accountNumber);
      setManagerIsTyping(true);
      setTimeout(() => setManagerIsTyping(false), 1000);
    };

    const handleManagerTypingConfirm = (data) => {
      setReEnterAccountNumber(data.accountNumber);
      setManagerIsTyping(true);
      setTimeout(() => setManagerIsTyping(false), 1000);
    };

    const handleAccountActivated = (data) => {
      // Auto-confirm both fields with the activated account number and proceed
      setConfirmAccountNumber(data.accountNumber);
      setReEnterAccountNumber(data.accountNumber);
      setError('');
    };

    socket.on('manager:typing-account-number-new', handleManagerTypingNew);
    socket.on('manager:typing-account-number-confirm', handleManagerTypingConfirm);
    socket.on('customer:account-activated', handleAccountActivated);

    return () => {
      socket.off('manager:typing-account-number-new', handleManagerTypingNew);
      socket.off('manager:typing-account-number-confirm', handleManagerTypingConfirm);
      socket.off('customer:account-activated', handleAccountActivated);
    };
  }, [socket]);

  const handleContinue = () => {
    if (!confirmAccountNumber || !reEnterAccountNumber) {
      setError('Please fill in all fields');
      return;
    }

    if (confirmAccountNumber !== accountNumber) {
      setError('Account number does not match');
      return;
    }

    if (reEnterAccountNumber !== accountNumber) {
      setError('Re-entered account number does not match');
      return;
    }

    onContinue(confirmAccountNumber);
  };

  const handleClose = () => {
    setConfirmAccountNumber('');
    setReEnterAccountNumber('');
    setError('');
    onClose();
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
          Activate Dorment Account
        </Typography>

        {/* Manager visibility indicator */}
        {managerIsTyping && (
          <Chip
            icon={<Visibility />}
            label="Manager is assisting"
            size="small"
            color="primary"
            sx={{ mb: 2 }}
          />
        )}

        {/* Your dormant account label */}
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#666666',
            mb: 2,
          }}
        >
          Your dormant account
        </Typography>

        {/* Helper text */}
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: '#999999',
            mb: 2,
            fontStyle: 'italic',
          }}
        >
          Manager can see and correct your input in real-time
        </Typography>

        {/* Account Number (read-only) */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#999999',
              mb: 0.5,
            }}
          >
            Account Number
          </Typography>
          <TextField
            fullWidth
            value={accountNumber || ''}
            disabled
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#F5F5F5',
                fontSize: '0.875rem',
                '& fieldset': {
                  borderColor: '#E0E0E0',
                },
              },
              '& .Mui-disabled': {
                color: '#999999',
                WebkitTextFillColor: '#999999',
              },
            }}
          />
        </Box>

        {/* Confirm Account Number label */}
        <Typography
          sx={{
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#666666',
            mb: 2,
          }}
        >
          Confirm Account Number
        </Typography>

        {/* Account Number input */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#999999',
              mb: 0.5,
            }}
          >
            Account Number
          </Typography>
          <TextField
            fullWidth
            placeholder="Account Number"
            value={confirmAccountNumber}
            onChange={(e) => {
              const value = e.target.value;
              setConfirmAccountNumber(value);
              setError('');
              emitTypingNew(value);
            }}
            error={!!error}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FFFFFF',
                fontSize: '0.875rem',
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

        {/* Re-enter */}
        <Box sx={{ mb: 2 }}>
          <Typography
            sx={{
              fontSize: '0.75rem',
              color: '#999999',
              mb: 0.5,
            }}
          >
            Re-enter
          </Typography>
          <TextField
            fullWidth
            placeholder="870245716212345"
            value={reEnterAccountNumber}
            onChange={(e) => {
              const value = e.target.value;
              setReEnterAccountNumber(value);
              setError('');
              emitTypingConfirm(value);
            }}
            error={!!error}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FFFFFF',
                fontSize: '0.875rem',
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
            flexDirection: onBack ? 'column' : 'row',
          }}
        >
          {onBack && (
            <Button
              fullWidth
              onClick={onBack}
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
              Back to Services
            </Button>
          )}
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
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
              onClick={handleContinue}
              disabled={!confirmAccountNumber || !reEnterAccountNumber}
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
              Continue
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ActivateDormantAccountModal;
