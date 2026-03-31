import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    TextField,
    Alert,
    Collapse,
    IconButton,
    Skeleton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PropTypes from 'prop-types';
import { useDispatch, useSelector } from 'react-redux';
import OtpInput from './OtpInput';
import LoadingButton from './LoadingButton';
import { fetchCustomerDetailsByAccount } from '../../redux/auth/customerInfoSlice';

/**
 * Generic single-field change request component (customer side).
 *
 * Handles the full flow:
 *   customer types → real-time sync to manager
 *   manager can override the field in real-time
 *   manager sends OTP → customer enters OTP → field updated
 *   OR manager verifies OTP on their side → customer sees success automatically
 *
 * To support a new service, add its config to changeRequestConfig.js and
 * create a thin wrapper that passes the right thunks (see EmailChangeRequest.jsx).
 */
const SimpleChangeRequest = ({
    config,
    currentValue,
    socket,
    verifyOtpThunk,
    updateThunk,
}) => {
    const { accountDetails } = useSelector((state) => state.customerInfo);
    const [newValue, setNewValue] = useState('');
    const typingTimeoutRef = useRef(null);
    const [customerUpdateInfo, setCustomerUpdateInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showOtpAlert, setShowOtpAlert] = useState(false);
    const [showOtpVerification, setShowOtpVerification] = useState(false);
    const [otp, setOtp] = useState('');
    const [fieldError, setFieldError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [updated, setUpdated] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const dispatch = useDispatch();

    const handleValueChange = (e) => {
        const value = e.target.value.trim();
        setNewValue(value);
        setFieldError(config.validate(value, currentValue));

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            const err = config.validate(value, currentValue);
            if (socket && value && !err) {
                socket.emit(config.customerEmitEvent, {
                    value,
                    timestamp: new Date().toISOString(),
                });
            }
        }, 500);
    };

    const handleVerification = async () => {
        if (otp.length !== 6) return;
        try {
            setIsVerifying(true);
            setFieldError('');

            const verifyResult = await dispatch(
                verifyOtpThunk(config.verifyOtpPayload(customerUpdateInfo, newValue, otp))
            ).unwrap();

            if (verifyResult.isVerified) {
                const updateResult = await dispatch(
                    updateThunk(config.updatePayload(customerUpdateInfo?.accountNumber, newValue))
                ).unwrap();

                if (updateResult[config.successFlag]) {
                    socket.emit(config.changedSocketEvent, {
                        [config.serviceKey]: newValue,
                        accountNumber: customerUpdateInfo?.accountNumber,
                        timestamp: new Date().toISOString(),
                    });
                    markSuccess(customerUpdateInfo?.accountNumber);
                }
            }
        } catch (err) {
            setFieldError('Error during verification: ' + err.message);
        } finally {
            setIsVerifying(false);
        }
    };

    const markSuccess = async (accountNumber) => {
        setUpdated(true);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 10000);
        if (accountNumber) {
            try {
                setLoading(true);
                await dispatch(fetchCustomerDetailsByAccount({ accountNumber })).unwrap();
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        if (!socket) return;

        const handleOtpSent = (data) => {
            setCustomerUpdateInfo({
                phone: data.phone,
                accountNumber: data.accountNumber,
                timestamp: data.timestamp,
            });
            setShowOtpAlert(true);
            setShowOtpVerification(true);
            setTimeout(() => setShowOtpAlert(false), 8000);
        };

        // Manager typing in their panel → update this field in real-time
        const handleManagerTyping = (data) => {
            if (data.value !== undefined) setNewValue(data.value);
        };

        // Manager completed the change on behalf of customer
        const handleChangeCompleted = (data) => {
            if (data.changeType === config.completedChangeType && data.verified) {
                const accNum =
                    customerUpdateInfo?.accountNumber || accountDetails?.accountNumber;
                markSuccess(accNum);
            }
        };

        socket.on(config.otpSentEvent, handleOtpSent);
        socket.on(config.managerTypingEvent, handleManagerTyping);
        socket.on('customer:change-request-completed', handleChangeCompleted);

        return () => {
            socket.off(config.otpSentEvent, handleOtpSent);
            socket.off(config.managerTypingEvent, handleManagerTyping);
            socket.off('customer:change-request-completed', handleChangeCompleted);
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [socket, config]);

    // ── Success screen ──────────────────────────────────────────────────────
    if (updated) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', borderRadius: '12px', gap: 2, p: 2 }}>
                <Collapse in={showSuccessMessage}>
                    <Alert
                        severity="success"
                        sx={{ mb: 3 }}
                        action={
                            <IconButton size="small" color="inherit" onClick={() => setShowSuccessMessage(false)}>
                                <CloseIcon fontSize="inherit" />
                            </IconButton>
                        }
                    >
                        {config.successMessage}
                    </Alert>
                </Collapse>

                <Typography variant="h5" sx={{ color: 'white', mb: 3, textAlign: 'center' }}>
                    Account Details
                </Typography>

                {loading ? (
                    <Box sx={{ p: 2 }}>
                        <Skeleton variant="rectangular" width="100%" height={118} sx={{ mb: 1, borderRadius: 1 }} />
                        <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="70%" sx={{ mb: 1 }} />
                        <Skeleton variant="text" width="80%" sx={{ mb: 1 }} />
                    </Box>
                ) : (
                    <Box sx={{
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        p: 3,
                        border: '1px solid rgba(255,255,255,0.2)',
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{
                                width: 100, height: 100, mr: 3,
                                borderRadius: '8px', overflow: 'hidden', border: '2px solid white',
                            }}>
                                <img
                                    src={accountDetails?.profileImage}
                                    alt={accountDetails?.name || 'Profile'}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </Box>
                            <Box>
                                {[
                                    ['Name', 'name'],
                                    ['Mobile', 'mobileNumber'],
                                    ['Email', 'email'],
                                    ['Address', 'address'],
                                    ['Branch', 'branch'],
                                ].map(([label, key]) => (
                                    <Typography key={key} sx={{ color: 'white', mb: 0.5 }}>
                                        <strong>{label}: </strong>{accountDetails?.[key]}
                                    </Typography>
                                ))}
                            </Box>
                        </Box>
                    </Box>
                )}
            </Box>
        );
    }

    // ── Form screen ─────────────────────────────────────────────────────────
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', borderRadius: '12px', gap: 2, p: 2 }}>
            <Typography variant="h6" sx={{ color: 'white', textAlign: 'center', fontWeight: 'medium' }}>
                {config.label}
            </Typography>

            <Collapse in={showOtpAlert}>
                <Alert
                    severity="success"
                    action={
                        <IconButton size="small" color="inherit" onClick={() => setShowOtpAlert(false)}>
                            <CloseIcon fontSize="inherit" />
                        </IconButton>
                    }
                    sx={{ mb: 2 }}
                >
                    OTP sent to your registered phone for account {customerUpdateInfo?.accountNumber}
                </Alert>
            </Collapse>

            <TextField
                fullWidth
                value={currentValue || 'Not available'}
                variant="outlined"
                label={config.currentLabel}
                InputProps={{ readOnly: true }}
                sx={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '6px',
                    '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' } },
                }}
            />

            <TextField
                fullWidth
                value={newValue}
                onChange={handleValueChange}
                onBlur={() => { if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); }}
                variant="outlined"
                label={config.fieldLabel}
                placeholder={`Enter ${config.fieldLabel.toLowerCase()}`}
                type={config.fieldType}
                error={!!fieldError}
                helperText={fieldError || ''}
                sx={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderRadius: '6px',
                    '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                        '&.Mui-focused fieldset': { borderColor: '#4CAF50' },
                    },
                }}
            />

            {showOtpVerification && (
                <>
                    <Typography variant="body2" sx={{ color: 'white', textAlign: 'center', mb: 1 }}>
                        Enter OTP sent to your registered phone
                    </Typography>
                    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
                        <OtpInput
                            length={6}
                            onComplete={setOtp}
                            inputStyle={{
                                width: '40px', height: '40px', margin: '0 5px',
                                border: '1px solid #DDE2E5', backgroundColor: '#EFF1F94D',
                                borderRadius: '4px', textAlign: 'center', fontSize: '16px',
                            }}
                        />
                    </Box>
                    {fieldError && <Alert severity="error" sx={{ mb: 3 }}>{fieldError}</Alert>}
                    <LoadingButton
                        variant="contained"
                        fullWidth
                        onClick={handleVerification}
                        loading={isVerifying}
                        disabled={otp.length !== 6}
                        sx={{
                            mt: 3,
                            background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                            color: 'white',
                            '&:hover': {
                                background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                                opacity: 0.9,
                            },
                            '&.Mui-disabled': { background: '#f5f5f5', color: '#bdbdbd' },
                        }}
                    >
                        Verify OTP & Update {config.fieldLabel}
                    </LoadingButton>
                </>
            )}
        </Box>
    );
};

SimpleChangeRequest.propTypes = {
    config: PropTypes.shape({
        serviceKey: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        fieldLabel: PropTypes.string.isRequired,
        fieldType: PropTypes.string.isRequired,
        currentLabel: PropTypes.string.isRequired,
        successMessage: PropTypes.string.isRequired,
        customerEmitEvent: PropTypes.string.isRequired,
        managerTypingEvent: PropTypes.string.isRequired,
        otpSentEvent: PropTypes.string.isRequired,
        completedChangeType: PropTypes.string.isRequired,
        changedSocketEvent: PropTypes.string.isRequired,
        verifyOtpPayload: PropTypes.func.isRequired,
        updatePayload: PropTypes.func.isRequired,
        successFlag: PropTypes.string.isRequired,
        validate: PropTypes.func.isRequired,
    }).isRequired,
    currentValue: PropTypes.string,
    socket: PropTypes.object.isRequired,
    verifyOtpThunk: PropTypes.func.isRequired,
    updateThunk: PropTypes.func.isRequired,
};

export default SimpleChangeRequest;
