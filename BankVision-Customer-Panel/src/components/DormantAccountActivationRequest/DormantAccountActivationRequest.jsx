import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, TextField, CircularProgress, Alert, Divider, InputAdornment, Chip } from '@mui/material';
import { CheckCircle, AccountBalance, TrendingUp, TrendingDown, Assignment } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

const debounce = (func, delay) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), delay); };
};

const MTB_BLUE = '#004C8C';
const MTB_BLUE_LIGHT = '#E8F0F9';
const BORDER_COLOR = '#D0D9E8';

const SectionHeader = ({ icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{
            width: 28, height: 28, borderRadius: '6px',
            backgroundColor: MTB_BLUE_LIGHT, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
        }}>
            {icon}
        </Box>
        <Typography variant="caption" sx={{
            fontWeight: 700, color: MTB_BLUE,
            textTransform: 'uppercase', letterSpacing: '0.6px', fontSize: '0.7rem',
        }}>
            {title}
        </Typography>
    </Box>
);

const inputSx = {
    backgroundColor: '#fff',
    borderRadius: '8px',
    '& .MuiOutlinedInput-root': {
        borderRadius: '8px',
        '& fieldset': { borderColor: BORDER_COLOR },
        '&:hover fieldset': { borderColor: '#8AACD4' },
        '&.Mui-focused fieldset': { borderColor: MTB_BLUE, borderWidth: '1.5px' },
        '&.Mui-error fieldset': { borderColor: '#D32F2F' },
    },
    '& .MuiInputLabel-root.Mui-focused': { color: MTB_BLUE },
    '& .MuiInputAdornment-root p': { color: '#666', fontSize: '0.85rem', fontWeight: 500 },
};

const DormantAccountActivationRequest = ({ socket }) => {
    const { accountDetails } = useSelector((state) => state.customerInfo);
    const [confirmValue, setConfirmValue] = useState('');
    const [reenterValue, setReenterValue] = useState('');
    const [activated, setActivated] = useState(false);
    const managerTypingTimer = useRef(null);
    const [managerIsTyping, setManagerIsTyping] = useState(false);

    const [estDepositCount, setEstDepositCount] = useState('');
    const [estDepositAmount, setEstDepositAmount] = useState('');
    const [estWithdrawCount, setEstWithdrawCount] = useState('');
    const [estWithdrawAmount, setEstWithdrawAmount] = useState('');
    const [dormancyReason, setDormancyReason] = useState('');

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

        const handleActivated = () => setActivated(true);

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

    if (activated) {
        return (
            <Box sx={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                backgroundColor: '#fff', borderRadius: '12px', p: 4,
                border: `1px solid ${BORDER_COLOR}`,
            }}>
                <Box sx={{
                    width: 72, height: 72, borderRadius: '50%',
                    backgroundColor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <CheckCircle sx={{ fontSize: 44, color: '#2E7D32' }} />
                </Box>
                <Typography variant="h6" sx={{ color: '#1A1A2E', fontWeight: 700 }}>
                    Account Reactivated
                </Typography>
                <Typography variant="body2" sx={{ color: '#666', textAlign: 'center', maxWidth: 300 }}>
                    Your dormant account has been successfully reactivated. You may now transact normally.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>

            {/* Header */}
            <Box sx={{
                backgroundColor: MTB_BLUE, borderRadius: '10px', p: 2,
                display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
                <Box sx={{
                    width: 36, height: 36, borderRadius: '8px',
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <AccountBalance sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Box>
                    <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
                        Dormant Account Activation
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                        Complete the form to reactivate your account
                    </Typography>
                </Box>
                {managerIsTyping && (
                    <Chip
                        icon={<CircularProgress size={10} sx={{ color: '#fff !important' }} />}
                        label="Manager assisting"
                        size="small"
                        sx={{
                            ml: 'auto', backgroundColor: 'rgba(255,255,255,0.2)',
                            color: '#fff', fontSize: '0.68rem',
                            '& .MuiChip-icon': { color: '#fff' },
                        }}
                    />
                )}
            </Box>

            {/* Account Verification */}
            <Box sx={{
                backgroundColor: '#fff', borderRadius: '10px', p: 2,
                border: `1px solid ${BORDER_COLOR}`,
            }}>
                <SectionHeader
                    icon={<Assignment sx={{ fontSize: 15, color: MTB_BLUE }} />}
                    title="Account Verification"
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                        <Alert
                            severity="success"
                            sx={{
                                borderRadius: '8px', py: 0.5,
                                '& .MuiAlert-message': { fontSize: '0.8rem' },
                            }}
                        >
                            Account numbers match
                        </Alert>
                    )}
                </Box>
            </Box>

            {/* Monthly Transaction Estimate */}
            <Box sx={{
                backgroundColor: '#fff', borderRadius: '10px', p: 2,
                border: `1px solid ${BORDER_COLOR}`,
            }}>
                <SectionHeader
                    icon={<TrendingUp sx={{ fontSize: 15, color: MTB_BLUE }} />}
                    title="Monthly Transaction Estimate"
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField
                        fullWidth
                        label="Deposits / Month"
                        placeholder="e.g. 5"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={estDepositCount}
                        onChange={handleExtraField(setEstDepositCount, 'estDepositCount')}
                        size="small"
                        sx={inputSx}
                    />
                    <TextField
                        fullWidth
                        label="Deposit Amount"
                        placeholder="e.g. 50000"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={estDepositAmount}
                        onChange={handleExtraField(setEstDepositAmount, 'estDepositAmount')}
                        size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start">BDT</InputAdornment> }}
                        sx={inputSx}
                    />
                </Box>
            </Box>

            {/* Withdrawals */}
            <Box sx={{
                backgroundColor: '#fff', borderRadius: '10px', p: 2,
                border: `1px solid ${BORDER_COLOR}`,
            }}>
                <SectionHeader
                    icon={<TrendingDown sx={{ fontSize: 15, color: MTB_BLUE }} />}
                    title="Monthly Withdrawal Estimate"
                />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                    <TextField
                        fullWidth
                        label="Withdrawals / Month"
                        placeholder="e.g. 3"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={estWithdrawCount}
                        onChange={handleExtraField(setEstWithdrawCount, 'estWithdrawCount')}
                        size="small"
                        sx={inputSx}
                    />
                    <TextField
                        fullWidth
                        label="Withdrawal Amount"
                        placeholder="e.g. 30000"
                        type="number"
                        inputProps={{ min: 0 }}
                        value={estWithdrawAmount}
                        onChange={handleExtraField(setEstWithdrawAmount, 'estWithdrawAmount')}
                        size="small"
                        InputProps={{ startAdornment: <InputAdornment position="start">BDT</InputAdornment> }}
                        sx={inputSx}
                    />
                </Box>
            </Box>

            {/* Reason */}
            <Box sx={{
                backgroundColor: '#fff', borderRadius: '10px', p: 2,
                border: `1px solid ${BORDER_COLOR}`,
            }}>
                <SectionHeader
                    icon={<Assignment sx={{ fontSize: 15, color: MTB_BLUE }} />}
                    title="Reason for Dormancy"
                />
                <TextField
                    fullWidth
                    label="Explain why the account became dormant"
                    placeholder="e.g. Was abroad, forgot to transact, medical reasons…"
                    multiline
                    rows={2}
                    value={dormancyReason}
                    onChange={handleExtraField(setDormancyReason, 'dormancyReason')}
                    size="small"
                    sx={inputSx}
                />
            </Box>

            <Typography variant="caption" sx={{
                color: '#888', textAlign: 'center', pb: 0.5,
                lineHeight: 1.5,
            }}>
                Your manager will review and approve the activation request.
            </Typography>
        </Box>
    );
};

DormantAccountActivationRequest.propTypes = {
    socket: PropTypes.object.isRequired,
};

export default DormantAccountActivationRequest;
