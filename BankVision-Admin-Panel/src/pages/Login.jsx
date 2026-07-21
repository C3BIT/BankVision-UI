import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const authNotice = sessionStorage.getItem('authNotice');
        if (authNotice) {
            setNotice(authNotice);
            sessionStorage.removeItem('authNotice');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(email, password);

        if (result.success) {
            navigate('/dashboard');
        } else if (result.errorCode === 40303) {
            // Password expired — loginAdmin never issues a session in this case,
            // so the only way forward is the OTP-based reset flow.
            navigate('/forgot-password', { state: { email, passwordExpired: true } });
        } else {
            setError(result.message || 'Login failed');
        }
        setLoading(false);
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
                    maxWidth: 400,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <Box sx={{ mb: 4, textAlign: 'center' }}>
                    <Box
                        component="img"
                        src="/logo.png"
                        alt="Logo"
                        sx={{ height: 48, mb: 2, objectFit: 'contain' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <Typography variant="h5" fontWeight="bold" gutterBottom>
                        Welcome Back
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Sign in to access the admin panel
                    </Typography>
                </Box>

                {notice && !error && (
                    <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setNotice('')}>
                        {notice}
                    </Alert>
                )}

                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
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
                        label="Password"
                        type="password"
                        variant="outlined"
                        margin="normal"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        required
                        autoComplete="current-password"
                        sx={{ mb: 1 }}
                    />

                    <Box sx={{ textAlign: 'right', mb: 1 }}>
                        <Link
                            component="button"
                            type="button"
                            variant="body2"
                            onClick={() => navigate('/forgot-password', { state: { email } })}
                            sx={{ color: 'text.secondary' }}
                        >
                            Forgot password?
                        </Link>
                    </Box>

                    <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading}
                        sx={{ height: 48, mt: 2 }}
                    >
                        {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                    </Button>
                </form>
            </Paper>
        </Box>
    );
};

export default Login;
