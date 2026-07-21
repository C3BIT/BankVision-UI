import React, { useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Link,
    Stepper,
    Step,
    StepLabel
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import api from '../services/api';

// Password requirements matching backend policy (utils/passwordPolicy.js)
const PASSWORD_REQUIREMENTS = [
    { id: 'length', label: 'At least 8 characters', test: (p) => p.length >= 8 },
    { id: 'uppercase', label: 'One uppercase letter (A-Z)', test: (p) => /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'One lowercase letter (a-z)', test: (p) => /[a-z]/.test(p) },
    { id: 'number', label: 'One number (0-9)', test: (p) => /[0-9]/.test(p) },
    { id: 'special', label: 'One special character (!@#$%^&*)', test: (p) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(p) },
];

const steps = ['Enter Email', 'Verify OTP', 'Reset Password'];

const ForgotPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState(location.state?.email || '');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [info, setInfo] = useState(location.state?.passwordExpired ? 'Your password has expired. Enter your email to receive a reset OTP.' : '');
    const [countdown, setCountdown] = useState(0);

    const startCountdown = () => {
        setCountdown(60);
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async (e) => {
        e?.preventDefault();
        setError('');

        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        try {
            await api.post('/admin/forgot-password', { email });
            setInfo('OTP sent to your email.');
            setActiveStep(1);
            startCountdown();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = (e) => {
        e?.preventDefault();
        setError('');

        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setInfo('OTP verified. Please set your new password.');
        setActiveStep(2);
    };

    const handleResetPassword = async (e) => {
        e?.preventDefault();
        setError('');

        const failedRequirements = PASSWORD_REQUIREMENTS.filter((req) => !req.test(newPassword));
        if (failedRequirements.length > 0) {
            setError('Password does not meet all requirements');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.post('/admin/reset-password', { email, otp, newPassword });
            navigate('/login', { state: { passwordResetSuccess: true } });
        } catch (err) {
            const message = err.response?.data?.message || 'Failed to reset password';
            setError(message);
            if (message.includes('OTP')) {
                setActiveStep(1);
                setOtp('');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = () => {
        if (countdown > 0) return;
        handleSendOtp();
    };

    const renderStep = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box component="form" noValidate onSubmit={handleSendOtp} sx={{ mt: 1, width: '100%' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Enter your email address and we'll send you an OTP to reset your password.
                        </Typography>
                        <TextField
                            fullWidth
                            label="Email Address"
                            type="email"
                            variant="outlined"
                            margin="normal"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            required
                            autoFocus
                            autoComplete="email"
                        />
                        <Button
                            fullWidth
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{ height: 48, mt: 2 }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Send OTP'}
                        </Button>
                    </Box>
                );

            case 1:
                return (
                    <Box component="form" noValidate onSubmit={handleVerifyOtp} sx={{ mt: 1, width: '100%' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Enter the 6-digit OTP sent to {email}
                        </Typography>
                        <TextField
                            fullWidth
                            label="OTP"
                            variant="outlined"
                            margin="normal"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            disabled={loading}
                            required
                            autoFocus
                            inputProps={{ maxLength: 6, inputMode: 'numeric', style: { letterSpacing: '0.3em', textAlign: 'center' } }}
                        />
                        <Button
                            fullWidth
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading || otp.length !== 6}
                            sx={{ height: 48, mt: 2 }}
                        >
                            Verify OTP
                        </Button>
                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            {countdown > 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Resend OTP in {countdown}s
                                </Typography>
                            ) : (
                                <Link component="button" type="button" variant="body2" onClick={handleResendOtp}>
                                    Resend OTP
                                </Link>
                            )}
                        </Box>
                    </Box>
                );

            case 2:
                return (
                    <Box component="form" noValidate onSubmit={handleResetPassword} sx={{ mt: 1, width: '100%' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Create a new password for your account.
                        </Typography>
                        <TextField
                            fullWidth
                            label="New Password"
                            type="password"
                            variant="outlined"
                            margin="normal"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={loading}
                            required
                            autoComplete="new-password"
                        />
                        <Box sx={{ mt: 1, mb: 1, p: 1.5, backgroundColor: '#f8f9fa', borderRadius: 1, border: '1px solid #e9ecef' }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: '#495057', mb: 1, display: 'block' }}>
                                Password Requirements:
                            </Typography>
                            {PASSWORD_REQUIREMENTS.map((req) => {
                                const isMet = newPassword ? req.test(newPassword) : false;
                                return (
                                    <Box key={req.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
                                        {isMet ? (
                                            <CheckCircleIcon sx={{ fontSize: 14, color: '#28a745' }} />
                                        ) : (
                                            <CancelIcon sx={{ fontSize: 14, color: '#dc3545' }} />
                                        )}
                                        <Typography variant="caption" sx={{ color: isMet ? '#28a745' : '#6c757d' }}>
                                            {req.label}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>
                        <TextField
                            fullWidth
                            label="Confirm Password"
                            type="password"
                            variant="outlined"
                            margin="normal"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                            required
                            autoComplete="new-password"
                        />
                        <Button
                            fullWidth
                            type="submit"
                            variant="contained"
                            size="large"
                            disabled={loading}
                            sx={{ height: 48, mt: 2 }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
                        </Button>
                    </Box>
                );

            default:
                return null;
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 2
            }}
        >
            <Paper
                elevation={0}
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 420,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Box
                        component="img"
                        src="/logo.png"
                        alt="Logo"
                        sx={{ height: 48, mb: 2, objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                        Reset Password
                    </Typography>
                </Box>

                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}
                {!error && info && (
                    <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                        {info}
                    </Alert>
                )}

                {renderStep()}

                <Box sx={{ textAlign: 'center', mt: 3 }}>
                    <Link component={RouterLink} to="/login" variant="body2" sx={{ color: 'text.secondary' }}>
                        Back to Login
                    </Link>
                </Box>
            </Paper>
        </Box>
    );
};

export default ForgotPassword;
