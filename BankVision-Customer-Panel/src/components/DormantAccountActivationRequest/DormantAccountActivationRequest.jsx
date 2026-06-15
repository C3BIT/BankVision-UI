import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, TextField, CircularProgress, Alert, Divider, InputAdornment } from '@mui/material';
import { CheckCircle, AccountBalance } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

const debounce = (func, delay) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), delay); };
};

const DormantAccountActivationRequest = ({ socket }) => {
    const { accountDetails } = useSelector((state) => state.customerInfo);
    const [confirmValue, setConfirmValue] = useState('');
    const [reenterValue, setReenterValue] = useState('');
    const [activated, setActivated] = useState(false);
    const managerTypingTimer = useRef(null);
    const [managerIsTyping, setManagerIsTyping] = useState(false);

    // New compliance fields
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
            estDepositCount:  field === 'estDepositCount'  ? value : estDepositCount,
            estDepositAmount: field === 'estDepositAmount' ? value : estDepositAmount,
            estWithdrawCount: field === 'estWithdrawCount' ? value : estWithdrawCount,
            estWithdrawAmount:field === 'estWithdrawAmount'? value : estWithdrawAmount,
            dormancyReason:   field === 'dormancyReason'   ? value : dormancyReason,
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
    const match = confirmValue.length > 0 && reenterValue.length > 0 && confirmValue === reenterValue;

    if (activated) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3, alignItems: 'center' }}>
                <CheckCircle sx={{ fontSize: 64, color: '#4CAF50' }} />
                <Typography variant="h6" sx={{ color: 'white', textAlign: 'center' }}>
                    Account Activated!
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                    Your dormant account has been successfully reactivated.
                </Typography>
            </Box>
        );
    }

    const fieldSx = {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: '6px',
        '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
            '&.Mui-focused fieldset': { borderColor: '#4CAF50' },
        },
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                <AccountBalance sx={{ color: 'rgba(255,255,255,0.8)' }} />
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 'medium' }}>
                    Dormant Account Activation
                </Typography>
            </Box>

            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                Please confirm your account number and complete the required fields below.
            </Typography>

            {managerIsTyping && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                    <CircularProgress size={14} sx={{ color: 'rgba(255,255,255,0.7)' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        Manager is assisting…
                    </Typography>
                </Box>
            )}

            <TextField
                fullWidth
                label="Confirm Account Number"
                placeholder="Type your account number"
                value={confirmValue}
                onChange={(e) => { setConfirmValue(e.target.value); emitConfirm(e.target.value); }}
                sx={fieldSx}
            />

            <TextField
                fullWidth
                label="Re-enter Account Number"
                placeholder="Type your account number again"
                value={reenterValue}
                onChange={(e) => { setReenterValue(e.target.value); emitReenter(e.target.value); }}
                error={mismatch}
                helperText={mismatch ? 'Account numbers do not match' : ''}
                sx={fieldSx}
            />

            {match && (
                <Alert severity="success">
                    Account numbers match. Please complete the fields below.
                </Alert>
            )}

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)', my: 1 }} />

            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Monthly Transaction Estimate
            </Typography>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    fullWidth
                    label="No. of Deposits / Month"
                    placeholder="e.g. 5"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={estDepositCount}
                    onChange={handleExtraField(setEstDepositCount, 'estDepositCount')}
                    sx={fieldSx}
                />
                <TextField
                    fullWidth
                    label="Deposit Amount / Month"
                    placeholder="e.g. 50000"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={estDepositAmount}
                    onChange={handleExtraField(setEstDepositAmount, 'estDepositAmount')}
                    InputProps={{ startAdornment: <InputAdornment position="start" sx={{ color: '#555' }}>BDT</InputAdornment> }}
                    sx={fieldSx}
                />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                    fullWidth
                    label="No. of Withdrawals / Month"
                    placeholder="e.g. 3"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={estWithdrawCount}
                    onChange={handleExtraField(setEstWithdrawCount, 'estWithdrawCount')}
                    sx={fieldSx}
                />
                <TextField
                    fullWidth
                    label="Withdrawal Amount / Month"
                    placeholder="e.g. 30000"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={estWithdrawAmount}
                    onChange={handleExtraField(setEstWithdrawAmount, 'estWithdrawAmount')}
                    InputProps={{ startAdornment: <InputAdornment position="start" sx={{ color: '#555' }}>BDT</InputAdornment> }}
                    sx={fieldSx}
                />
            </Box>

            <TextField
                fullWidth
                label="Reason for Account Dormancy"
                placeholder="e.g. Was abroad, forgot to transact, medical reasons…"
                multiline
                rows={2}
                value={dormancyReason}
                onChange={handleExtraField(setDormancyReason, 'dormancyReason')}
                sx={fieldSx}
            />
        </Box>
    );
};

DormantAccountActivationRequest.propTypes = {
    socket: PropTypes.object.isRequired,
};

export default DormantAccountActivationRequest;
