import React, { useState, useEffect } from 'react';
import { Box, Typography, Alert, Button, CircularProgress } from '@mui/material';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { verifyPhoneOtp } from '../../redux/auth/customerSlice';
import OtpInput from '../common/OtpInput';

import VerificationSuccess from '../common/VerificationSuccess';
import LoadingButton from '../common/LoadingButton';

const PhoneVerificationScreen = ({
  customerPhone,
  confirmPhoneVerification,
  verificationStatus,
  setVerificationStatus
}) => {
  const [otp, setOtp] = useState('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [resendDisabled, setResendDisabled] = useState(true);
  const [resendTimer, setResendTimer] = useState(60);
  const [resetOtpInput, setResetOtpInput] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    let timer;
    if (resendDisabled && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setResendDisabled(false);
    }
    return () => clearInterval(timer);
  }, [resendDisabled, resendTimer]);

  const handlePhoneVerification = async () => {
    if (otp.length === 6) {
      setIsVerifyingPhone(true);
      setPhoneError('');
      try {
        const response = await dispatch(verifyPhoneOtp({ phone: customerPhone, otp })).unwrap();
        if (response.isVerified) {
          confirmPhoneVerification();
          setVerificationStatus(prev => ({ ...prev, phone: true }));
        } else {
          setPhoneError('Invalid OTP. Please try again.');
        }
      } catch (error) {
        setPhoneError('Verification failed. Please check your OTP and try again.');
      } finally {
        setIsVerifyingPhone(false);
      }
    }
  };

  const handleResendOtp = () => {
    setResendDisabled(true);
    setResendTimer(60);
    setOtp('');
    setPhoneError('');
    // Toggle reset to clear OTP input component
    setResetOtpInput(prev => !prev);
  };

  return (
    <Box sx={{ padding: 2 }}>
      {verificationStatus.phone ? (
        <VerificationSuccess type="phone" />
      ) : (
        <>
          <Typography variant="h5" sx={{ mb: 3, textAlign: 'center', color: '#272727', fontWeight: '700' }}>
            Phone Verification
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, textAlign: 'center' }}>
            Please enter the 6-digit code sent to your phone number {customerPhone}.
          </Typography>

          <Box sx={{ mb: 4, display: 'flex', justifyContent: 'center' }}>
            <OtpInput
              length={6}
              onComplete={setOtp}
              reset={resetOtpInput}
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

          {phoneError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {phoneError}
            </Alert>
          )}

          <LoadingButton
            variant="contained"
            fullWidth
            onClick={handlePhoneVerification}
            loading={isVerifyingPhone}
            disabled={otp.length !== 6}
            sx={{
              mt: 3,
              background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(90deg, #13A183 0%, #5EBA4F 100%)',
                opacity: 0.9,
              },
              '&.Mui-disabled': {
                background: '#f5f5f5',
                color: '#bdbdbd',
              },
              height: '50px',
              fontWeight: '700'
            }}
          >
            Verify OTP
          </LoadingButton>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#666' }}>
              Didn't receive the code?{' '}
              {resendDisabled ? (
                <Typography component="span" variant="body2" sx={{ color: '#999' }}>
                  Resend in {resendTimer}s
                </Typography>
              ) : (
                <Button
                  variant="text"
                  onClick={handleResendOtp}
                  sx={{ textTransform: 'none', fontWeight: '600', p: 0, minWidth: 'auto' }}
                >
                  Resend OTP
                </Button>
              )}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
};

PhoneVerificationScreen.propTypes = {
  customerPhone: PropTypes.string.isRequired,
  confirmPhoneVerification: PropTypes.func.isRequired,
  verificationStatus: PropTypes.shape({
    phone: PropTypes.bool,
    email: PropTypes.bool
  }).isRequired,
  setVerificationStatus: PropTypes.func.isRequired
};

export default PhoneVerificationScreen;