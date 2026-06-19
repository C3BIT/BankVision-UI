import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, TextField, CircularProgress, Alert, Collapse, IconButton, InputAdornment, Chip, Button } from '@mui/material';
import { CheckCircle, HourglassEmpty } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

const debounce = (func, delay) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), delay); };
};

const inputSx = {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: '6px',
    '& .MuiOutlinedInput-root': {
        '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.6)' },
        '&.Mui-focused fieldset': { borderColor: '#7C3AED', borderWidth: '1.5px' },
        '&.Mui-error fieldset': { borderColor: '#D32F2F' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#7C3AED' },
    '& .MuiInputAdornment-root p': { color: '#666', fontSize: '0.85rem', fontWeight: 500 },
};

const DormantAccountActivationRequest = ({ socket }) => {
    const { accountDetails } = useSelector((state) => state.customerInfo);
    const [confirmValue, setConfirmValue] = useState('');
    const [reenterValue, setReenterValue] = useState('');
    const [activated, setActivated] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const managerTypingTimer = useRef(null);
    const [managerIsTyping, setManagerIsTyping] = useState(false);

    const [estDepositCount, setEstDepositCount] = useState('');
    const [estDepositAmount, setEstDepositAmount] = useState('');
    const [estWithdrawCount, setEstWithdrawCount] = useState('');
    const [estWithdrawAmount, setEstWithdrawAmount] = useState('');
    const [dormancyReason, setDormancyReason] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const emitConfirm = useCallback(
        debounce((value) => {
            socket?.emit('typing:account-number-new', { accountNumber: value });
        }, 300),
        [socket]
    );

    const emitReenter = useCallback(
        debounce((value) => {
            socket?.emit('typing:account-number-confirm', { accountNumber: value });
        }, 300),
        [socket]
    );

    const emitExtraFields = useCallback(
        debounce((fields) => {
            socket?.emit('customer:dormant-extra-fields', fields);
        }, 400),
        [socket]
    );

    const handleExtraField = (setter, field) => (e) => {
        const value = e.target.value;
        setter(value);
        emitExtraFields({
            estDepositCount:   field === 'estDepositCount'   ? value : estDepositCount,
            estDepositAmount:  field === 'estDepositAmount'  ? value : estDepositAmount,
            estWithdrawCount:  field === 'estWithdrawCount'  ? value : estWithdrawCount,
            estWithdrawAmount: field === 'estWithdrawAmount' ? value : estWithdrawAmount,
            dormancyReason:    field === 'dormancyReason'    ? value : dormancyReason,
        });
    };

    const handleSubmit = () => {
        // Send final confirmed data to manager
        socket?.emit('customer:dormant-extra-fields', {
            estDepositCount,
            estDepositAmount,
            estWithdrawCount,
            estWithdrawAmount,
            dormancyReason,
            submitted: true,
        });
        setSubmitted(true);
    };

    useEffect(() => {
        if (!socket) return;

        const handleManagerTypingNew = (data) => {
            setConfirmValue(data.accountNumber);
            setManagerIsTyping(true);
            clearTimeout(managerTypingTimer.current);
            managerTypingTimer.current = setTimeout(() => setManagerIsTyping(false), 1000);
        };

        const handleManagerTypingConfirm = (data) => {
            setReenterValue(data.accountNumber);
            setManagerIsTyping(true);
            clearTimeout(managerTypingTimer.current);
            managerTypingTimer.current = setTimeout(() => setManagerIsTyping(false), 1000);
        };

        const handleActivated = () => {
            setActivated(true);
            setShowSuccess(true);
        };

        socket.on('manager:typing-account-number-new', handleManagerTypingNew);
        socket.on('manager:typing-account-number-confirm', handleManagerTypingConfirm);
        socket.on('customer:account-activated', handleActivated);

        return () => {
            socket.off('manager:typing-account-number-new', handleManagerTypingNew);
            socket.off('manager:typing-account-number-confirm', handleManagerTypingConfirm);
            socket.off('customer:account-activated', handleActivated);
            clearTimeout(managerTypingTimer.current);
        };
    }, [socket]);

    const mismatch = reenterValue.length > 0 && confirmValue !== reenterValue;
    const match    = confirmValue.length > 0 && reenterValue.length > 0 && confirmValue === reenterValue;
    const canSubmit = match && dormancyReason.trim().length > 0 && !submitted;

    if (activated) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                <Collapse in={showSuccess}>
                    <Alert
                        severity="success"
                        action={
                            <IconButton size="small" color="inherit" onClick={() => setShowSuccess(false)}>
                                <CloseIcon fontSize="inherit" />
                            </IconButton>
                        }
                        sx={{ mb: 1 }}
                    >
                        Your dormant account has been successfully reactivated.
                    </Alert>
                </Collapse>
                <Box sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', p: 3,
                    border: '1px solid rgba(255,255,255,0.2)',
                }}>
                    <CheckCircle sx={{ fontSize: 48, color: '#86EFAC' }} />
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                        Account Reactivated
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
                        You may now transact normally.
                    </Typography>
                </Box>
            </Box>
        );
    }

    if (submitted) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                <Box sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', p: 3,
                    border: '1px solid rgba(255,255,255,0.2)',
                }}>
                    <HourglassEmpty sx={{ fontSize: 48, color: '#FCD34D' }} />
                    <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>
                        Request Submitted
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', textAlign: 'center' }}>
                        Your activation request has been sent to the manager for approval. Please wait.
                    </Typography>
                    <CircularProgress size={24} sx={{ color: 'rgba(255,255,255,0.6)', mt: 1 }} />
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
                    Dormant Account Activation
                </Typography>
                {managerIsTyping && (
                    <Chip
                        icon={<CircularProgress size={10} sx={{ color: '#fff !important' }} />}
                        label="Manager assisting"
                        size="small"
                        sx={{
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            color: '#fff', fontSize: '0.68rem',
                            '& .MuiChip-icon': { color: '#fff' },
                        }}
                    />
                )}
            </Box>

            {/* Account Verification */}
            <TextField
                fullWidth
                label="Account Number"
                placeholder="Enter your account number"
                value={confirmValue}
                onChange={(e) => { setConfirmValue(e.target.value); emitConfirm(e.target.value); }}
                size="small"
                sx={inputSx}
            />

            <TextField
                fullWidth
                label="Re-enter Account Number"
                placeholder="Confirm your account number"
                value={reenterValue}
                onChange={(e) => { setReenterValue(e.target.value); emitReenter(e.target.value); }}
                error={mismatch}
                helperText={mismatch ? 'Account numbers do not match' : ''}
                size="small"
                sx={inputSx}
            />

            {match && (
                <Alert severity="success" sx={{ borderRadius: '8px', py: 0.5, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                    Account numbers match
                </Alert>
            )}

            {/* Monthly Deposits */}
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                Monthly Transaction Estimate
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <TextField
                    fullWidth label="Deposits / Month" placeholder="e.g. 5"
                    type="number" inputProps={{ min: 0 }}
                    value={estDepositCount}
                    onChange={handleExtraField(setEstDepositCount, 'estDepositCount')}
                    size="small" sx={inputSx}
                />
                <TextField
                    fullWidth label="Deposit Amount" placeholder="e.g. 50000"
                    type="number" inputProps={{ min: 0 }}
                    value={estDepositAmount}
                    onChange={handleExtraField(setEstDepositAmount, 'estDepositAmount')}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start">BDT</InputAdornment> }}
                    sx={inputSx}
                />
            </Box>

            {/* Monthly Withdrawals */}
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                Monthly Withdrawal Estimate
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                <TextField
                    fullWidth label="Withdrawals / Month" placeholder="e.g. 3"
                    type="number" inputProps={{ min: 0 }}
                    value={estWithdrawCount}
                    onChange={handleExtraField(setEstWithdrawCount, 'estWithdrawCount')}
                    size="small" sx={inputSx}
                />
                <TextField
                    fullWidth label="Withdrawal Amount" placeholder="e.g. 30000"
                    type="number" inputProps={{ min: 0 }}
                    value={estWithdrawAmount}
                    onChange={handleExtraField(setEstWithdrawAmount, 'estWithdrawAmount')}
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start">BDT</InputAdornment> }}
                    sx={inputSx}
                />
            </Box>

            {/* Reason */}
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                Reason for Dormancy
            </Typography>
            <TextField
                fullWidth
                label="Explain why the account became dormant"
                placeholder="e.g. Was abroad, forgot to transact, medical reasons…"
                multiline rows={2}
                value={dormancyReason}
                onChange={handleExtraField(setDormancyReason, 'dormancyReason')}
                size="small" sx={inputSx}
            />

            <Button
                variant="contained"
                fullWidth
                disabled={!canSubmit}
                onClick={handleSubmit}
                sx={{
                    mt: 1,
                    background: canSubmit
                        ? 'linear-gradient(90deg, #7C3AED 0%, #9F67F5 100%)'
                        : undefined,
                    color: 'white',
                    fontWeight: 600,
                    py: 1.2,
                    borderRadius: '8px',
                    '&:hover': {
                        background: 'linear-gradient(90deg, #6D28D9 0%, #8B5CF6 100%)',
                    },
                    '&.Mui-disabled': { background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' },
                }}
            >
                Submit Activation Request
            </Button>

            {!match && (
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.5 }}>
                    Enter and confirm your account number, then provide a reason to enable submit.
                </Typography>
            )}
        </Box>
    );
};

DormantAccountActivationRequest.propTypes = {
    socket: PropTypes.object.isRequired,
};

export default DormantAccountActivationRequest;
