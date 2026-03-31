import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
} from '@mui/material';
import { Phone, Email, PersonOff } from '@mui/icons-material';
import PropTypes from 'prop-types';
import axios from 'axios';

const PreCallVerification = ({
  open,
  phone,
  onVerified,
  onCancel,
}) => {
  const [verificationStatus, setVerificationStatus] = useState(null); // null, 'checking', 'phone', 'email', 'guest', 'error'
  const [verificationMethod, setVerificationMethod] = useState('phone'); // 'phone' or 'email'
  const [otp, setOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [externalPhone, setExternalPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState(''); // For guest email verification

  const API_URL = import.meta.env.VITE_API_URL || '/api';

  // Check verification status when modal opens
  useEffect(() => {
    if (open && phone) {
      // Pre-fill phone number from portal
      setExternalPhone(phone);
      checkVerificationStatus();
    } else {
      // Reset state when modal closes
      setVerificationStatus(null);
      setOtpSent(false);
      setOtp('');
      setEmailOtp('');
      setError('');
      setExternalPhone('');
      setGuestEmail('');
    }
  }, [open, phone]);

  const checkVerificationStatus = async () => {
    setLoading(true);
    setError('');
    setVerificationStatus('checking');

    try {
      const response = await axios.post(`${API_URL}/customer/check-verification-status`, {
        phone: phone
      });

      const { hasVerifiedPhone, hasVerifiedEmail, verifiedPhone, verifiedEmail } = response.data.data || {};

      if (hasVerifiedPhone) {
        setVerificationStatus('phone');
        setVerificationMethod('phone');
      } else if (hasVerifiedEmail) {
        setVerificationStatus('email');
        setVerificationMethod('email');
      } else {
        setVerificationStatus('guest');
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setError(error.response?.data?.message || 'Unable to check verification status. Please try again.');
      setVerificationStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!externalPhone || externalPhone.length !== 11) {
      setError('Please enter a valid 11-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Send OTP to the phone number provided (this number will be visible to manager, but OTP code won't be)
      const response = await axios.post(`${API_URL}/otp/send-phone`, {
        phone: externalPhone, // Phone number to verify (visible to manager)
      });

      if (response.data.success) {
        setOtpSent(true);
        setError('');
      } else {
        setError(response.data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      setError(error.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOtp = async () => {
    setLoading(true);
    setError('');

    try {
      // First get customer email from phone
      const customerResponse = await axios.post(`${API_URL}/customer/find-phone`, {
        phone: phone
      });

      if (!customerResponse.data?.data || customerResponse.data.data.length === 0) {
        setError('Customer not found');
        setLoading(false);
        return;
      }

      const customerEmail = customerResponse.data.data[0]?.email;
      if (!customerEmail) {
        setError('No email registered for this customer');
        setLoading(false);
        return;
      }

      // Send OTP to registered email
      const response = await axios.post(`${API_URL}/otp/send`, {
        email: customerEmail,
      });

      if (response.data.success) {
        setOtpSent(true);
        setError('');
      } else {
        setError(response.data.message || 'Failed to send email OTP');
      }
    } catch (error) {
      console.error('Error sending email OTP:', error);
      setError(error.response?.data?.message || 'Failed to send email OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify OTP - the phone number is visible to manager, but OTP code is not
      const response = await axios.post(`${API_URL}/otp/verify-phone`, {
        phone: externalPhone, // Verification phone number (visible to manager)
        otp: otp, // OTP code (not visible to manager)
      });

      if (response.data.success) {
        // Pass the verification phone number to parent so manager can see it
        onVerified('phone', externalPhone); // verificationMethod, verificationPhoneOrEmail
      } else {
        setError(response.data.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get customer email from phone
      const customerResponse = await axios.post(`${API_URL}/customer/find-phone`, {
        phone: phone
      });

      if (!customerResponse.data?.data || customerResponse.data.data.length === 0) {
        setError('Customer not found');
        setLoading(false);
        return;
      }

      const customerEmail = customerResponse.data.data[0]?.email;
      if (!customerEmail) {
        setError('No email registered for this customer');
        setLoading(false);
        return;
      }

      // Verify OTP with email
      const response = await axios.post(`${API_URL}/otp/verify-email`, {
        email: customerEmail,
        otp: emailOtp,
      });

      if (response.data.success) {
        // Pass the verification email to parent so manager can see it
        const customerEmail = customerResponse.data.data[0]?.email;
        onVerified('email', customerEmail); // verificationMethod, verificationPhoneOrEmail
      } else {
        setError(response.data.message || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      console.error('Error verifying email OTP:', error);
      setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 3,
        },
      }}
    >
      <DialogContent>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            Pre-Call Verification Required
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please verify your identity before starting the video call
          </Typography>
        </Box>

        {loading && verificationStatus === 'checking' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography sx={{ mt: 2, color: 'text.secondary' }}>
              Checking verification status...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Phone Verification */}
        {verificationStatus === 'phone' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Phone sx={{ color: '#0066FF' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Phone Verification
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              An OTP will be sent to your phone number for verification. The verification code will not be visible to the agent, but your phone number will be visible to verify your identity.
            </Typography>

            {!otpSent ? (
              <>
                <TextField
                  fullWidth
                  label="Phone Number"
                  placeholder="017XXXXXXXX"
                  value={externalPhone}
                  onChange={(e) => {
                    const input = e.target.value.replace(/\D/g, '');
                    if (input.length <= 11) {
                      setExternalPhone(input);
                    }
                  }}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <Typography sx={{ mr: 1, color: '#666' }}>+88</Typography>
                    ),
                  }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSendOtp}
                  disabled={loading || !externalPhone || externalPhone.length !== 11}
                  sx={{ mb: 2 }}
                >
                  {loading ? <CircularProgress size={20} /> : 'Send OTP'}
                </Button>
              </>
            ) : (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  OTP sent to {externalPhone}. Please check and enter the code.
                </Alert>
                <TextField
                  fullWidth
                  label="Enter OTP"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    const input = e.target.value.replace(/\D/g, '');
                    if (input.length <= 6) {
                      setOtp(input);
                    }
                  }}
                  sx={{ mb: 2 }}
                  inputProps={{ maxLength: 6 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleVerifyOtp}
                  disabled={loading || !otp || otp.length !== 6}
                  sx={{ mb: 1 }}
                >
                  {loading ? <CircularProgress size={20} /> : 'Verify OTP'}
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  onClick={() => {
                    setOtpSent(false);
                    setOtp('');
                  }}
                >
                  Change Phone Number
                </Button>
              </>
            )}
          </Box>
        )}

        {/* Email Verification */}
        {verificationStatus === 'email' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Email sx={{ color: '#0066FF' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Email Verification
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              An OTP will be sent to your registered email address for verification.
            </Typography>

            {!otpSent ? (
              <Button
                fullWidth
                variant="contained"
                onClick={handleSendEmailOtp}
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {loading ? <CircularProgress size={20} /> : 'Send OTP to Email'}
              </Button>
            ) : (
              <>
                <Alert severity="success" sx={{ mb: 2 }}>
                  OTP sent to your registered email. Please check and enter the code.
                </Alert>
                <TextField
                  fullWidth
                  label="Enter OTP"
                  placeholder="000000"
                  value={emailOtp}
                  onChange={(e) => {
                    const input = e.target.value.replace(/\D/g, '');
                    if (input.length <= 6) {
                      setEmailOtp(input);
                    }
                  }}
                  sx={{ mb: 2 }}
                  inputProps={{ maxLength: 6 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleVerifyEmailOtp}
                  disabled={loading || !emailOtp || emailOtp.length !== 6}
                  sx={{ mb: 1 }}
                >
                  {loading ? <CircularProgress size={20} /> : 'Verify OTP'}
                </Button>
                <Button
                  fullWidth
                  variant="text"
                  onClick={() => {
                    setOtpSent(false);
                    setEmailOtp('');
                  }}
                >
                  Resend OTP
                </Button>
              </>
            )}
          </Box>
        )}

        {/* No Verified Phone/Email - Must Verify */}
        {verificationStatus === 'guest' && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <PersonOff sx={{ color: '#FF9800' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Verification Required
              </Typography>
            </Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              You do not have a verified phone number or verified email registered with the bank. 
              Please verify either your phone number or email address to proceed.
            </Alert>

            <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
              <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                Choose Verification Method
              </FormLabel>
              <RadioGroup
                value={verificationMethod}
                onChange={(e) => {
                  setVerificationMethod(e.target.value);
      setOtpSent(false);
      setOtp('');
      setEmailOtp('');
      setExternalPhone('');
      setGuestEmail('');
      setError('');
                }}
              >
                <FormControlLabel 
                  value="phone" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Phone sx={{ fontSize: 20 }} />
                      <Typography>Verify via Phone Number</Typography>
                    </Box>
                  } 
                />
                <FormControlLabel 
                  value="email" 
                  control={<Radio />} 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email sx={{ fontSize: 20 }} />
                      <Typography>Verify via Email Address</Typography>
                    </Box>
                  } 
                />
              </RadioGroup>
            </FormControl>

            {/* Phone Verification Option */}
            {verificationMethod === 'phone' && (
              <Box>
                {!otpSent ? (
                  <>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      placeholder="017XXXXXXXX"
                      value={externalPhone}
                      onChange={(e) => {
                        const input = e.target.value.replace(/\D/g, '');
                        if (input.length <= 11) {
                          setExternalPhone(input);
                        }
                      }}
                      sx={{ mb: 2 }}
                      InputProps={{
                        startAdornment: (
                          <Typography sx={{ mr: 1, color: '#666' }}>+88</Typography>
                        ),
                      }}
                    />
                    <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                      This phone number will be visible to the manager to verify your identity. The OTP code will not be visible to the manager.
                    </Alert>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleSendOtp}
                      disabled={loading || !externalPhone || externalPhone.length !== 11}
                      sx={{ mb: 2 }}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Send OTP'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      OTP sent to {externalPhone}. Please check and enter the code.
                    </Alert>
                    <TextField
                      fullWidth
                      label="Enter OTP"
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => {
                        const input = e.target.value.replace(/\D/g, '');
                        if (input.length <= 6) {
                          setOtp(input);
                        }
                      }}
                      sx={{ mb: 2 }}
                      inputProps={{ maxLength: 6 }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleVerifyOtp}
                      disabled={loading || !otp || otp.length !== 6}
                      sx={{ mb: 1 }}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Verify OTP'}
                    </Button>
                    <Button
                      fullWidth
                      variant="text"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp('');
                      }}
                    >
                      Change Phone Number
                    </Button>
                  </>
                )}
              </Box>
            )}

            {/* Email Verification Option */}
            {verificationMethod === 'email' && (
              <Box>
                {!otpSent ? (
                  <>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      placeholder="your.email@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      sx={{ mb: 2 }}
                    />
                    <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
                      This email address will be visible to the manager to verify your identity. The OTP code will not be visible to the manager.
                    </Alert>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={async () => {
                        if (!guestEmail || !guestEmail.includes('@')) {
                          setError('Please enter a valid email address');
                          return;
                        }
                        setLoading(true);
                        setError('');
                        try {
                          const response = await axios.post(`${API_URL}/otp/send`, {
                            email: guestEmail,
                          });
                          if (response.data.success) {
                            setOtpSent(true);
                            setError('');
                          } else {
                            setError(response.data.message || 'Failed to send email OTP');
                          }
                        } catch (error) {
                          console.error('Error sending email OTP:', error);
                          setError(error.response?.data?.message || 'Failed to send email OTP. Please try again.');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || !guestEmail || !guestEmail.includes('@')}
                      sx={{ mb: 2 }}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Send OTP to Email'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      OTP sent to {guestEmail}. Please check and enter the code.
                    </Alert>
                    <TextField
                      fullWidth
                      label="Enter OTP"
                      placeholder="000000"
                      value={emailOtp}
                      onChange={(e) => {
                        const input = e.target.value.replace(/\D/g, '');
                        if (input.length <= 6) {
                          setEmailOtp(input);
                        }
                      }}
                      sx={{ mb: 2 }}
                      inputProps={{ maxLength: 6 }}
                    />
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={async () => {
                        if (!emailOtp || emailOtp.length !== 6) {
                          setError('Please enter a valid 6-digit OTP');
                          return;
                        }
                        setLoading(true);
                        setError('');
                        try {
                          const response = await axios.post(`${API_URL}/otp/verify-email`, {
                            email: guestEmail,
                            otp: emailOtp,
                          });
                          if (response.data.success) {
                            // Pass the verification email to parent so manager can see it
                            onVerified('email', guestEmail); // verificationMethod, verificationPhoneOrEmail
                          } else {
                            setError(response.data.message || 'Invalid OTP. Please try again.');
                          }
                        } catch (error) {
                          console.error('Error verifying email OTP:', error);
                          setError(error.response?.data?.message || 'Invalid OTP. Please try again.');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading || !emailOtp || emailOtp.length !== 6}
                      sx={{ mb: 1 }}
                    >
                      {loading ? <CircularProgress size={20} /> : 'Verify OTP'}
                    </Button>
                    <Button
                      fullWidth
                      variant="text"
                      onClick={() => {
                        setOtpSent(false);
                        setEmailOtp('');
                      }}
                    >
                      Change Email Address
                    </Button>
                  </>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Error State */}
        {verificationStatus === 'error' && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              Unable to check verification status. Please try again.
            </Alert>
            <Button variant="outlined" onClick={checkVerificationStatus}>
              Retry
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #E0E0E0' }}>
          <Button
            fullWidth
            variant="text"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

PreCallVerification.propTypes = {
  open: PropTypes.bool.isRequired,
  phone: PropTypes.string.isRequired,
  onVerified: PropTypes.func.isRequired, // onVerified(verificationMethod, verificationPhoneOrEmail)
  onCancel: PropTypes.func.isRequired,
};

export default PreCallVerification;
