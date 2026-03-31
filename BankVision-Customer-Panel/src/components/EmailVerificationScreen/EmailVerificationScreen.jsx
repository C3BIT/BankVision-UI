import React, { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert } from '@mui/material';
import PropTypes from 'prop-types';
import OtpInput from '../common/OtpInput';
import VerificationSuccess from '../common/VerificationSuccess';

const EmailVerificationScreen = ({
  confirmEmailVerification,
  verificationStatus,
  setVerificationStatus
}) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  const handleEmailVerification = async () => {
    if (otp.length === 6 && email) {
      setIsVerifyingEmail(true);
      try {
        const success = await confirmEmailVerification();
        if (success) {
          setVerificationStatus(prev => ({ ...prev, email: true }));
        } else {
          setEmailError('Verification failed. Please try again.');
        }
      } catch (error) {
        setEmailError('Error during verification: ' + error.message);
      } finally {
        setIsVerifyingEmail(false);
      }
    }
  };

  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      {verificationStatus.email ? (
        <VerificationSuccess type="email" />
      ) : (
        <>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Email Verification
          </Typography>

          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Your Email Address"
              variant="outlined"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: '#fafafa',
                },
              }}
            />
          </Box>

          <Typography variant="body1" sx={{ mb: 3 }}>
            Please enter the 6-digit code sent to your email.
          </Typography>

          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <OtpInput
              length={6}
              onComplete={setOtp}
              inputStyle={{
                width: '40px',
                height: '40px',
                margin: '0 5px',
                border: '1px solid #DDE2E5',
                backgroundColor: '#EFF1F94D',
                borderRadius: '4px',
                textAlign: 'center',
                fontSize: '16px',
              }}
            />
          </Box>

          {emailError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {emailError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              disabled={otp.length !== 6 || !email || isVerifyingEmail}
              onClick={handleEmailVerification}
              sx={{
                minWidth: '160px',
                height: '50px',
                borderRadius: '25px',
              }}
            >
              {isVerifyingEmail ? (
                <>
                  <CircularProgress size={24} color="inherit" sx={{ mr: 1 }} />
                  Verifying...
                </>
              ) : (
                'Confirm'
              )}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

EmailVerificationScreen.propTypes = {
  confirmEmailVerification: PropTypes.func.isRequired,
  verificationStatus: PropTypes.shape({
    phone: PropTypes.bool,
    email: PropTypes.bool
  }).isRequired,
  setVerificationStatus: PropTypes.func.isRequired
};

export default EmailVerificationScreen;