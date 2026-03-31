import { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, Chip } from '@mui/material';
import { CheckCircle, Send, HourglassEmpty } from '@mui/icons-material';
import PropTypes from 'prop-types';

const PhoneVerification = ({ phoneNumber, verificationPending, onSendOTP, otpSent, isVerified, onVerifyOTP }) => {
    const [otp, setOtp] = useState('');

    const handleVerify = () => {
        if (otp.length === 6) {
            onVerifyOTP(otp);
        }
    };

    return (
        <Box sx={{
            width: '100%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#CEC1DF',
            borderRadius: '12px'
        }}>
            <Typography variant="h6" sx={{ mb: 4, color: 'white', fontWeight: '700' }}>
                Verify Customer Phone
            </Typography>

            <TextField
                fullWidth
                value={phoneNumber}
                variant="outlined"
                label="Mobile Number"
                InputProps={{
                    readOnly: true,
                }}
                sx={{
                    mb: 3,
                    '& .MuiOutlinedInput-root': {
                        backgroundColor: '#DDE2E5',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                            borderWidth: '1px',
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'white',
                        },
                    },
                    '& .MuiInputLabel-root': {
                        color: '#666',
                        fontWeight: 'medium',
                    },
                    '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'white',
                    },
                }}
            />

            {isVerified ? (
                <Alert
                    severity="success"
                    icon={<CheckCircle />}
                    sx={{ width: '100%', mb: 2 }}
                >
                    Customer phone verified successfully!
                </Alert>
            ) : otpSent ? (
                <Box sx={{ width: '100%', mb: 2 }}>
                    <Alert
                        severity="info"
                        icon={<HourglassEmpty />}
                        sx={{ mb: 2 }}
                    >
                        OTP sent! Waiting for customer to verify...
                    </Alert>

                    <Box sx={{
                        mt: 2,
                        p: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        borderRadius: '8px',
                        border: '1px dashed white'
                    }}>
                        <Typography variant="body2" sx={{ color: 'white', mb: 1, fontWeight: 600 }}>
                            Manual OTP Entry (if customer provides code)
                        </Typography>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                            sx={{
                                backgroundColor: 'white',
                                borderRadius: '4px',
                                mb: 1
                            }}
                        />
                        <Button
                            fullWidth
                            variant="contained"
                            size="small"
                            onClick={handleVerify}
                            disabled={otp.length !== 6 || verificationPending}
                            sx={{
                                backgroundColor: '#0066FF',
                                '&:hover': { backgroundColor: '#0052CC' }
                            }}
                        >
                            Verify Manually
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                        <Chip
                            label="OTP Sent"
                            color="primary"
                            size="small"
                            icon={<Send sx={{ fontSize: 16 }} />}
                        />
                    </Box>
                </Box>
            ) : null}

            {verificationPending ? (
                <Button
                    fullWidth
                    variant="contained"
                    disabled
                    sx={{
                        py: 1.5,
                        background: 'linear-gradient(to right, #4CAF50, #45a049)',
                        borderRadius: '8px',
                        opacity: 0.7,
                    }}
                >
                    <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                    Sending OTP...
                </Button>
            ) : (
                <Button
                    fullWidth
                    variant="contained"
                    onClick={onSendOTP}
                    disabled={otpSent || isVerified}
                    sx={{
                        py: 1.5,
                        background: otpSent || isVerified
                            ? '#ccc'
                            : 'linear-gradient(to right, #4CAF50, #45a049)',
                        '&:hover': {
                            background: 'linear-gradient(to right, #388E3C, #2e7d32)',
                        },
                        borderRadius: '8px',
                        fontWeight: '700',
                        mt: 2
                    }}
                >
                    {otpSent ? 'OTP Sent - Awaiting Verification' : 'Send OTP'}
                </Button>
            )}
        </Box>
    );
};

PhoneVerification.propTypes = {
    phoneNumber: PropTypes.string.isRequired,
    verificationPending: PropTypes.bool,
    onSendOTP: PropTypes.func.isRequired,
    onVerifyOTP: PropTypes.func,
    otpSent: PropTypes.bool,
    isVerified: PropTypes.bool
};

const EnterOTP = ({ phoneNumber, onVerifyOTP, verificationPending }) => {
    const [otp, setOtp] = useState('');

    const handleVerifyEmail = () => {
        if (otp.length === 6) {
            onVerifyOTP(otp);
        }
    };

    return (
        <Box sx={{
            width: '100%',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#CEC1DF',
            borderRadius: '12px'
        }}>
            <Typography variant="h6" sx={{ mb: 4, color: 'white', fontWeight: '700' }}>
                Verify Email OTP
            </Typography>

            <Box sx={{
                width: '100%',
                maxWidth: '350px',
                p: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                border: '1px dashed white'
            }}>
                <Typography variant="body2" sx={{ color: 'white', mb: 1, fontWeight: 600 }}>
                    Enter 6-digit OTP sent to:
                </Typography>
                <Typography variant="body1" sx={{ color: 'white', mb: 2, fontWeight: 700, wordBreak: 'break-all' }}>
                    {phoneNumber}
                </Typography>

                <TextField
                    fullWidth
                    size="small"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                    sx={{
                        backgroundColor: 'white',
                        borderRadius: '4px',
                        mb: 2
                    }}
                />
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleVerifyEmail}
                    disabled={otp.length !== 6 || verificationPending}
                    sx={{
                        backgroundColor: '#0066FF',
                        '&:hover': { backgroundColor: '#0052CC' },
                        fontWeight: 'bold'
                    }}
                >
                    {verificationPending ? <CircularProgress size={20} color="inherit" /> : 'Verify OTP'}
                </Button>
            </Box>
        </Box>
    );
};

EnterOTP.propTypes = {
    phoneNumber: PropTypes.string.isRequired,
    onVerifyOTP: PropTypes.func,
    verificationPending: PropTypes.bool
};

PhoneVerification.EnterOTP = EnterOTP;

export default PhoneVerification;