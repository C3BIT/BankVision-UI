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
    Link
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

const ForgotPassword = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState(location.state?.email || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [info] = useState(location.state?.passwordExpired ? 'Your password has expired. Enter your email and a new password below.' : '');

    const handleResetPassword = async (e) => {
        e?.preventDefault();
        setError('');

        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

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
            await api.post('/admin/reset-password', { email, newPassword });
            navigate('/login', { state: { passwordResetSuccess: true } });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to reset password');
        } finally {
            setLoading(false);
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
                    <Typography variant="body2" color="text.secondary">
                        Enter your email and choose a new password.
                    </Typography>
                </Box>

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

                <Box component="form" noValidate onSubmit={handleResetPassword} sx={{ mt: 1, width: '100%' }}>
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
