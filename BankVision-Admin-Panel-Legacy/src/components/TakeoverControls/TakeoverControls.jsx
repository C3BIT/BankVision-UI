import { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  TextField,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  Face as FaceIcon,
  CheckCircle as VerifiedIcon,
  Pending as PendingIcon,
  Send as SendIcon,
} from '@mui/icons-material';

const TakeoverControls = ({ socket, customerPhone, onClose }) => {
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [phonePending, setPhonePending] = useState(false);
  const [emailPending, setEmailPending] = useState(false);
  const [facePending, setFacePending] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Listen for verification responses
  useState(() => {
    if (!socket) return;

    const handlePhoneVerified = (data) => {
      setPhoneVerified(true);
      setPhonePending(false);
      setMessage({ type: 'success', text: 'Phone verified successfully!' });
    };

    const handleEmailVerified = (data) => {
      setEmailVerified(true);
      setEmailPending(false);
      setMessage({ type: 'success', text: 'Email verified successfully!' });
    };

    const handleFaceVerified = (data) => {
      if (data.verified) {
        setFaceVerified(true);
        setMessage({ type: 'success', text: `Face verified! Match: ${data.similarity}%` });
      } else {
        setMessage({ type: 'error', text: 'Face verification failed. Please try again.' });
      }
      setFacePending(false);
    };

    socket.on('customer:phone-verified', handlePhoneVerified);
    socket.on('customer:email-verified', handleEmailVerified);
    socket.on('manager:face-verification-result', handleFaceVerified);

    return () => {
      socket.off('customer:phone-verified', handlePhoneVerified);
      socket.off('customer:email-verified', handleEmailVerified);
      socket.off('manager:face-verification-result', handleFaceVerified);
    };
  }, [socket]);

  const handleRequestPhoneOTP = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit('request:phone-verification');
    setPhonePending(true);
    setLoading(false);
    setMessage({ type: 'info', text: 'OTP sent to customer phone' });
  };

  const handleVerifyPhoneOTP = () => {
    if (!socket || !otp) return;
    setLoading(true);
    socket.emit('verify:phone-otp', { otp });
    setLoading(false);
  };

  const handleRequestEmailOTP = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit('request:email-verification', { customerPhone });
    setEmailPending(true);
    setLoading(false);
    setMessage({ type: 'info', text: 'OTP sent to customer email' });
  };

  const handleRequestFaceVerification = () => {
    if (!socket) return;
    setLoading(true);
    socket.emit('manager:request-face-verification', {
      timestamp: Date.now()
    });
    setFacePending(true);
    setLoading(false);
    setMessage({ type: 'info', text: 'Requesting customer to capture face...' });
  };

  const handleCaptureImage = () => {
    if (!socket) return;
    socket.emit('manager:capture-image');
    setMessage({ type: 'info', text: 'Capturing customer image...' });
  };

  const handleVerifyImage = () => {
    if (!socket) return;
    socket.emit('manager:verify-image');
    setMessage({ type: 'info', text: 'Verifying face...' });
  };

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Verification Controls
        <Chip label="Takeover Mode" color="secondary" size="small" />
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Customer: {customerPhone}
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Phone Verification */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhoneIcon fontSize="small" />
          Phone Verification
          {phoneVerified && <VerifiedIcon color="success" fontSize="small" />}
          {phonePending && <PendingIcon color="warning" fontSize="small" />}
        </Typography>

        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} sm={4}>
            <Button
              fullWidth
              variant={phonePending ? "outlined" : "contained"}
              onClick={handleRequestPhoneOTP}
              disabled={phoneVerified || loading}
              size="small"
            >
              {phonePending ? 'OTP Sent' : 'Send OTP'}
            </Button>
          </Grid>
          {phonePending && (
            <>
              <Grid item xs={8} sm={5}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </Grid>
              <Grid item xs={4} sm={3}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={handleVerifyPhoneOTP}
                  disabled={!otp || loading}
                  size="small"
                >
                  Verify
                </Button>
              </Grid>
            </>
          )}
        </Grid>
      </Box>

      {/* Email Verification */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon fontSize="small" />
          Email Verification
          {emailVerified && <VerifiedIcon color="success" fontSize="small" />}
          {emailPending && <PendingIcon color="warning" fontSize="small" />}
        </Typography>

        <Button
          variant={emailPending ? "outlined" : "contained"}
          onClick={handleRequestEmailOTP}
          disabled={emailVerified || loading}
          size="small"
        >
          {emailPending ? 'OTP Sent' : 'Send Email OTP'}
        </Button>
      </Box>

      {/* Face Verification */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <FaceIcon fontSize="small" />
          Face Verification
          {faceVerified && <VerifiedIcon color="success" fontSize="small" />}
          {facePending && <CircularProgress size={16} />}
        </Typography>

        <Grid container spacing={1}>
          <Grid item>
            <Button
              variant="contained"
              onClick={handleRequestFaceVerification}
              disabled={faceVerified || facePending || loading}
              size="small"
            >
              Request Face Capture
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={handleCaptureImage}
              disabled={!facePending || loading}
              size="small"
            >
              Capture
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="success"
              onClick={handleVerifyImage}
              disabled={!facePending || loading}
              size="small"
            >
              Verify
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Verification Status Summary */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          icon={<PhoneIcon />}
          label={phoneVerified ? "Phone Verified" : "Phone Pending"}
          color={phoneVerified ? "success" : "default"}
          size="small"
        />
        <Chip
          icon={<EmailIcon />}
          label={emailVerified ? "Email Verified" : "Email Pending"}
          color={emailVerified ? "success" : "default"}
          size="small"
        />
        <Chip
          icon={<FaceIcon />}
          label={faceVerified ? "Face Verified" : "Face Pending"}
          color={faceVerified ? "success" : "default"}
          size="small"
        />
      </Box>
    </Paper>
  );
};

TakeoverControls.propTypes = {
  socket: PropTypes.object,
  customerPhone: PropTypes.string,
  onClose: PropTypes.func,
};

export default TakeoverControls;
