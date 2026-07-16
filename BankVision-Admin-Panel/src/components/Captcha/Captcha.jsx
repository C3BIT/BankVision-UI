import React, { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Box, TextField, IconButton, CircularProgress, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../../services/api';

/**
 * Reusable CAPTCHA widget.
 *
 * Fetches a self-hosted CAPTCHA (svg + captchaId) from the backend, renders it,
 * and exposes the typed answer + captchaId to the parent via controlled props
 * and an imperative ref (for refreshing/resetting from outside, e.g. after a
 * failed login attempt).
 */
const Captcha = forwardRef(({ answer, onAnswerChange, disabled = false }, ref) => {
    const [captchaId, setCaptchaId] = useState('');
    const [svg, setSvg] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchCaptcha = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await api.get('/captcha/generate');
            const data = response.data?.data;
            if (data?.captchaId && data?.svg) {
                setCaptchaId(data.captchaId);
                setSvg(data.svg);
            } else {
                setError('Failed to load captcha');
            }
        } catch (err) {
            console.error('Captcha fetch error:', err);
            setError('Failed to load captcha');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCaptcha();
    }, [fetchCaptcha]);

    useImperativeHandle(ref, () => ({
        refresh: fetchCaptcha,
        captchaId,
    }));

    return (
        <Box sx={{ mb: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                }}
            >
                <Box
                    onClick={disabled || loading ? undefined : fetchCaptcha}
                    sx={{
                        width: 150,
                        height: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        overflow: 'hidden',
                        cursor: disabled || loading ? 'default' : 'pointer',
                        bgcolor: 'background.paper',
                    }}
                    title="Click to refresh captcha"
                >
                    {loading ? (
                        <CircularProgress size={20} />
                    ) : (
                        <Box
                            sx={{ width: '100%', height: '100%', '& svg': { width: '100%', height: '100%' } }}
                            dangerouslySetInnerHTML={{ __html: svg }}
                        />
                    )}
                </Box>
                <Tooltip title="Refresh captcha">
                    <span>
                        <IconButton onClick={fetchCaptcha} disabled={disabled || loading} size="small">
                            <RefreshIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Box>
            <TextField
                fullWidth
                label="Enter Captcha"
                variant="outlined"
                margin="normal"
                value={answer}
                onChange={(e) => onAnswerChange(e.target.value)}
                disabled={disabled || loading}
                required
                autoComplete="off"
                error={!!error}
                helperText={error}
                sx={{ mt: 0 }}
            />
        </Box>
    );
});

Captcha.displayName = 'Captcha';

export default Captcha;
