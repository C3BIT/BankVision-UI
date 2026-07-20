import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Dialog,
  DialogContent,
  DialogActions,
  InputAdornment,
} from '@mui/material';
import { ArrowBack, CheckCircle, Visibility, AccountBalance, Cancel as CancelIcon } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useWebSocket } from '../../../providers/WebSocketProvider';
import { useSelector } from 'react-redux';
import { colors } from '../../../styles/tokens';

const DormantAccountActivation = ({ onBack, onActivationComplete }) => {
  const { accountDetails } = useSelector((state) => state.customerAccounts);
  const { socket } = useWebSocket();

  const [customerTypedNew, setCustomerTypedNew] = useState('');
  const [customerTypedConfirm, setCustomerTypedConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const typingTimeoutNewRef = useRef(null);
  const typingTimeoutConfirmRef = useRef(null);
  const [customerIsTyping, setCustomerIsTyping] = useState(false);

  // Compliance fields received from customer
  const [extraFields, setExtraFields] = useState({
    estDepositCount: '',
    estDepositAmount: '',
    estWithdrawCount: '',
    estWithdrawAmount: '',
    dormancyReason: '',
  });

  // Notify customer to show dormant account activation screen
  useEffect(() => {
    if (!socket) return;
    socket.emit('manager:screen-sync', {
      screen: 'accountActivation',
      timestamp: Date.now(),
      accountData: accountDetails ? {
        accountNumber: accountDetails.accountNumber,
        email: accountDetails.email,
        mobileNumber: accountDetails.mobileNumber,
        name: accountDetails.name,
        address: accountDetails.address,
        branch: accountDetails.branch,
      } : null,
    });
  }, [socket, accountDetails]);

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
      setActivating(false);
      setConfirmOpen(false);
      setSuccess(false);
      setError(data?.message || 'Account activation failed. Please try again.');
    };

    const handleActivationSuccess = () => {
      setActivating(false);
      setConfirmOpen(false);
      setSuccess(true);
      setError(null);
    };

    const handleExtraFields = (data) => {
      setExtraFields(prev => ({ ...prev, ...data }));
      setCustomerIsTyping(true);
      setTimeout(() => setCustomerIsTyping(false), 1000);
    };

    socket.on('customer:typing-account-number-new', handleCustomerTypingNew);
    socket.on('customer:typing-account-number-confirm', handleCustomerTypingConfirm);
    socket.on('account:activation-error', handleActivationError);
    socket.on('manager:account-activation-success', handleActivationSuccess);
    socket.on('customer:dormant-extra-fields', handleExtraFields);

    return () => {
      clearTimeout(readyTimer);
      socket.off('customer:typing-account-number-new', handleCustomerTypingNew);
      socket.off('customer:typing-account-number-confirm', handleCustomerTypingConfirm);
      socket.off('account:activation-error', handleActivationError);
      socket.off('manager:account-activation-success', handleActivationSuccess);
      socket.off('customer:dormant-extra-fields', handleExtraFields);
    };
  }, [socket]);

  const handleValidateAndActivate = () => {
    setError(null);
    setSuccess(false);

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

    setConfirmOpen(true);
  };

  const handleConfirmActivation = () => {
    setActivating(true);
    setError(null);
    if (socket) {
      socket.emit('manager:approve-account-activation', {
        customerId: accountDetails?.mobileNumber,
        accountNumber: customerTypedNew,
        ...extraFields,
        timestamp: Date.now(),
      });
    }
  };

  const isValid = customerTypedNew &&
    customerTypedConfirm &&
    customerTypedNew === customerTypedConfirm &&
    customerTypedNew === accountDetails?.accountNumber;

  return (
    <>
      <Box sx={{
        width: '100%',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.surface,
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        gap: 2
      }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={onBack}
          sx={{
            alignSelf: 'flex-start',
            color: colors.textPrimary,
            '&:hover': { backgroundColor: '#F0F0F0' }
          }}
        >
          Back
        </Button>

        <Typography variant="h6" sx={{ color: colors.textPrimary, fontWeight: 'medium' }}>
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

        <Divider sx={{ borderColor: colors.border }} />

        <Box>
          <Typography variant="caption" sx={{ color: '#666' }}>
            Customer Account Number (Expected)
          </Typography>
          <TextField
            fullWidth
            value={accountDetails?.accountNumber || 'N/A'}
            variant="outlined"
            InputProps={{ readOnly: true, sx: { color: colors.textPrimary } }}
            sx={{
              mt: 0.5,
              '& .MuiOutlinedInput-root': {
                backgroundColor: colors.background,
                '& fieldset': { borderColor: colors.border },
              },
            }}
          />
        </Box>

        <Divider sx={{ borderColor: colors.border }} />

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
              if (typingTimeoutNewRef.current) clearTimeout(typingTimeoutNewRef.current);
              typingTimeoutNewRef.current = setTimeout(() => {
                if (socket && value) {
                  socket.emit('manager:typing-account-number-new', {
                    accountNumber: value,
                    timestamp: Date.now(),
                  });
                }
              }, 300);
            }}
            variant="outlined"
            placeholder={isLoading ? 'Waiting for customer input or type here...' : 'Enter account number'}
            helperText="Manager can type here to override customer input (synced to customer)"
            sx={{
              mt: 0.5,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FAFAFA',
                color: colors.textPrimary,
                '& fieldset': { borderColor: colors.border },
                '&:hover fieldset': { borderColor: '#BDBDBD' },
                '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: 2 },
              },
              '& .MuiFormHelperText-root': { color: '#666', fontSize: '0.7rem' },
            }}
          />
        </Box>

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
              if (typingTimeoutConfirmRef.current) clearTimeout(typingTimeoutConfirmRef.current);
              typingTimeoutConfirmRef.current = setTimeout(() => {
                if (socket && value) {
                  socket.emit('manager:typing-account-number-confirm', {
                    accountNumber: value,
                    timestamp: Date.now(),
                  });
                }
              }, 300);
            }}
            variant="outlined"
            placeholder={isLoading ? 'Waiting for customer input or type here...' : 'Confirm account number'}
            helperText="Manager can type here to override customer input (synced to customer)"
            sx={{
              mt: 0.5,
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#FAFAFA',
                color: colors.textPrimary,
                '& fieldset': { borderColor: colors.border },
                '&:hover fieldset': { borderColor: '#BDBDBD' },
                '&.Mui-focused fieldset': { borderColor: colors.primary, borderWidth: 2 },
              },
              '& .MuiFormHelperText-root': { color: '#666', fontSize: '0.7rem' },
            }}
          />
        </Box>

        <Divider sx={{ borderColor: colors.border }} />

        <Typography variant="caption" sx={{ color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Monthly Transaction Estimate (Customer Provided)
        </Typography>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>No. of Deposits / Month</Typography>
            <TextField
              fullWidth size="small"
              value={extraFields.estDepositCount || ''}
              InputProps={{ readOnly: true }}
              placeholder="Waiting for customer..."
              sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { backgroundColor: colors.background } }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>Deposit Amount / Month</Typography>
            <TextField
              fullWidth size="small"
              value={extraFields.estDepositAmount || ''}
              InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start">BDT</InputAdornment> }}
              placeholder="Waiting..."
              sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { backgroundColor: colors.background } }}
            />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>No. of Withdrawals / Month</Typography>
            <TextField
              fullWidth size="small"
              value={extraFields.estWithdrawCount || ''}
              InputProps={{ readOnly: true }}
              placeholder="Waiting for customer..."
              sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { backgroundColor: colors.background } }}
            />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>Withdrawal Amount / Month</Typography>
            <TextField
              fullWidth size="small"
              value={extraFields.estWithdrawAmount || ''}
              InputProps={{ readOnly: true, startAdornment: <InputAdornment position="start">BDT</InputAdornment> }}
              placeholder="Waiting..."
              sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { backgroundColor: colors.background } }}
            />
          </Box>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: '#666' }}>Reason for Account Dormancy</Typography>
          <TextField
            fullWidth size="small" multiline rows={2}
            value={extraFields.dormancyReason || ''}
            InputProps={{ readOnly: true }}
            placeholder="Waiting for customer..."
            sx={{ mt: 0.5, '& .MuiOutlinedInput-root': { backgroundColor: colors.background } }}
          />
        </Box>

        <Divider sx={{ borderColor: colors.border }} />

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
              <Alert severity="success" icon={<CheckCircle />} sx={{ backgroundColor: 'rgba(76, 175, 80, 0.08)' }}>
                Account numbers match! Ready to activate.
              </Alert>
            )}
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ backgroundColor: 'rgba(244, 67, 54, 0.08)' }}>
            {error}
          </Alert>
        )}

        {success && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="success" icon={<CheckCircle />} sx={{ backgroundColor: 'rgba(76, 175, 80, 0.08)' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Success!</Typography>
              Account activated successfully! Customer has been notified.
            </Alert>
            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                // Refresh account/service state the same way phone/email/address
                // approvals do, so stale pre-activation data doesn't linger.
                onActivationComplete?.();
                onBack();
              }}
              sx={{
                py: 1.5,
                backgroundColor: colors.success,
                '&:hover': { backgroundColor: colors.success },
                borderRadius: '6px',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              Done
            </Button>
          </Box>
        )}

        {!isLoading && customerTypedNew && customerTypedConfirm && !success && (
          <Button
            fullWidth
            variant="contained"
            onClick={handleValidateAndActivate}
            disabled={!isValid || activating}
            startIcon={activating ? <CircularProgress size={18} sx={{ color: 'white' }} /> : null}
            sx={{
              py: 1.5,
              backgroundColor: '#2196F3',
              '&:hover': { backgroundColor: colors.primary },
              '&:disabled': { backgroundColor: colors.primary, opacity: 0.85 },
              borderRadius: '6px',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            {activating ? 'Activating…' : 'Validate & Activate Account'}
          </Button>
        )}

        <Typography variant="caption" sx={{ color: '#666', textAlign: 'center' }}>
          {isLoading
            ? 'Connecting to customer...'
            : !customerTypedNew && !customerTypedConfirm
              ? 'Waiting for customer to enter account numbers'
              : !customerTypedNew || !customerTypedConfirm
                ? 'Waiting for customer to complete both fields'
                : isValid
                  ? 'Ready to validate and activate account'
                  : 'Account numbers must match expected account'}
        </Typography>
      </Box>

      {/* Confirmation Dialog — same style as ChangeRequestPanel */}
      <Dialog
        open={confirmOpen}
        onClose={() => !activating && setConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          },
        }}
      >
        <DialogContent sx={{ p: 4 }}>
          {/* Header with icon — matches ChangeRequestPanel layout */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#E3F2FD',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AccountBalance sx={{ fontSize: 40, color: colors.primary }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: colors.textPrimary }}>
                Dormant Account Activation
              </Typography>
              <Typography sx={{ fontSize: '0.875rem', color: colors.textSecondary }}>
                From: {accountDetails?.name || accountDetails?.mobileNumber}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography sx={{ fontSize: '0.875rem', color: colors.textSecondary, mb: 2 }}>
            Manager is requesting to reactivate dormant account:
          </Typography>

          <Box sx={{ backgroundColor: colors.background, borderRadius: 2, p: 2, mb: 2 }}>
            <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 1 }}>
              Account Number:
            </Typography>
            <Typography sx={{ fontSize: '0.875rem', color: colors.textPrimary, fontFamily: 'monospace', letterSpacing: 1 }}>
              {customerTypedNew}
            </Typography>
          </Box>

          {(extraFields.estDepositCount || extraFields.estDepositAmount || extraFields.estWithdrawCount || extraFields.estWithdrawAmount || extraFields.dormancyReason) && (
            <Box sx={{ backgroundColor: colors.background, borderRadius: 2, p: 2, mb: 2 }}>
              <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, mb: 1.5, color: '#444' }}>
                Transaction Estimates &amp; Dormancy Reason
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#888' }}>Deposits / Month</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>{extraFields.estDepositCount || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#888' }}>Deposit Amount</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>BDT {extraFields.estDepositAmount || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#888' }}>Withdrawals / Month</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>{extraFields.estWithdrawCount || '—'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#888' }}>Withdrawal Amount</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>BDT {extraFields.estWithdrawAmount || '—'}</Typography>
                </Box>
              </Box>
              {extraFields.dormancyReason && (
                <Box>
                  <Typography sx={{ fontSize: '0.75rem', color: '#888' }}>Reason for Dormancy</Typography>
                  <Typography sx={{ fontSize: '0.875rem' }}>{extraFields.dormancyReason}</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
            <Button
              fullWidth
              onClick={() => setConfirmOpen(false)}
              disabled={activating}
              startIcon={<CancelIcon />}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                color: colors.error,
                borderColor: colors.error,
                '&:hover': { borderColor: colors.error, backgroundColor: '#FFE5E5' },
              }}
              variant="outlined"
            >
              Cancel
            </Button>
            <Button
              fullWidth
              onClick={handleConfirmActivation}
              disabled={activating}
              startIcon={activating ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <CheckCircle />}
              sx={{
                py: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: colors.success,
                color: '#FFFFFF',
                '&:hover': { backgroundColor: colors.success },
                '&:disabled': { backgroundColor: colors.success, opacity: 0.8 },
              }}
              variant="contained"
            >
              {activating ? 'Activating…' : 'Approve & Activate'}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
};

DormantAccountActivation.propTypes = {
  onBack: PropTypes.func.isRequired,
  onActivationComplete: PropTypes.func,
};

export default DormantAccountActivation;
