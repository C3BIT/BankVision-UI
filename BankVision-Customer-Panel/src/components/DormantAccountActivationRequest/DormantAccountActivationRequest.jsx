import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    TextField,
    Alert,
    Chip,
    Skeleton,
} from '@mui/material';
import { Visibility, CheckCircle } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

const debounce = (func, delay) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), delay); };
};

const DormantAccountActivationRequest = ({ socket }) => {
    const { accountDetails } = useSelector((state) => state.customerInfo);
    const [accountNumber, setAccountNumber] = useState('');
    const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
    const [managerIsTyping, setManagerIsTyping] = useState(false);
    const [activated, setActivated] = useState(false);
    const managerTypingTimer = useRef(null);

    const emitNew = useCallback(
        debounce((value) => {
            socket?.emit('typing:account-number-new', { accountNumber: value });
        }, 300),
        [socket]
    );

    const emitConfirm = useCallback(
        debounce((value) => {
            socket?.emit('typing:account-number-confirm', { accountNumber: value });
        }, 300),
        [socket]
    );

    useEffect(() => {
        if (!socket) return;

        const handleManagerTypingNew = (data) => {
            setAccountNumber(data.accountNumber);
            setManagerIsTyping(true);
            clearTimeout(managerTypingTimer.current);
            managerTypingTimer.current = setTimeout(() => setManagerIsTyping(false), 1000);
        };

        const handleManagerTypingConfirm = (data) => {
            setConfirmAccountNumber(data.accountNumber);
            setManagerIsTyping(true);
            clearTimeout(managerTypingTimer.current);
            managerTypingTimer.current = setTimeout(() => setManagerIsTyping(false), 1000);
        };

        const handleActivated = () => {
            setActivated(true);
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

    if (activated) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2, alignItems: 'center' }}>
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

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', borderRadius: '12px', gap: 2, p: 2 }}>
            <Typography variant="h6" sx={{ color: 'white', textAlign: 'center', fontWeight: 'medium' }}>
                Dormant Account Activation
            </Typography>

            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                Please confirm your account number below. Your manager is assisting you.
            </Typography>

            {managerIsTyping && (
                <Chip
                    icon={<Visibility />}
                    label="Manager is assisting"
                    size="small"
                    color="primary"
                    sx={{ alignSelf: 'center' }}
                />
            )}

            {accountDetails ? (
                <>
                    <TextField
                        fullWidth
                        label="Your Account Number (read-only)"
                        value={accountDetails.accountNumber || ''}
                        InputProps={{ readOnly: true }}
                        sx={{
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            borderRadius: '6px',
                            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' } },
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Confirm Account Number"
                        placeholder="Type your account number"
                        value={accountNumber}
                        onChange={(e) => {
                            setAccountNumber(e.target.value);
                            emitNew(e.target.value);
                        }}
                        sx={{
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            borderRadius: '6px',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                                '&.Mui-focused fieldset': { borderColor: '#4CAF50' },
                            },
                        }}
                    />

                    <TextField
                        fullWidth
                        label="Re-enter Account Number"
                        placeholder="Type your account number again"
                        value={confirmAccountNumber}
                        onChange={(e) => {
                            setConfirmAccountNumber(e.target.value);
                            emitConfirm(e.target.value);
                        }}
                        error={confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber}
                        helperText={
                            confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber
                                ? 'Account numbers do not match'
                                : ''
                        }
                        sx={{
                            backgroundColor: 'rgba(255,255,255,0.9)',
                            borderRadius: '6px',
                            '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                                '&.Mui-focused fieldset': { borderColor: '#4CAF50' },
                            },
                        }}
                    />

                    {accountNumber && confirmAccountNumber && accountNumber === confirmAccountNumber && (
                        <Alert severity="success">
                            Account numbers match. Waiting for manager to complete activation.
                        </Alert>
                    )}
                </>
            ) : (
                <Box sx={{ p: 2 }}>
                    <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 2, borderRadius: 1 }} />
                    <Skeleton variant="rectangular" width="100%" height={56} sx={{ mb: 2, borderRadius: 1 }} />
                    <Skeleton variant="rectangular" width="100%" height={56} sx={{ borderRadius: 1 }} />
                </Box>
            )}
        </Box>
    );
};

DormantAccountActivationRequest.propTypes = {
    socket: PropTypes.object.isRequired,
};

export default DormantAccountActivationRequest;
