import { API_URL } from '../../config.js';
import { forwardRef, useState, useEffect, useCallback, useImperativeHandle } from 'react';
import { Box, TextField, IconButton, CircularProgress, Typography } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import PropTypes from 'prop-types';
import { apiClient } from '../../services/apiCaller';
import { colors } from '../../theme/tokens';

// Self-hosted CAPTCHA widget used ahead of OTP-send actions.
// Fetches a single-use, 120s-expiry SVG captcha from the backend, renders it,
// and exposes the typed answer (controlled) plus the current captchaId
// (via onCaptchaIdChange) so the parent can attach both to the OTP-send payload.
// Parents can also call ref.current.refresh() to force a new captcha, e.g.
// after a failed/expired submit so the user isn't retrying a consumed code.
const Captcha = forwardRef(({ value, onChange, onCaptchaIdChange, disabled = false }, ref) => {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCaptcha = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`${API_URL}/captcha/generate`);
      const { captchaId, svg: svgMarkup } = response.data?.data || {};
      setSvg(svgMarkup || '');
      onChange('');
      onCaptchaIdChange?.(captchaId || '');
    } catch (err) {
      console.error('Error fetching captcha:', err);
      setSvg('');
      onCaptchaIdChange?.('');
      setError('Failed to load captcha. Tap to retry.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  useImperativeHandle(ref, () => ({
    refresh: fetchCaptcha,
  }), [fetchCaptcha]);

  return (
    <Box sx={{ mb: { xs: 1, sm: 2 } }}>
      <Typography
        sx={{
          fontSize: { xs: '0.8rem', sm: '0.875rem' },
          fontWeight: 500,
          color: colors.textSecondary,
          mb: { xs: 0.5, sm: 1 },
        }}
      >
        Enter the code shown below
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 1, sm: 1.5 } }}>
        <Box
          onClick={!loading ? fetchCaptcha : undefined}
          title="Click to refresh"
          sx={{
            width: { xs: 130, sm: 150 },
            height: { xs: 42, sm: 50 },
            borderRadius: 1,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            flexShrink: 0,
            cursor: loading ? 'default' : 'pointer',
            '& svg': {
              width: '100%',
              height: '100%',
            },
          }}
        >
          {loading ? (
            <CircularProgress size={20} />
          ) : svg ? (
            <Box
              sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <Typography sx={{ fontSize: '0.7rem', color: colors.error, textAlign: 'center', px: 1 }}>
              {error || 'Unavailable'}
            </Typography>
          )}
        </Box>

        <IconButton
          onClick={fetchCaptcha}
          disabled={loading || disabled}
          size="small"
          aria-label="Refresh captcha"
          sx={{
            border: `1px solid ${colors.border}`,
            borderRadius: 1,
          }}
        >
          <Refresh fontSize="small" />
        </IconButton>
      </Box>

      <TextField
        fullWidth
        placeholder="Enter captcha code"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        margin="none"
        variant="outlined"
        inputProps={{ maxLength: 10, autoComplete: 'off' }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: colors.surface,
            fontSize: '1rem',
            '& fieldset': {
              borderColor: colors.border,
            },
            '&:hover fieldset': {
              borderColor: colors.primary,
            },
            '&.Mui-focused fieldset': {
              borderColor: colors.primary,
              borderWidth: 2,
            },
          },
        }}
      />
    </Box>
  );
});

Captcha.displayName = 'Captcha';

Captcha.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onCaptchaIdChange: PropTypes.func,
  disabled: PropTypes.bool,
};

export default Captcha;
