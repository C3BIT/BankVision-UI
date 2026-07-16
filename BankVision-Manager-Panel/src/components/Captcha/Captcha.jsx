import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Box, CircularProgress, IconButton, TextField, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PropTypes from 'prop-types';
import { publicGet } from '../../services/apiCaller';
import Toast from '../../utils/toast';

/**
 * Self-hosted CAPTCHA widget.
 *
 * Fetches a fresh captcha (SVG + captchaId) from `GET /captcha/generate` on
 * mount, renders it, and lets the user type the answer. The captcha is
 * single-use and expires after 120s, so callers MUST call `ref.refresh()`
 * after any failed/successful submission that consumed it (the backend
 * invalidates it either way).
 *
 * Controlled like a normal input: `value` / `onChange` hold the user's typed
 * answer, `onCaptchaIdChange` reports the current captchaId to the parent so
 * it can be included in the submit payload.
 */
const Captcha = forwardRef(({ value, onChange, onCaptchaIdChange, disabled, sx }, ref) => {
  const [svg, setSvg] = useState('');
  const [loading, setLoading] = useState(false);
  const captchaIdRef = useRef(null);

  const fetchCaptcha = useCallback(async () => {
    setLoading(true);
    try {
      const response = await publicGet('/captcha/generate');
      const data = response?.data || {};
      captchaIdRef.current = data.captchaId || null;
      setSvg(data.svg || '');
      onCaptchaIdChange?.(data.captchaId || null);
    } catch {
      captchaIdRef.current = null;
      setSvg('');
      onCaptchaIdChange?.(null);
      Toast.error('Failed to load captcha. Click to retry.');
    } finally {
      setLoading(false);
    }
  }, [onCaptchaIdChange]);

  useEffect(() => {
    fetchCaptcha();
    // Fetch once on mount only; refresh() handles subsequent reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = useCallback(() => {
    onChange?.({ target: { name: 'captchaAnswer', value: '' } });
    fetchCaptcha();
  }, [fetchCaptcha, onChange]);

  useImperativeHandle(ref, () => ({
    refresh,
    get captchaId() {
      return captchaIdRef.current;
    },
  }));

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, my: 1, ...sx }}>
      <Tooltip title="Click to refresh">
        <Box
          onClick={refresh}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') refresh();
          }}
          sx={{
            width: 150,
            height: 50,
            borderRadius: 1,
            border: '1px solid #DDE2E5',
            backgroundColor: '#EFF1F94D',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            <Box sx={{ width: '100%', height: '100%', '& svg': { width: '100%', height: '100%' } }} dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </Box>
      </Tooltip>
      <TextField
        name="captchaAnswer"
        label="Enter code"
        value={value}
        onChange={onChange}
        disabled={disabled}
        size="small"
        fullWidth
        autoComplete="off"
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': { borderColor: '#DDE2E5' },
            '&:hover fieldset': { borderColor: '#DDE2E5' },
            backgroundColor: '#EFF1F94D',
          },
        }}
      />
      <Tooltip title="Refresh captcha">
        <span>
          <IconButton onClick={refresh} disabled={loading} size="small" aria-label="Refresh captcha">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
});

Captcha.displayName = 'Captcha';

Captcha.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onCaptchaIdChange: PropTypes.func,
  disabled: PropTypes.bool,
  sx: PropTypes.object,
};

export default Captcha;
